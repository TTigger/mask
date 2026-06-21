import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import type { Adapter } from "./types.ts";
import { renderOrchestrator } from "./common.ts";
import { renderSubagent } from "../lib/compile.ts";
import { ORCHESTRATOR_MD, SUBAGENT_HBS, SUBAGENT_CODE_HBS, SUBAGENT_BLEND_HBS } from "../lib/assets.ts";
import { upsertBlock } from "../lib/managed-block.ts";

/** Global Claude Code instructions file. MASK_CLAUDE_MD overrides (tests/CI). */
export function orchestratorTarget(): string {
  return process.env.MASK_CLAUDE_MD ?? join(homedir(), ".claude", "CLAUDE.md");
}

/** Where compiled Claude Code subagents land. MASK_AGENTS_DIR overrides (tests). */
export function agentsDir(): string {
  return process.env.MASK_AGENTS_DIR ?? join(homedir(), ".claude", "agents");
}

export function agentFile(slug: string): string {
  return join(agentsDir(), `${slug}.md`);
}

/**
 * Claude Code: personas are subagents that coexist, so a mask is a standalone
 * file under ~/.claude/agents/ and "wearing" is just the sticky `_active` slug
 * (handled by the command layer) — nothing inline to swap.
 */
export const claudeCodeAdapter: Adapter = {
  id: "claude-code",

  async installOrchestrator() {
    const block = renderOrchestrator(ORCHESTRATOR_MD);
    const target = orchestratorTarget();
    await mkdir(dirname(target), { recursive: true });
    const existing = existsSync(target) ? await readFile(target, "utf8") : "";
    await writeFile(target, upsertBlock(existing, "orchestrator", block));
    return target;
  },

  async compile(unit) {
    const out = agentFile(unit.slug);
    await mkdir(dirname(out), { recursive: true });
    const template =
      unit.type === "code" ? SUBAGENT_CODE_HBS : unit.type === "blend" ? SUBAGENT_BLEND_HBS : SUBAGENT_HBS;
    await writeFile(out, renderSubagent(template, unit));
    return out;
  },

  async activate() {
    /* subagents coexist; stickiness is the `_active` slug */
  },

  async deactivate() {
    /* nothing inline to clear */
  },

  async removeArtifacts(slug) {
    const f = agentFile(slug);
    if (existsSync(f)) await rm(f);
  },
};
