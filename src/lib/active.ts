import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { activePath, libraryRoot } from "./paths.ts";
import { commitAll } from "./git.ts";

/** The sticky active mask slug, or null if none is worn. */
export async function getActive(root = libraryRoot()): Promise<string | null> {
  const p = activePath(root);
  if (!existsSync(p)) return null;
  const v = (await readFile(p, "utf8")).trim();
  return v.length ? v : null;
}

export async function setActive(slug: string, root = libraryRoot()): Promise<void> {
  await writeFile(activePath(root), slug + "\n");
  await commitAll(root, `mask: wear ${slug}`);
}

export async function clearActive(root = libraryRoot()): Promise<void> {
  await writeFile(activePath(root), "");
  await commitAll(root, "mask: unwear");
}
