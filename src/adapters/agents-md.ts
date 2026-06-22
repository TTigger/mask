import { join } from "node:path";
import { managedFileAdapter } from "./managed-file.ts";
import { AGENTS_MD_ORCHESTRATOR, ACTIVE_BLOCK_HBS } from "../lib/assets.ts";

/**
 * The project AGENTS.md the agent reads. Resolution: MASK_AGENTS_MD (set by
 * `init --out <dir>`, and by tests/CI) → the current directory's AGENTS.md.
 * It's a project-level file, so it lands wherever the command is run unless
 * `--out` redirects it.
 */
export function agentsMdTarget(): string {
  return process.env.MASK_AGENTS_MD ?? join(process.cwd(), "AGENTS.md");
}

export const agentsMdAdapter = managedFileAdapter({
  id: "agents-md",
  target: agentsMdTarget,
  orchestratorAsset: AGENTS_MD_ORCHESTRATOR,
  activeAsset: ACTIVE_BLOCK_HBS,
});
