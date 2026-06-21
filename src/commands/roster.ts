import type { Command } from "commander";
import { existsSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import { maskDir, maskFile, maskSourcesPath, assertSlug } from "../lib/paths.ts";
import { toPersonaUnit } from "../lib/compile.ts";
import { readJson, type SourcesFile } from "../lib/digest.ts";
import { coverageOf, describeCoverage } from "../lib/coverage.ts";
import { resolveAdapter } from "../adapters/index.ts";
import { getActive, setActive, clearActive } from "../lib/active.ts";
import { getMask, listMasks, removeMask, upsertMask } from "../lib/registry.ts";

async function wear(slug: string): Promise<void> {
  assertSlug(slug);
  const entry = await getMask(slug);
  if (!entry) {
    console.error(`mask wear: no mask named "${slug}". Run \`mask list\` to see the roster.`);
    process.exitCode = 1;
    return;
  }
  const src = maskFile(slug);
  if (!existsSync(src)) {
    console.error(`mask wear: ${src} is missing — recompile this mask first.`);
    process.exitCode = 1;
    return;
  }

  // Let the adapter make this persona active (subagents: no-op; AGENTS.md: swap block).
  const adapter = await resolveAdapter();
  await adapter.activate(toPersonaUnit(await readFile(src, "utf8"), slug));

  await upsertMask({ ...entry, last_used: new Date().toISOString() });
  await setActive(slug);
  console.log(`mask: now wearing ${entry.name} (${slug}).`);
}

async function list(): Promise<void> {
  const masks = await listMasks();
  if (masks.length === 0) {
    console.log("No masks yet. Distill one in your agent, then `mask compile <slug>`.");
    return;
  }
  const active = await getActive();
  const slugW = Math.max(...masks.map((m) => m.slug.length));
  const nameW = Math.max(...masks.map((m) => m.name.length));
  for (const m of masks) {
    const mark = m.slug === active ? "●" : " ";
    const used = m.last_used ? `worn ${m.last_used.slice(0, 10)}` : "never worn";
    console.log(`${mark} ${m.slug.padEnd(slugW)}  ${m.name.padEnd(nameW)}  [${m.source_kind}]  ${used}`);
  }
  console.log(`\n${masks.length} mask(s)${active ? `, wearing ${active}` : ", none worn"}`);
}

async function status(): Promise<void> {
  const active = await getActive();
  if (!active) {
    console.log("No mask worn.");
    return;
  }
  const entry = await getMask(active);
  console.log(entry ? `Worn: ${entry.name} (${active}).` : `Worn: ${active}.`);
}

/** Compact active-mask badge for embedding in an agent statusline. */
async function statusline(): Promise<void> {
  const active = await getActive();
  if (!active) return; // print nothing when no mask is worn
  const entry = await getMask(active);
  process.stdout.write(`🎭 ${entry?.name ?? active}`);
}

async function coverage(slug: string): Promise<void> {
  assertSlug(slug);
  const sp = maskSourcesPath(slug);
  if (!existsSync(sp)) {
    console.error(`mask coverage: ${slug} has no sources.json (nothing distilled yet).`);
    process.exitCode = 1;
    return;
  }
  const sources = await readJson<SourcesFile>(sp);
  const entry = await getMask(slug);
  console.log(`${slug}${entry ? ` — ${entry.name}` : ""}`);
  for (const line of describeCoverage(coverageOf(sources))) console.log(`  ${line}`);
}

async function unwear(): Promise<void> {
  const active = await getActive();
  if (!active) {
    console.log("No mask worn.");
    return;
  }
  await (await resolveAdapter()).deactivate();
  await clearActive();
  console.log(`mask: unwore ${active}.`);
}

async function remove(slug: string): Promise<void> {
  assertSlug(slug);
  const entry = await getMask(slug);
  if (!entry) {
    console.error(`mask remove: no mask named "${slug}".`);
    process.exitCode = 1;
    return;
  }
  const adapter = await resolveAdapter();
  if ((await getActive()) === slug) {
    await adapter.deactivate();
    await clearActive();
  }

  // Strip the agent-native artifact (subagent file / active block) — adapter-owned.
  await adapter.removeArtifacts(slug);

  // Remove the mask folder, then drop the roster entry (its commit captures both).
  await rm(maskDir(slug), { recursive: true, force: true });
  await removeMask(slug);

  console.log(`mask: removed ${slug}.`);
}

export function registerWear(program: Command): void {
  program
    .command("wear")
    .argument("<slug>", "mask to wear")
    .description("Set the active mask")
    .action(wear);
}

export function registerList(program: Command): void {
  program.command("list").description("Show the mask roster").action(list);
}

export function registerStatus(program: Command): void {
  program.command("status").description("Show which mask is currently worn").action(status);
}

export function registerStatusline(program: Command): void {
  program
    .command("statusline")
    .description("Print a compact active-mask badge (for an agent statusline)")
    .action(statusline);
}

export function registerCoverage(program: Command): void {
  program
    .command("coverage")
    .argument("<slug>", "mask to report evidence coverage for")
    .description("Report how much evidence a mask stands on (from its provenance)")
    .action(coverage);
}

export function registerUnwear(program: Command): void {
  program.command("unwear").description("Remove the active mask's managed artifacts").action(unwear);
}

export function registerRemove(program: Command): void {
  program
    .command("remove")
    .argument("<slug>", "mask to remove from the library")
    .description("Remove a mask from the library")
    .action(remove);
}
