import type { Adapter } from "./types.ts";
import { claudeCodeAdapter } from "./claude-code.ts";
import { agentsMdAdapter } from "./agents-md.ts";
import { geminiAdapter } from "./gemini.ts";
import { cursorAdapter } from "./cursor.ts";
import { readConfig } from "../lib/config.ts";
import { libraryRoot } from "../lib/paths.ts";

const ADAPTERS: Record<string, Adapter> = {
  [claudeCodeAdapter.id]: claudeCodeAdapter,
  [agentsMdAdapter.id]: agentsMdAdapter,
  [geminiAdapter.id]: geminiAdapter,
  [cursorAdapter.id]: cursorAdapter,
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
