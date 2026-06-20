import { join } from "node:path";
import { managedFileAdapter } from "./managed-file.ts";
import { AGENTS_MD_ORCHESTRATOR, ACTIVE_BLOCK_HBS } from "../lib/assets.ts";

/** Cursor project rule file. MASK_CURSOR_MDC overrides (tests/CI). */
export function cursorTarget(): string {
  return process.env.MASK_CURSOR_MDC ?? join(process.cwd(), ".cursor", "rules", "mask.mdc");
}

/** Cursor `.mdc` files need frontmatter; `alwaysApply` keeps the rule on every turn. */
const CURSOR_HEADER = `---
description: mask — persona orchestrator and the active mask
alwaysApply: true
---`;

// Same single-active model as AGENTS.md, wrapped in a Cursor `.mdc` (frontmatter
// header + the orchestrator/active managed blocks).
export const cursorAdapter = managedFileAdapter({
  id: "cursor",
  target: cursorTarget,
  orchestratorAsset: AGENTS_MD_ORCHESTRATOR,
  activeAsset: ACTIVE_BLOCK_HBS,
  header: CURSOR_HEADER,
});
