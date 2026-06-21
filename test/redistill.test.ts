import { expect, test } from "bun:test";
import {
  diffSources,
  hasChanges,
  deltaSamples,
  bumpMaskVersion,
  summarizeDiff,
} from "../src/lib/redistill.ts";
import { buildSources, reduceSamples, type SamplesFile, type Sample } from "../src/lib/digest.ts";

function sample(id: string, url: string, text: string): Sample {
  return { id, src_ref: { url }, text };
}

/** Build a SourcesFile the way reduce would, so hashes match a later ingest. */
function provenanceOf(samples: Sample[]): ReturnType<typeof buildSources> {
  const file: SamplesFile = { source_kind: "blog", samples };
  return buildSources(file, reduceSamples(file));
}

test("diffSources classifies added / changed / removed / unchanged by url + hash", () => {
  const old = provenanceOf([
    sample("b1", "https://x/a", "alpha"),
    sample("b2", "https://x/b", "beta"),
    sample("b3", "https://x/c", "gamma"),
  ]);

  const fresh: SamplesFile = {
    source_kind: "blog",
    samples: [
      sample("b1", "https://x/a", "alpha"), // unchanged
      sample("b2", "https://x/b", "beta v2"), // changed (same url, new text)
      sample("b3", "https://x/d", "delta"), // d is added; c is removed
    ],
  };

  const diff = diffSources(old, fresh);
  expect(diff.unchanged).toBe(1);
  expect(diff.changed.map((s) => s.src_ref.url)).toEqual(["https://x/b"]);
  expect(diff.added.map((s) => s.src_ref.url)).toEqual(["https://x/d"]);
  expect(diff.removed.map((s) => s.url)).toEqual(["https://x/c"]);
  expect(hasChanges(diff)).toBe(true);
  expect(deltaSamples(diff).map((s) => s.src_ref.url)).toEqual(["https://x/d", "https://x/b"]);
});

test("an identical re-ingest has no changes", () => {
  const samples = [sample("b1", "https://x/a", "alpha"), sample("b2", "https://x/b", "beta")];
  const diff = diffSources(provenanceOf(samples), { source_kind: "blog", samples });
  expect(hasChanges(diff)).toBe(false);
  expect(diff.unchanged).toBe(2);
  expect(summarizeDiff(diff)).toBe("+0 new, ~0 changed, -0 removed, 2 unchanged");
});

test("bumpMaskVersion increments frontmatter version and keeps the body", () => {
  const md = `---\nname: Dan\nslug: dan\nversion: 1\n---\n\n# Identity\nbody here\n`;
  const bump = bumpMaskVersion(md);
  expect(bump.from).toBe(1);
  expect(bump.to).toBe(2);
  expect(bump.content).toContain("version: 2");
  expect(bump.content).toContain("# Identity");
  expect(bump.content).toContain("body here");
  // a missing version defaults to 1 → 2
  expect(bumpMaskVersion(`---\nname: X\n---\n\nbody\n`).to).toBe(2);
});
