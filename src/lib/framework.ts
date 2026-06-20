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
