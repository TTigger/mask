import { beforeEach, afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ensureFrameworkAssets } from "../src/lib/framework-sync.ts";

let tmp: string, from: string, to: string;

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "mask-sync-"));
  from = join(tmp, "pkg");
  to = join(tmp, "home", "_framework");
  mkdirSync(join(from, "recipes", "voice"), { recursive: true });
  mkdirSync(join(from, "templates"), { recursive: true });
  writeFileSync(join(from, "recipes", "voice", "RECIPE.md"), "# recipe v1\n");
  writeFileSync(join(from, "templates", "mask.md"), "# skeleton\n");
});

afterEach(() => rmSync(tmp, { recursive: true, force: true }));

describe("ensureFrameworkAssets", () => {
  test("no-op when from === to (clone mode)", async () => {
    const r = await ensureFrameworkAssets(from, from);
    expect(r.synced).toBe(false);
    expect(r.written).toBe(0);
  });

  test("fresh sync copies recipes + templates and writes the .source marker", async () => {
    const r = await ensureFrameworkAssets(from, to);
    expect(r.synced).toBe(true);
    expect(r.written).toBeGreaterThan(0);
    expect(readFileSync(join(to, "recipes", "voice", "RECIPE.md"), "utf8")).toBe("# recipe v1\n");
    expect(existsSync(join(to, "templates", "mask.md"))).toBe(true);
    expect(readFileSync(join(to, ".source"), "utf8")).toMatch(/^mask-cli /);
  });

  test("second run is a byte-compare no-op (written = 0)", async () => {
    await ensureFrameworkAssets(from, to);
    const r = await ensureFrameworkAssets(from, to);
    expect(r.synced).toBe(true);
    expect(r.written).toBe(0);
  });

  test("a changed source file is re-copied (upgrade refresh)", async () => {
    await ensureFrameworkAssets(from, to);
    writeFileSync(join(from, "recipes", "voice", "RECIPE.md"), "# recipe v2\n");
    const r = await ensureFrameworkAssets(from, to);
    expect(r.written).toBe(1);
    expect(readFileSync(join(to, "recipes", "voice", "RECIPE.md"), "utf8")).toBe("# recipe v2\n");
  });

  test("nothing to sync (no recipes/ or templates/ at from) writes nothing", async () => {
    const bare = join(tmp, "bare");
    mkdirSync(bare, { recursive: true });
    const r = await ensureFrameworkAssets(bare, to);
    expect(r.synced).toBe(false);
    expect(r.written).toBe(0);
    expect(existsSync(to)).toBe(false);
  });
});
