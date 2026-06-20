import type { Command } from "commander";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { maskFile } from "../lib/paths.ts";
import { SUBAGENT_HBS } from "../lib/assets.ts";
import { toPersonaUnit, renderSubagent } from "../lib/compile.ts";
import { getMask, upsertMask } from "../lib/registry.ts";

/** Where compiled Claude Code subagents land. MASK_AGENTS_DIR overrides (tests). */
export function agentsDir(): string {
  return process.env.MASK_AGENTS_DIR ?? join(homedir(), ".claude", "agents");
}

export function agentFile(slug: string): string {
  return join(agentsDir(), `${slug}.md`);
}

async function compile(slug: string): Promise<void> {
  const src = maskFile(slug);
  if (!existsSync(src)) {
    console.error(`mask compile: no mask at ${src} (distill it first).`);
    process.exitCode = 1;
    return;
  }

  const unit = toPersonaUnit(await readFile(src, "utf8"), slug);
  const rendered = renderSubagent(SUBAGENT_HBS, unit);

  const out = agentFile(slug);
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, rendered);

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
