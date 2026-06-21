import { expect, test } from "bun:test";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ensureWorkIgnored } from "../src/lib/digest.ts";

test("ensureWorkIgnored gitignores both .work/ and _work/, idempotently", async () => {
  const root = await mkdtemp(join(tmpdir(), "mask-stage-"));
  await ensureWorkIgnored(root);
  let gi = (await readFile(join(root, ".gitignore"), "utf8")).split(/\r?\n/).filter(Boolean);
  expect(gi).toContain(".work/"); // staging area
  expect(gi).toContain("_work/"); // recipe pass checkpoints — never committed

  await ensureWorkIgnored(root); // re-run
  gi = (await readFile(join(root, ".gitignore"), "utf8")).split(/\r?\n/).filter(Boolean);
  expect(gi.filter((l) => l === ".work/")).toHaveLength(1); // no duplication
  expect(gi.filter((l) => l === "_work/")).toHaveLength(1);
});
