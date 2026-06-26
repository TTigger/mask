import type { Command } from "commander";
import { existsSync } from "node:fs";
import { cp, readFile } from "node:fs/promises";
import { join } from "node:path";
import { maskDir, maskFile, assertSlug } from "../lib/paths.ts";
import { examplesDir } from "../lib/framework.ts";
import { toPersonaUnit } from "../lib/compile.ts";
import { resolveAdapter } from "../adapters/index.ts";
import { getMask, upsertMask } from "../lib/registry.ts";

/**
 * Copy a curated example mask shipped under the framework's `examples/` into the
 * user's library and compile it, so a newcomer can `wear` a real mask in seconds.
 * Deterministic, zero-LLM: it only copies files and registers the result.
 */
async function tryMask(name: string, opts: { force?: boolean }): Promise<void> {
  assertSlug(name);

  const srcDir = join(examplesDir(), name);
  if (!existsSync(srcDir)) {
    console.error(`mask try: no example named "${name}". See the gallery / examples/ for the roster.`);
    process.exitCode = 1;
    return;
  }

  const destDir = maskDir(name);
  if (existsSync(destDir) && !opts.force) {
    console.error(`mask try: ${name} already exists in your library — pass --force to overwrite.`);
    process.exitCode = 1;
    return;
  }

  // Copy the example verbatim, minus recipe checkpoints.
  await cp(srcDir, destDir, {
    recursive: true,
    force: true,
    filter: (s) => !/(^|[\\/])_work([\\/]|$)/.test(s),
  });

  // Register + compile so it's immediately wearable (preserve created on overwrite).
  const unit = toPersonaUnit(await readFile(maskFile(name), "utf8"), name);
  const adapter = await resolveAdapter();
  await adapter.compile(unit);

  const existing = await getMask(name);
  await upsertMask({
    slug: name,
    name: unit.name,
    source_kind: unit.source_kind ?? "example",
    description: unit.description,
    created: existing?.created ?? new Date().toISOString(),
    last_used: existing?.last_used ?? null,
  });

  console.log(`mask: copied example ${name} -> ${destDir} (compiled, ready to wear).`);
}

export function registerTry(program: Command): void {
  program
    .command("try")
    .argument("<name>", "curated example mask to copy into your library")
    .option("--force", "overwrite if a mask with this name already exists")
    .description("Copy a curated example mask into your library and make it wearable")
    .action(tryMask);
}
