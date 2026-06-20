import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { libraryRoot, registryPath } from "./paths.ts";
import { commitAll } from "./git.ts";

/** One roster entry (SPEC §7: name / source / description / last-used). */
export interface MaskEntry {
  slug: string;
  name: string;
  source_kind: string;
  description: string;
  created: string;
  last_used: string | null;
}

interface Registry {
  masks: MaskEntry[];
}

export async function readRegistry(root = libraryRoot()): Promise<Registry> {
  const p = registryPath(root);
  if (!existsSync(p)) return { masks: [] };
  return JSON.parse(await readFile(p, "utf8")) as Registry;
}

async function writeRegistry(reg: Registry, root: string, message: string): Promise<void> {
  await writeFile(registryPath(root), JSON.stringify(reg, null, 2) + "\n");
  await commitAll(root, message);
}

export async function listMasks(root = libraryRoot()): Promise<MaskEntry[]> {
  return (await readRegistry(root)).masks;
}

export async function getMask(slug: string, root = libraryRoot()): Promise<MaskEntry | undefined> {
  return (await readRegistry(root)).masks.find((m) => m.slug === slug);
}

/** Add a mask, or merge fields into an existing one. Auto-commits. */
export async function upsertMask(entry: MaskEntry, root = libraryRoot()): Promise<void> {
  const reg = await readRegistry(root);
  const i = reg.masks.findIndex((m) => m.slug === entry.slug);
  if (i >= 0) reg.masks[i] = { ...reg.masks[i], ...entry };
  else reg.masks.push(entry);
  await writeRegistry(reg, root, `mask: ${i >= 0 ? "update" : "add"} ${entry.slug}`);
}

/** Remove a mask from the roster. Returns false if it wasn't present. */
export async function removeMask(slug: string, root = libraryRoot()): Promise<boolean> {
  const reg = await readRegistry(root);
  const before = reg.masks.length;
  reg.masks = reg.masks.filter((m) => m.slug !== slug);
  if (reg.masks.length === before) return false;
  await writeRegistry(reg, root, `mask: remove ${slug}`);
  return true;
}
