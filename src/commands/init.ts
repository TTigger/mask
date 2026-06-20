import type { Command } from "commander";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { libraryRoot, configPath, registryPath, activePath } from "../lib/paths.ts";
import { commitAll } from "../lib/git.ts";
import { resolveAdapter, getAdapter, SUPPORTED_AGENTS } from "../adapters/index.ts";

/** Detect the user's agent. Defaults to Claude Code; override with --agent. */
function detectAgent(): string {
  return "claude-code";
}

interface InitOpts {
  agent?: string;
}

async function init(opts: InitOpts): Promise<void> {
  const root = libraryRoot();

  if (opts.agent) getAdapter(opts.agent); // validate early (throws on unknown)

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

  // Always (re-)ensure the orchestrator block is present and current.
  const adapter = await resolveAdapter(root);
  const target = await adapter.installOrchestrator();
  console.log(`mask: installed orchestrator into ${target}`);
}

export function registerInit(program: Command): void {
  program
    .command("init")
    .option("--agent <id>", `target agent (${SUPPORTED_AGENTS.join(" | ")})`)
    .description("Initialize the mask library (~/.mask) and install the orchestrator")
    .action(init);
}
