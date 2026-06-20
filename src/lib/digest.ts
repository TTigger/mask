import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { libraryRoot } from "./paths.ts";

/**
 * Staging + digest contract (SPEC §6). Ingest and reduce write intermediate
 * artifacts into a per-distillation work dir under the library; the agent reads
 * the digest from there. The `id` on each sample is the stable citation anchor
 * that threads source → reduce → knowledge [src:id] → sources.json.
 */

export interface SourceRef {
  url: string;
  title?: string;
}

/** A unit of raw material with a stable citation id. */
export interface Sample {
  id: string;
  src_ref: SourceRef;
  text: string;
}

/** ingest output. */
export interface SamplesFile {
  source_kind: string;
  samples: Sample[];
}

/** reduce output: a compact, context-sized set of samples (same id/src_ref/text). */
export interface Digest {
  meta: DigestMeta;
  samples: Sample[];
}

export interface DigestMeta {
  source_kind: string;
  n_input: number;
  n_kept: number;
  dropped: number;
  max_chars: number;
  notes: string[];
}

/** Provenance for one kept sample: resolves a `[src:id]` citation to its origin. */
export interface SourceRecord {
  id: string;
  url: string;
  title?: string;
  /** sha256 of the *original* (pre-truncation) sample text, for integrity. */
  hash: string;
  /** Original character length (the digest may carry a truncated copy). */
  chars: number;
  /** Whether reduce capped this sample's text in the digest. */
  truncated: boolean;
}

/** reduce output: the id→origin map that closes the citation chain (SPEC §4). */
export interface SourcesFile {
  source_kind: string;
  sampling: { max_chars: number };
  sources: SourceRecord[];
}

// --- reduce ---

export interface ReduceOptions {
  /** Total character budget for the whole digest (must fit the agent's context). */
  maxChars?: number;
  /** Per-sample cap so one long post can't dominate the budget. */
  perSampleCap?: number;
}

const DEFAULT_MAX_CHARS = 60_000;
const DEFAULT_PER_SAMPLE_CAP = 8_000;

function normalizeForDedup(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Truncate to `cap`, preferring a word boundary in the last 40%; marks the cut. */
function truncateAtWord(text: string, cap: number): string {
  if (text.length <= cap) return text;
  const slice = text.slice(0, cap);
  const lastSpace = slice.lastIndexOf(" ");
  const body = lastSpace > cap * 0.6 ? slice.slice(0, lastSpace) : slice;
  return body.trimEnd() + " …";
}

/**
 * Deterministically shrink raw samples into a context-sized digest (SPEC §6):
 * dedup (exact, normalized) → per-sample cap (keep the salient lede) → fill the
 * char budget in input order (recency = "most-recent N"). Sample ids are left
 * stable, so dropped samples leave gaps the citation chain can still resolve.
 */
export function reduceSamples(input: SamplesFile, opts: ReduceOptions = {}): Digest {
  const maxChars = opts.maxChars ?? DEFAULT_MAX_CHARS;
  const perSampleCap = opts.perSampleCap ?? DEFAULT_PER_SAMPLE_CAP;
  const nInput = input.samples.length;

  // 1. dedup — drop exact repeats after whitespace/case normalization, keep first.
  const seen = new Set<string>();
  let duplicates = 0;
  const deduped = input.samples.filter((s) => {
    const key = normalizeForDedup(s.text);
    if (seen.has(key)) {
      duplicates++;
      return false;
    }
    seen.add(key);
    return true;
  });

  // 2. per-sample cap — long posts keep only their lede (where voice lives).
  let truncated = 0;
  const capped = deduped.map((s) => {
    if (s.text.length <= perSampleCap) return s;
    truncated++;
    return { ...s, text: truncateAtWord(s.text, perSampleCap) };
  });

  // 3. budget fill in input order; always keep at least one sample.
  const kept: Sample[] = [];
  let total = 0;
  for (const s of capped) {
    if (kept.length > 0 && total + s.text.length > maxChars) break;
    kept.push(s);
    total += s.text.length;
  }

  const dropped = nInput - kept.length;
  const notes: string[] = [];
  if (duplicates) notes.push(`dropped ${duplicates} duplicate sample(s)`);
  if (truncated) notes.push(`truncated ${truncated} long sample(s) to ${perSampleCap} chars`);
  if (kept.length < deduped.length) {
    notes.push(`kept ${kept.length}/${nInput} samples within ${maxChars}-char budget (recency-ordered)`);
  }
  if (kept.length <= 2) notes.push("thin digest — declare voice limits during extraction");

  return {
    meta: { source_kind: input.source_kind, n_input: nInput, n_kept: kept.length, dropped, max_chars: maxChars, notes },
    samples: kept,
  };
}

function sha256(text: string): string {
  return "sha256:" + createHash("sha256").update(text, "utf8").digest("hex");
}

/**
 * Build the provenance map for a digest (SPEC §3.2 / §4). Each kept sample id
 * resolves to its original URL, a hash of the *full* source text, and whether
 * reduce truncated it — closing the source→digest→knowledge→origin chain. Hashes
 * come from `input` (the pre-truncation samples), so they verify the real source.
 */
export function buildSources(input: SamplesFile, digest: Digest): SourcesFile {
  const original = new Map(input.samples.map((s) => [s.id, s]));
  const sources: SourceRecord[] = digest.samples.map((kept) => {
    const src = original.get(kept.id) ?? kept;
    return {
      id: kept.id,
      url: src.src_ref.url,
      title: src.src_ref.title,
      hash: sha256(src.text),
      chars: src.text.length,
      truncated: kept.text.length < src.text.length,
    };
  });
  return { source_kind: digest.meta.source_kind, sampling: { max_chars: digest.meta.max_chars }, sources };
}

// --- staging paths ---

/** Work area for in-progress distillations; gitignored from the mask library. */
export function workRoot(root = libraryRoot()): string {
  return join(root, ".work");
}

export function workDir(key: string, root = libraryRoot()): string {
  return join(workRoot(root), key);
}

export function samplesPath(dir: string): string {
  return join(dir, "samples.json");
}

export function digestPath(dir: string): string {
  return join(dir, "digest.json");
}

export function sourcesPath(dir: string): string {
  return join(dir, "sources.json");
}

// --- io ---

export async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, "utf8")) as T;
}

export async function writeJson(path: string, value: unknown): Promise<void> {
  await writeFile(path, JSON.stringify(value, null, 2) + "\n");
}

/** Ensure the library gitignores the ephemeral work area (idempotent). */
export async function ensureWorkIgnored(root = libraryRoot()): Promise<void> {
  const gitignore = join(root, ".gitignore");
  const line = ".work/";
  const existing = existsSync(gitignore) ? await readFile(gitignore, "utf8") : "";
  if (existing.split(/\r?\n/).includes(line)) return;
  await writeFile(gitignore, (existing ? existing.replace(/\s*$/, "") + "\n" : "") + line + "\n");
}

/** Prepare a fresh staging dir under the library and return its path. */
export async function prepareWorkDir(key: string, root = libraryRoot()): Promise<string> {
  await ensureWorkIgnored(root);
  const dir = workDir(key, root);
  await mkdir(dir, { recursive: true });
  return dir;
}

/** A filesystem-safe key derived from a name or URL host. */
export function stagingKey(input: string): string {
  let base = input;
  try {
    base = new URL(input).hostname.replace(/^www\./, "");
  } catch {
    // not a URL — use as-is
  }
  return (
    base
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "source"
  );
}
