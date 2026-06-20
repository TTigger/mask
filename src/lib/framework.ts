import { join, resolve } from "node:path";

/**
 * Root of the framework repo (where adapters/ recipes/ templates/ live) — the
 * tool, NOT the user's ~/.mask library. This file sits at src/lib/, so the repo
 * root is two levels up.
 *
 * NOTE: resolves against the on-disk source tree (dev via `bun run`). Embedding
 * these assets into the `bun build --compile` single binary is handled in 0.12.
 */
export function frameworkRoot(): string {
  return resolve(import.meta.dir, "..", "..");
}

export function frameworkFile(...parts: string[]): string {
  return join(frameworkRoot(), ...parts);
}

/** Absolute path to the voice recipe the agent follows on the digest. */
export function recipePath(): string {
  return frameworkFile("recipes", "voice", "RECIPE.md");
}

/** Absolute path to the skeleton dir (mask.md / knowledge index). */
export function templatesDir(): string {
  return frameworkFile("templates");
}

export function maskTemplatePath(): string {
  return frameworkFile("templates", "mask.md");
}

export function knowledgeIndexTemplatePath(): string {
  return frameworkFile("templates", "knowledge", "index.md");
}
