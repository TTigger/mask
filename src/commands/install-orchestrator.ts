import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { frameworkFile } from "../lib/framework.ts";
import { upsertBlock } from "../lib/managed-block.ts";

/** Where the Claude Code orchestrator block is installed. Default ~/.claude/CLAUDE.md;
 *  MASK_CLAUDE_MD overrides it (tests/CI). */
export function orchestratorTarget(): string {
  return process.env.MASK_CLAUDE_MD ?? join(homedir(), ".claude", "CLAUDE.md");
}

/**
 * Upsert the Claude Code orchestrator into the user's global instructions.
 * The source already carries `<!-- mask:orchestrator -->` markers, so installing
 * twice replaces in place — never duplicates. Returns the target path.
 */
export async function installOrchestrator(): Promise<string> {
  const block = await readFile(frameworkFile("adapters", "claude-code", "orchestrator.md"), "utf8");
  const target = orchestratorTarget();

  await mkdir(dirname(target), { recursive: true });
  const existing = existsSync(target) ? await readFile(target, "utf8") : "";
  await writeFile(target, upsertBlock(existing, "orchestrator", block));

  return target;
}
