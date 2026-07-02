import { dirname, join, resolve } from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { libraryRoot } from "./paths.ts";

/**
 * Where the framework's shipped assets (recipes/ templates/ examples/) live —
 * the tool, NOT the user's ~/.mask library. Resolved by walking up from this
 * module's own directory to the first ancestor that ships the voice recipe, so
 * it is correct from src/lib/ (dev checkout, two levels deep) AND from the
 * bundled dist/cli.js of the npm package (one level deep). MASK_FRAMEWORK
 * overrides everything (e.g. pointing a standalone compiled binary at a clone).
 */
export function frameworkRoot(): string {
  const env = process.env.MASK_FRAMEWORK;
  if (env) return resolve(env);
  const here = dirname(fileURLToPath(import.meta.url));
  let dir = here;
  while (true) {
    if (existsSync(join(dir, "recipes", "voice", "RECIPE.md"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return resolve(here, "..", ".."); // nothing found; init warns
    dir = parent;
  }
}

/**
 * Where baked recipe/template paths should POINT. A clone (`.git` present) is
 * used in place so `git pull` live-updates recipes; a package install (global
 * node_modules, npx/bunx cache — evictable, version-suffixed) redirects to the
 * stable per-user copy that `mask init` syncs into <library>/_framework.
 */
export function effectiveAssetsRootFrom(root: string): string {
  return existsSync(join(root, ".git")) ? root : join(libraryRoot(), "_framework");
}

export function effectiveAssetsRoot(): string {
  const env = process.env.MASK_FRAMEWORK;
  if (env) return resolve(env);
  return effectiveAssetsRootFrom(frameworkRoot());
}

export function frameworkFile(...parts: string[]): string {
  return join(frameworkRoot(), ...parts);
}

/** Absolute path to the voice recipe the agent follows on the digest. */
export function recipePath(): string {
  return join(effectiveAssetsRoot(), "recipes", "voice", "RECIPE.md");
}

/** Absolute path to the code recipe (conventions-first, for repo sources). */
export function codeRecipePath(): string {
  return join(effectiveAssetsRoot(), "recipes", "code", "RECIPE.md");
}

/** Absolute path to the blend recipe (voice-neutral multi-source synthesis). */
export function blendRecipePath(): string {
  return join(effectiveAssetsRoot(), "recipes", "blend", "RECIPE.md");
}

/** Absolute path to the skeleton dir (mask.md / knowledge index). */
export function templatesDir(): string {
  return join(effectiveAssetsRoot(), "templates");
}

/** Curated example-mask pack — read from the package at `try` time, never baked. */
export function examplesDir(): string {
  return frameworkFile("examples");
}
