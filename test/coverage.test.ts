import { expect, test } from "bun:test";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  coverageOf,
  describeCoverage,
  checkWikiIntegrity,
  describeWikiIntegrity,
} from "../src/lib/coverage.ts";
import type { SourcesFile, SourceRecord } from "../src/lib/digest.ts";

function rec(id: string, chars: number, truncated = false): SourceRecord {
  return { id, url: `https://x/${id}`, hash: `sha256:${id}`, chars, truncated };
}

function file(kind: string, recs: SourceRecord[]): SourcesFile {
  return {
    source_kind: kind,
    sampling: { max_chars: 60000 },
    sources: recs,
    manifest: recs.map((r) => ({ url: r.url, hash: r.hash })),
  };
}

test("coverageOf totals sources/chars/truncation and bands confidence", () => {
  const broad = coverageOf(file("blog", Array.from({ length: 10 }, (_, i) => rec(`b${i}`, 1000, i < 3))));
  expect(broad.nSources).toBe(10);
  expect(broad.nTruncated).toBe(3);
  expect(broad.totalChars).toBe(10000);
  expect(broad.confidence).toBe("broad");

  expect(coverageOf(file("youtube", [rec("y1", 500)])).confidence).toBe("thin");
  expect(coverageOf(file("repo", [rec("r1", 1), rec("r2", 1), rec("r3", 1), rec("r4", 1)])).confidence).toBe(
    "moderate",
  );
});

test("describeCoverage surfaces a thin-evidence warning only when thin", () => {
  const thin = describeCoverage(coverageOf(file("blog", [rec("b1", 100)])));
  expect(thin.join("\n")).toContain("thin evidence");

  const broad = describeCoverage(coverageOf(file("blog", Array.from({ length: 9 }, (_, i) => rec(`b${i}`, 100)))));
  expect(broad.join("\n")).not.toContain("thin evidence");
  expect(broad[0]).toContain("blog");
  expect(broad[0]).toContain("9 item");
});

test("checkWikiIntegrity flags orphans, broken links, and unknown citations", async () => {
  const dir = await mkdtemp(join(tmpdir(), "mask-wiki-"));
  const k = join(dir, "knowledge");
  await mkdir(k, { recursive: true });
  // index references tools.md but NOT orphan.md
  await writeFile(join(k, "index.md"), "# Knowledge index\n- webdev -> tools.md\n");
  // tools.md: a good link [[frameworks]] (exists), a broken one [[ghosts]], known + unknown cites
  await writeFile(join(k, "tools.md"), "Bundlers are fine. see also [[frameworks]] and [[ghosts]]. [src:b1] [src:b9, b1]\n");
  await writeFile(join(k, "frameworks.md"), "Pick boring tech. [src:b1]\n");
  await writeFile(join(k, "orphan.md"), "Nobody links me. [src:b1]\n");

  const w = await checkWikiIntegrity(k, new Set(["b1"]));
  expect(w.present).toBe(true);
  expect(w.nPages).toBe(3); // tools, frameworks, orphan (index.md/log.md excluded)
  expect(w.orphans).toContain("orphan.md");
  expect(w.orphans).not.toContain("tools.md");
  expect(w.brokenLinks.map((b) => b.target)).toContain("ghosts");
  expect(w.brokenLinks.map((b) => b.target)).not.toContain("frameworks");
  expect(w.unknownCitations.map((u) => u.id)).toContain("b9");
  expect(w.unknownCitations.map((u) => u.id)).not.toContain("b1");

  const lines = describeWikiIntegrity(w).join("\n");
  expect(lines).toContain("knowledge: 3 page(s)");
  expect(lines).toContain("broken links:");
  expect(lines).toContain("[src:b9]");
});

test("checkWikiIntegrity reports a clean wiki and an absent one", async () => {
  expect(describeWikiIntegrity(await checkWikiIntegrity(join(tmpdir(), "nope-does-not-exist"), new Set()))).toEqual([
    "knowledge: none",
  ]);

  const dir = await mkdtemp(join(tmpdir(), "mask-wiki-clean-"));
  const k = join(dir, "knowledge");
  await mkdir(k, { recursive: true });
  await writeFile(join(k, "index.md"), "- foo -> foo.md\n");
  await writeFile(join(k, "log.md"), "## [2026-01-01] ingest | x\n");
  await writeFile(join(k, "foo.md"), "All good. [src:b1]\n");
  const clean = describeWikiIntegrity(await checkWikiIntegrity(k, new Set(["b1"])));
  expect(clean).toContain("orphans: none");
  expect(clean).toContain("broken links: none");
  expect(clean).toContain("unknown citations: none");
});
