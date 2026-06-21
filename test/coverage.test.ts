import { expect, test } from "bun:test";
import { coverageOf, describeCoverage } from "../src/lib/coverage.ts";
import type { SourcesFile, SourceRecord } from "../src/lib/digest.ts";

function rec(id: string, chars: number, truncated = false): SourceRecord {
  return { id, url: `https://x/${id}`, hash: `sha256:${id}`, chars, truncated };
}

function file(kind: string, recs: SourceRecord[]): SourcesFile {
  return { source_kind: kind, sampling: { max_chars: 60000 }, sources: recs };
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
