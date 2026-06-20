import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { Adapter } from "./types.ts";
import { renderOrchestrator } from "./common.ts";
import { renderPersona } from "../lib/compile.ts";
import { AGENTS_MD_ORCHESTRATOR, ACTIVE_BLOCK_HBS } from "../lib/assets.ts";
import { extractBlock, upsertBlock } from "../lib/managed-block.ts";

/** The project AGENTS.md the agent reads. MASK_AGENTS_MD overrides (tests/CI). */
export function agentsMdTarget(): string {
  return process.env.MASK_AGENTS_MD ?? join(process.cwd(), "AGENTS.md");
}

/** The empty "no mask worn" active block shipped in the orchestrator asset. */
function activePlaceholder(): string {
  return extractBlock(AGENTS_MD_ORCHESTRATOR, "active") ?? "<!-- mask:active -->\n<!-- /mask:active -->";
}

async function readTarget(target: string): Promise<string> {
  return existsSync(target) ? await readFile(target, "utf8") : "";
}

/**
 * AGENTS.md: a single-active agent. The persona lives *inline* in AGENTS.md as
 * the `mask:active` managed block, so "wearing" swaps that block; there is no
 * per-mask compiled file. compile is therefore a no-op (the persona is applied
 * on wear). install seeds both the orchestrator and an empty active block.
 */
export const agentsMdAdapter: Adapter = {
  id: "agents-md",

  async installOrchestrator() {
    const target = agentsMdTarget();
    await mkdir(dirname(target), { recursive: true });

    const orchestrator = renderOrchestrator(
      extractBlock(AGENTS_MD_ORCHESTRATOR, "orchestrator") ?? AGENTS_MD_ORCHESTRATOR,
    );
    let content = upsertBlock(await readTarget(target), "orchestrator", orchestrator);
    if (!extractBlock(content, "active")) {
      content = upsertBlock(content, "active", activePlaceholder());
    }
    await writeFile(target, content);
    return target;
  },

  async compile() {
    // Single-active: nothing to render until `wear`.
    return `${agentsMdTarget()} (applied on wear)`;
  },

  async activate(unit) {
    const target = agentsMdTarget();
    await mkdir(dirname(target), { recursive: true });
    const block = renderPersona(ACTIVE_BLOCK_HBS, unit);
    await writeFile(target, upsertBlock(await readTarget(target), "active", block));
  },

  async deactivate() {
    const target = agentsMdTarget();
    if (!existsSync(target)) return;
    await writeFile(target, upsertBlock(await readFile(target, "utf8"), "active", activePlaceholder()));
  },

  async removeArtifacts() {
    // No per-mask artifact; if this mask was worn, `remove` already deactivated it.
  },
};
