import { homedir } from "node:os";
import { join } from "node:path";

/** Library root: MASK_HOME override (tests/CI) else ~/.mask. Read per-call. */
export function libraryRoot(): string {
  return process.env.MASK_HOME ?? join(homedir(), ".mask");
}

/** A slug must be a simple lowercase token — no `.`, `/`, or `..` path traversal. */
const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

export function isValidSlug(slug: string): boolean {
  return SLUG_RE.test(slug);
}

/** Guard before a slug is ever joined into a filesystem path (deletes, writes). */
export function assertSlug(slug: string): void {
  if (!isValidSlug(slug)) {
    throw new Error(`invalid mask name "${slug}" — use lowercase letters, digits and hyphens only`);
  }
}

export function configPath(root = libraryRoot()): string {
  return join(root, "config.json");
}

export function registryPath(root = libraryRoot()): string {
  return join(root, "_registry.json");
}

export function activePath(root = libraryRoot()): string {
  return join(root, "_active");
}

export function maskDir(slug: string, root = libraryRoot()): string {
  return join(root, slug);
}

export function maskFile(slug: string, root = libraryRoot()): string {
  return join(maskDir(slug, root), "mask.md");
}

/** The mask's own provenance file (id → source url + hash), for re-distillation diffs. */
export function maskSourcesPath(slug: string, root = libraryRoot()): string {
  return join(maskDir(slug, root), "sources.json");
}
