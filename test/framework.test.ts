import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  frameworkRoot,
  effectiveAssetsRoot,
  effectiveAssetsRootFrom,
  recipePath,
  examplesDir,
} from "../src/lib/framework.ts";

let tmp: string;
const saved = { MASK_FRAMEWORK: process.env.MASK_FRAMEWORK, MASK_HOME: process.env.MASK_HOME };

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "mask-fw-"));
  delete process.env.MASK_FRAMEWORK;
  process.env.MASK_HOME = join(tmp, "home");
});

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true });
  if (saved.MASK_FRAMEWORK === undefined) delete process.env.MASK_FRAMEWORK;
  else process.env.MASK_FRAMEWORK = saved.MASK_FRAMEWORK;
  if (saved.MASK_HOME === undefined) delete process.env.MASK_HOME;
  else process.env.MASK_HOME = saved.MASK_HOME;
});

describe("frameworkRoot", () => {
  test("walks up to the repo root (this checkout ships recipes/voice/RECIPE.md)", () => {
    expect(frameworkRoot()).toBe(resolve(import.meta.dir, ".."));
  });

  test("MASK_FRAMEWORK overrides, resolved", () => {
    process.env.MASK_FRAMEWORK = tmp;
    expect(frameworkRoot()).toBe(resolve(tmp));
  });
});

describe("effectiveAssetsRootFrom", () => {
  test("a checkout (.git present) is used in place", () => {
    mkdirSync(join(tmp, "repo", ".git"), { recursive: true });
    expect(effectiveAssetsRootFrom(join(tmp, "repo"))).toBe(join(tmp, "repo"));
  });

  test("a package (no .git) redirects to <library>/_framework", () => {
    mkdirSync(join(tmp, "pkg"), { recursive: true });
    expect(effectiveAssetsRootFrom(join(tmp, "pkg"))).toBe(join(tmp, "home", "_framework"));
  });
});

describe("path getters", () => {
  test("recipePath follows the effective root; in this checkout that's the repo", () => {
    expect(recipePath()).toBe(join(resolve(import.meta.dir, ".."), "recipes", "voice", "RECIPE.md"));
  });

  test("examplesDir always reads from the framework (package) root", () => {
    expect(examplesDir()).toBe(join(resolve(import.meta.dir, ".."), "examples"));
  });

  test("MASK_FRAMEWORK forces both roots", () => {
    process.env.MASK_FRAMEWORK = tmp;
    expect(effectiveAssetsRoot()).toBe(resolve(tmp));
    expect(recipePath()).toBe(join(resolve(tmp), "recipes", "voice", "RECIPE.md"));
  });
});
