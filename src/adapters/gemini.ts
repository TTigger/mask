import { join } from "node:path";
import { managedFileAdapter } from "./managed-file.ts";
import { AGENTS_MD_ORCHESTRATOR, ACTIVE_BLOCK_HBS } from "../lib/assets.ts";

/** The project GEMINI.md the Gemini CLI reads. MASK_GEMINI_MD overrides (tests/CI). */
export function geminiTarget(): string {
  return process.env.MASK_GEMINI_MD ?? join(process.cwd(), "GEMINI.md");
}

// Gemini's GEMINI.md is the same single-active model as AGENTS.md, so it reuses
// the single-active orchestrator + active-block assets.
export const geminiAdapter = managedFileAdapter({
  id: "gemini",
  target: geminiTarget,
  orchestratorAsset: AGENTS_MD_ORCHESTRATOR,
  activeAsset: ACTIVE_BLOCK_HBS,
});
