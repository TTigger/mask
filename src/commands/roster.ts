import type { Command } from "commander";
import { existsSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import { maskDir, maskFile } from "../lib/paths.ts";
import { toPersonaUnit } from "../lib/compile.ts";
import { resolveAdapter } from "../adapters/index.ts";
import { getActive, setActive, clearActive } from "../lib/active.ts";
import { getMask, listMasks, removeMask, upsertMask } from "../lib/registry.ts";

async function wear(slug: string): Promise<void> {
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
  for (const m of masks) {
    const mark = m.slug === active ? "●" : " ";
    const used = m.last_used ? `last worn ${m.last_used.slice(0, 10)}` : "never worn";
    console.log(`${mark} ${m.slug} — ${m.name}  [${m.source_kind}]  ${used}`);
  }
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
