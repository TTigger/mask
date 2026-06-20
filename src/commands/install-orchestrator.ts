import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { frameworkFile, recipePath, templatesDir } from "../lib/framework.ts";
import { upsertBlock } from "../lib/managed-block.ts";

/** Where the Claude Code orchestrator block is installed. Default ~/.claude/CLAUDE.md;
 *  MASK_CLAUDE_MD overrides it (tests/CI). */
export function orchestratorTarget(): string {
  return process.env.MASK_CLAUDE_MD ?? join(homedir(), ".claude", "CLAUDE.md");
}

/**
 * Resolve framework-asset placeholders to absolute paths so the agent can find
 * the recipe/skeletons from any working directory. The block lives in the user's
 * global instructions, where a relative path like `recipes/voice/RECIPE.md` is
 * meaningless.
 */
export function renderOrchestrator(template: string): string {
  return template
    .replaceAll("{{recipe}}", recipePath())
    .replaceAll("{{templates}}", templatesDir());
}

/**
 * Upsert the Claude Code orchestrator into the user's global instructions.
 * The source already carries `<!-- mask:orchestrator -->` markers, so installing
 * twice replaces in place — never duplicates. Returns the target path.
 */
export async function installOrchestrator(): Promise<string> {
  const raw = await readFile(frameworkFile("adapters", "claude-code", "orchestrator.md"), "utf8");
  const block = renderOrchestrator(raw);
  const target = orchestratorTarget();

  await mkdir(dirname(target), { recursive: true });
  const existing = existsSync(target) ? await readFile(target, "utf8") : "";
  await writeFile(target, upsertBlock(existing, "orchestrator", block));

  return target;
}
