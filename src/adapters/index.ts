import type { Adapter } from "./types.ts";
import { claudeCodeAdapter } from "./claude-code.ts";
import { agentsMdAdapter } from "./agents-md.ts";
import { readConfig } from "../lib/config.ts";
import { libraryRoot } from "../lib/paths.ts";

// Two adapters. `claude-code` = multi-active subagents (global ~/.claude).
// `agents-md` = the universal ./AGENTS.md that Codex/Gemini/Cursor/Windsurf/Zed
// and 30+ other AGENTS.md-aware tools read natively.
const ADAPTERS: Record<string, Adapter> = {
  [claudeCodeAdapter.id]: claudeCodeAdapter,
  [agentsMdAdapter.id]: agentsMdAdapter,
};

export const SUPPORTED_AGENTS = Object.keys(ADAPTERS);

export function getAdapter(id: string): Adapter {
  const adapter = ADAPTERS[id];
  if (!adapter) {
    throw new Error(`unknown agent "${id}" (supported: ${SUPPORTED_AGENTS.join(", ")})`);
  }
  return adapter;
}

/** The adapter this library targets, per config.json. */
export async function resolveAdapter(root = libraryRoot()): Promise<Adapter> {
  return getAdapter((await readConfig(root)).agent);
}

export type { Adapter };
