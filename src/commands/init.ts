import type { Command } from "commander";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import { simpleGit } from "simple-git";

/** Library root: MASK_HOME override (tests/CI) else ~/.mask. */
function libraryRoot(): string {
  return process.env.MASK_HOME ?? join(homedir(), ".mask");
}

/** Detect the user's agent. v1 supports Claude Code only; more added later. */
function detectAgent(): string {
  return "claude-code";
}

async function init(): Promise<void> {
  const root = libraryRoot();
  const registryPath = join(root, "_registry.json");

  if (existsSync(registryPath)) {
    console.log(`mask: library already initialized at ${root}`);
    return;
  }

  await mkdir(root, { recursive: true });

  const config = { agent: detectAgent(), version: 1 };
  await writeFile(join(root, "config.json"), JSON.stringify(config, null, 2) + "\n");
  await writeFile(registryPath, JSON.stringify({ masks: [] }, null, 2) + "\n");
  await writeFile(join(root, "_active"), "");

  const git = simpleGit(root);
  if (!existsSync(join(root, ".git"))) {
    await git.init();
  }
  await git.add(".").commit("mask: initialize library");

  console.log(`mask: initialized library at ${root} (agent: ${config.agent})`);
}

export function registerInit(program: Command): void {
  program
    .command("init")
    .description("Initialize the mask library (~/.mask) and install the orchestrator")
    .action(init);
}
