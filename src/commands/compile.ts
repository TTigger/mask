import type { Command } from "commander";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { maskFile } from "../lib/paths.ts";
import { toPersonaUnit } from "../lib/compile.ts";
import { resolveAdapter } from "../adapters/index.ts";
import { getMask, upsertMask } from "../lib/registry.ts";

async function compile(slug: string): Promise<void> {
  const src = maskFile(slug);
  if (!existsSync(src)) {
    console.error(`mask compile: no mask at ${src} (distill it first).`);
    process.exitCode = 1;
    return;
  }

  const unit = toPersonaUnit(await readFile(src, "utf8"), slug);
  const adapter = await resolveAdapter();
  const out = await adapter.compile(unit);

  // Reflect the mask in the roster; preserve created/last_used on recompile.
  const existing = await getMask(slug);
  await upsertMask({
    slug,
    name: unit.name,
    source_kind: unit.source_kind ?? existing?.source_kind ?? "unknown",
    description: unit.description,
    created: existing?.created ?? new Date().toISOString(),
    last_used: existing?.last_used ?? null,
  });

  console.log(`mask: compiled ${slug} -> ${out}`);
}

export function registerCompile(program: Command): void {
  program
    .command("compile")
    .argument("<slug>", "mask to compile into the current agent's native format")
    .description("Compile a mask into the current agent's native format")
    .action(compile);
}
