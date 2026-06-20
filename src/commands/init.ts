import type { Command } from "commander";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { libraryRoot, configPath, registryPath, activePath } from "../lib/paths.ts";
import { commitAll } from "../lib/git.ts";
import { installOrchestrator } from "./install-orchestrator.ts";

/** Detect the user's agent. v1 supports Claude Code only; more added later. */
function detectAgent(): string {
  return "claude-code";
}

async function init(): Promise<void> {
  const root = libraryRoot();

  if (existsSync(registryPath(root))) {
    console.log(`mask: library already initialized at ${root}`);
  } else {
    await mkdir(root, { recursive: true });

    const config = { agent: detectAgent(), version: 1 };
    await writeFile(configPath(root), JSON.stringify(config, null, 2) + "\n");
    await writeFile(registryPath(root), JSON.stringify({ masks: [] }, null, 2) + "\n");
    await writeFile(activePath(root), "");

    await commitAll(root, "mask: initialize library");
    console.log(`mask: initialized library at ${root} (agent: ${config.agent})`);
  }

  // Always (re-)ensure the orchestrator block is present and current.
  const target = await installOrchestrator();
  console.log(`mask: installed orchestrator into ${target}`);
}

export function registerInit(program: Command): void {
  program
    .command("init")
    .description("Initialize the mask library (~/.mask) and install the orchestrator")
    .action(init);
}
