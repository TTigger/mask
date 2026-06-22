import type { Command } from "commander";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import { libraryRoot, configPath, registryPath, activePath } from "../lib/paths.ts";
import { commitAll } from "../lib/git.ts";
import { recipePath, frameworkRoot } from "../lib/framework.ts";
import { readConfig } from "../lib/config.ts";
import { getAdapter, SUPPORTED_AGENTS } from "../adapters/index.ts";

/** Detect the user's agent. Defaults to Claude Code; override with --agent. */
function detectAgent(): string {
  return "claude-code";
}

interface InitOpts {
  agent?: string;
  out?: string;
}

/** Is `target` inside (or equal to) the mask framework repo itself? */
function insideFramework(target: string): boolean {
  const dir = resolve(dirname(target));
  const root = resolve(frameworkRoot());
  return dir === root || dir.startsWith(root + sep);
}

async function init(opts: InitOpts): Promise<void> {
  const root = libraryRoot();

  if (opts.agent) getAdapter(opts.agent); // validate early (throws on unknown)

  // --out picks the directory the AGENTS.md orchestrator is written into (it is
  // a project-level file). Wired via the env override the adapter already reads.
  if (opts.out) process.env.MASK_AGENTS_MD = join(resolve(opts.out), "AGENTS.md");

  if (existsSync(registryPath(root))) {
    console.log(`mask: library already initialized at ${root}`);
  } else {
    await mkdir(root, { recursive: true });

    const config = { agent: opts.agent ?? detectAgent(), version: 1 };
    await writeFile(configPath(root), JSON.stringify(config, null, 2) + "\n");
    await writeFile(registryPath(root), JSON.stringify({ masks: [] }, null, 2) + "\n");
    await writeFile(activePath(root), "");

    await commitAll(root, "mask: initialize library");
    console.log(`mask: initialized library at ${root} (agent: ${config.agent})`);
  }

  // Resolve the adapter from config, guarding against a stale/unknown agent
  // (e.g. a config written by an older version) rather than hard-throwing.
  let agent = (await readConfig(root)).agent;
  if (!SUPPORTED_AGENTS.includes(agent)) {
    console.warn(`mask: ⚠ config agent "${agent}" is not supported; falling back to ${detectAgent()}.`);
    agent = detectAgent();
  }
  const adapter = getAdapter(agent);
  const target = await adapter.installOrchestrator();
  console.log(`mask: installed orchestrator into ${target}`);

  // Footgun guard: the AGENTS.md orchestrator is project-level, written to the
  // current directory by default. If that lands inside the mask framework repo
  // itself (e.g. running `bun run dev init` from the clone), it's almost never
  // what the user wants — point them at their own project.
  if (insideFramework(target)) {
    console.warn(
      `mask: ⚠ installed into the mask framework repo itself (${target}).\n` +
        `  That orchestrator only applies to agents run inside this folder. To install it into\n` +
        `  your own project, run \`mask init --agent ${agent} --out <your-project-dir>\`.`,
    );
  }

  // The orchestrator embeds absolute recipe/template paths; warn loudly if they
  // don't resolve (e.g. the standalone compiled binary without MASK_FRAMEWORK).
  if (!existsSync(recipePath())) {
    console.warn(
      `mask: ⚠ framework assets not found under ${frameworkRoot()} — the orchestrator points at a recipe path that doesn't exist.\n` +
        `  Running the compiled binary? Set MASK_FRAMEWORK to your cloned mask repo and re-run \`mask init\`.`,
    );
  }
}

export function registerInit(program: Command): void {
  program
    .command("init")
    .option("--agent <id>", `target agent (${SUPPORTED_AGENTS.join(" | ")})`)
    .option("--out <dir>", "where to install a project-level AGENTS.md (agents-md only; default: current dir)")
    .description("Initialize the mask library (~/.mask) and install the orchestrator")
    .action(init);
}
