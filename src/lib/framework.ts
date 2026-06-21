import { join, resolve } from "node:path";

/**
 * Root of the framework repo (where adapters/ recipes/ templates/ live) — the
 * tool, NOT the user's ~/.mask library. This file sits at src/lib/, so the repo
 * root is two levels up.
 *
 * Resolves against the on-disk source tree (dev/bunx from the cloned repo).
 * The agent reads the recipe/templates from here, so a standalone compiled
 * binary (where `import.meta.dir` is not a real repo path) should set
 * MASK_FRAMEWORK to the checked-out framework repo. The CLI's own runtime
 * assets are embedded instead (see assets.ts), so init/compile don't need this.
 */
export function frameworkRoot(): string {
  return process.env.MASK_FRAMEWORK ?? resolve(import.meta.dir, "..", "..");
}

export function frameworkFile(...parts: string[]): string {
  return join(frameworkRoot(), ...parts);
}

/** Absolute path to the voice recipe the agent follows on the digest. */
export function recipePath(): string {
  return frameworkFile("recipes", "voice", "RECIPE.md");
}

/** Absolute path to the code recipe (conventions-first, for repo sources). */
export function codeRecipePath(): string {
  return frameworkFile("recipes", "code", "RECIPE.md");
}

/** Absolute path to the blend recipe (voice-neutral multi-source synthesis). */
export function blendRecipePath(): string {
  return frameworkFile("recipes", "blend", "RECIPE.md");
}

/** Absolute path to the skeleton dir (mask.md / knowledge index). */
export function templatesDir(): string {
  return frameworkFile("templates");
}
