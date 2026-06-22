import type { Sample } from "./digest.ts";
import { runCapture } from "./proc.ts";

/**
 * Scale mode (Phase 3.1) — the opt-in exception to "the CLI calls no LLM". For a
 * corpus too large to fit one context even after reduce, the CLI maps over
 * context-sized chunks by shelling out to the *user's own* agent CLI (claude -p
 * / gemini -p / codex exec — borrowed compute, no API key here), each chunk
 * yielding a partial extraction; the in-session agent then reduces the partials
 * into the mask. Chunking and orchestration are deterministic; only the per-
 * chunk extraction is delegated, behind an injectable runner so tests stay
 * offline.
 */

const DEFAULT_CHUNK_CHARS = 40_000;

/** Greedily pack samples into chunks under `maxChars`; an oversized sample stands alone. */
export function chunkSamples(samples: Sample[], maxChars = DEFAULT_CHUNK_CHARS): Sample[][] {
  const chunks: Sample[][] = [];
  let current: Sample[] = [];
  let total = 0;
  for (const s of samples) {
    if (current.length > 0 && total + s.text.length > maxChars) {
      chunks.push(current);
      current = [];
      total = 0;
    }
    current.push(s);
    total += s.text.length;
  }
  if (current.length) chunks.push(current);
  return chunks;
}

/** Runs an extraction prompt through a headless agent and returns its output. */
export type AgentRunner = (prompt: string) => Promise<string>;

/** argv prefixes for the supported headless agent CLIs. */
export const RUNNER_ARGV: Record<string, string[]> = {
  claude: ["claude", "-p"],
  gemini: ["gemini", "-p"],
  codex: ["codex", "exec"],
};

/**
 * Default headless runner for the library's configured agent. AGENTS.md-family
 * agents have no single headless CLI of their own (any of them works), so they
 * default to `claude`; users can override with `--runner gemini|codex`.
 */
export function runnerForAgent(agent: string): string {
  if (agent === "claude-code") return "claude";
  return "claude";
}

export function defaultRunner(name: string): AgentRunner {
  const argv = RUNNER_ARGV[name];
  if (!argv) throw new Error(`unknown runner "${name}" (one of: ${Object.keys(RUNNER_ARGV).join(", ")})`);
  return (prompt: string) => runCapture([...argv, prompt]);
}

/** The extraction prompt for one chunk — recipe-aligned and evidence-bound. */
export function buildMapPrompt(chunk: Sample[], index: number, total: number): string {
  const body = chunk
    .map((s) => `[${s.id}]${s.src_ref.title ? ` (${s.src_ref.title})` : ""}\n${s.text}`)
    .join("\n\n---\n\n");
  return [
    `You are extracting one shard (${index + 1}/${total}) of a larger corpus for a mask.`,
    `From the samples below, extract observable voice/style features and substantive`,
    `takes/claims, each followed by the evidence id(s) in [src:ID] form. Be concise and`,
    `evidence-bound — do not invent anything not present. Output Markdown only.`,
    ``,
    body,
  ].join("\n");
}

/** Map each chunk through the runner (sequentially), returning per-chunk partials. */
export async function runMap(
  chunks: Sample[][],
  runner: AgentRunner,
  onProgress?: (done: number, total: number) => void,
): Promise<string[]> {
  const partials: string[] = [];
  for (let i = 0; i < chunks.length; i++) {
    partials.push(await runner(buildMapPrompt(chunks[i]!, i, chunks.length)));
    onProgress?.(i + 1, chunks.length);
  }
  return partials;
}
