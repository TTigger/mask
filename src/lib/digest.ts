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
