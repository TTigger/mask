import { homedir } from "node:os";
import { join } from "node:path";

/** Library root: MASK_HOME override (tests/CI) else ~/.mask. Read per-call. */
export function libraryRoot(): string {
  return process.env.MASK_HOME ?? join(homedir(), ".mask");
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

export function knowledgeDir(slug: string, root = libraryRoot()): string {
  return join(maskDir(slug, root), "knowledge");
}

/** The mask's own provenance file (id → source url + hash), for re-distillation diffs. */
export function maskSourcesPath(slug: string, root = libraryRoot()): string {
  return join(maskDir(slug, root), "sources.json");
}
