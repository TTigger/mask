import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { frameworkRoot, effectiveAssetsRoot } from "./framework.ts";
import pkg from "../../package.json" with { type: "json" };

/** The asset dirs whose paths get baked into orchestrators (examples/ never is). */
const SYNC_DIRS = ["recipes", "templates"];

/** Write only when the bytes differ — deterministic, no timestamps. */
async function writeIfDiffers(dest: string, content: Buffer | string): Promise<number> {
  const next = Buffer.from(content);
  if (existsSync(dest) && next.equals(await readFile(dest))) return 0;
  await writeFile(dest, next);
  return 1;
}

async function syncDir(src: string, dest: string): Promise<number> {
  await mkdir(dest, { recursive: true });
  let written = 0;
  const entries = (await readdir(src, { withFileTypes: true })).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  for (const e of entries) {
    const s = join(src, e.name);
    const d = join(dest, e.name);
    if (e.isDirectory()) written += await syncDir(s, d);
    else if (e.isFile()) written += await writeIfDiffers(d, await readFile(s));
  }
  return written;
}

/**
 * Make the baked-path assets exist at the effective root. Clone mode (from ===
 * to) is a no-op — the checkout IS the asset root and `git pull` updates it.
 * Package mode copies recipes/ + templates/ into <library>/_framework so the
 * orchestrator's absolute paths survive npx/bunx cache eviction and package
 * upgrades; re-running `mask init` after an upgrade refreshes the copy.
 */
export async function ensureFrameworkAssets(
  from: string = frameworkRoot(),
  to: string = effectiveAssetsRoot(),
): Promise<{ synced: boolean; written: number; root: string }> {
  if (resolve(from) === resolve(to)) return { synced: false, written: 0, root: to };
  let written = 0;
  for (const dir of SYNC_DIRS) {
    if (!existsSync(join(from, dir))) continue; // broken install → init's recipe warning fires
    written += await syncDir(join(from, dir), join(to, dir));
  }
  await mkdir(to, { recursive: true });
  written += await writeIfDiffers(join(to, ".source"), `mask-cli ${pkg.version}\n`);
  return { synced: true, written, root: to };
}
