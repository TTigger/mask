import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { Adapter } from "./types.ts";
import { renderOrchestrator } from "./common.ts";
import { renderPersona } from "../lib/compile.ts";
import { extractBlock, upsertBlock } from "../lib/managed-block.ts";

export interface ManagedFileSpec {
  id: string;
  /** Resolve the single instruction file this agent reads. */
  target: () => string;
  /** Embedded orchestrator asset (carries the `mask:orchestrator` + empty `mask:active` blocks). */
  orchestratorAsset: string;
  /** Embedded active-block template (`mask:active` body with persona slots). */
  activeAsset: string;
  /** Optional file header written once at the top (e.g. Cursor `.mdc` frontmatter). */
  header?: string;
}

/**
 * Single-active agents whose persona lives *inline* in one instruction file
 * (AGENTS.md, GEMINI.md, .cursor/rules/*.mdc) as the `mask:active` managed
 * block. "Wearing" swaps that block; there's no per-mask compiled file, so
 * compile is a no-op. install seeds the orchestrator + an empty active block
 * (and the header, if any).
 */
export function managedFileAdapter(spec: ManagedFileSpec): Adapter {
  const placeholder = () =>
    extractBlock(spec.orchestratorAsset, "active") ?? "<!-- mask:active -->\n<!-- /mask:active -->";

  const read = async (target: string): Promise<string> => {
    if (existsSync(target)) return readFile(target, "utf8");
    return spec.header ? spec.header.trimEnd() + "\n\n" : "";
  };

  return {
    id: spec.id,

    async installOrchestrator() {
      const target = spec.target();
      await mkdir(dirname(target), { recursive: true });
      const orchestrator = renderOrchestrator(
        extractBlock(spec.orchestratorAsset, "orchestrator") ?? spec.orchestratorAsset,
      );
      let content = upsertBlock(await read(target), "orchestrator", orchestrator);
      if (!extractBlock(content, "active")) content = upsertBlock(content, "active", placeholder());
      await writeFile(target, content);
      return target;
    },

    async compile() {
      return `${spec.target()} (applied on wear)`;
    },

    async activate(unit) {
      const target = spec.target();
      await mkdir(dirname(target), { recursive: true });
      const block = renderPersona(spec.activeAsset, unit);
      await writeFile(target, upsertBlock(await read(target), "active", block));
    },

    async deactivate() {
      const target = spec.target();
      if (!existsSync(target)) return;
      await writeFile(target, upsertBlock(await readFile(target, "utf8"), "active", placeholder()));
    },

    async removeArtifacts() {
      // No per-mask artifact; if this mask was worn, `remove` already deactivated it.
    },
  };
}
