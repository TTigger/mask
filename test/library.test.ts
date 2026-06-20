import { afterEach, beforeEach, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { simpleGit } from "simple-git";
import { listMasks, getMask, upsertMask, removeMask, type MaskEntry } from "../src/lib/registry.ts";
import { getActive, setActive, clearActive } from "../src/lib/active.ts";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "mask-test-"));
  process.env.MASK_HOME = dir;
  // Give the temp repo a committer identity so auto-commits succeed in CI.
  const git = simpleGit(dir);
  await git.init();
  await git.addConfig("user.email", "test@example.com");
  await git.addConfig("user.name", "mask test");
});

afterEach(async () => {
  delete process.env.MASK_HOME;
  await rm(dir, { recursive: true, force: true });
});

const sample: MaskEntry = {
  slug: "fireship",
  name: "Fireship",
  source_kind: "blog",
  description: "fast, punchy webdev takes",
  created: "2026-06-20",
  last_used: null,
};

test("registry: empty by default", async () => {
  expect(await listMasks()).toEqual([]);
});

test("registry: upsert adds then merges (no duplicates)", async () => {
  await upsertMask(sample);
  expect(await listMasks()).toHaveLength(1);

  await upsertMask({ ...sample, description: "updated" });
  const masks = await listMasks();
  expect(masks).toHaveLength(1);
  expect(masks[0]!.description).toBe("updated");
});

test("registry: getMask + removeMask", async () => {
  await upsertMask(sample);
  expect((await getMask("fireship"))?.name).toBe("Fireship");

  expect(await removeMask("fireship")).toBe(true);
  expect(await removeMask("fireship")).toBe(false);
  expect(await listMasks()).toEqual([]);
});

test("active: get/set/clear round-trip", async () => {
  expect(await getActive()).toBeNull();

  await setActive("fireship");
  expect(await getActive()).toBe("fireship");

  await clearActive();
  expect(await getActive()).toBeNull();
});

test("mutations auto-commit to the library git repo", async () => {
  await upsertMask(sample);
  await setActive("fireship");

  const log = await simpleGit(dir).log();
  const messages = log.all.map((c) => c.message);
  expect(messages).toContain("mask: add fireship");
  expect(messages).toContain("mask: wear fireship");
});
