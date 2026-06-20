import { expect, test } from "bun:test";
import { reduceSamples, type SamplesFile, type Sample } from "../src/lib/digest.ts";

function sample(id: string, text: string): Sample {
  return { id, src_ref: { url: `https://blog.test/${id}` }, text };
}

function file(samples: Sample[]): SamplesFile {
  return { source_kind: "blog", samples };
}

test("dedup drops exact repeats (whitespace/case-normalized), keeps first id", () => {
  const digest = reduceSamples(
    file([sample("b1", "Hello World."), sample("b2", "  hello   WORLD.  "), sample("b3", "Different.")]),
  );
  expect(digest.samples.map((s) => s.id)).toEqual(["b1", "b3"]);
  expect(digest.meta.n_input).toBe(3);
  expect(digest.meta.n_kept).toBe(2);
  expect(digest.meta.dropped).toBe(1);
  expect(digest.meta.notes.some((n) => n.includes("duplicate"))).toBe(true);
});

test("per-sample cap truncates long text at a word boundary and marks it", () => {
  const long = "word ".repeat(50).trim(); // 249 chars
  const digest = reduceSamples(file([sample("b1", long)]), { perSampleCap: 40 });
  const text = digest.samples[0]!.text;
  expect(text.length).toBeLessThanOrEqual(42);
  expect(text.endsWith("…")).toBe(true);
  expect(text).not.toContain("wor "); // cut on a boundary, no split word
  expect(digest.meta.notes.some((n) => n.includes("truncated"))).toBe(true);
});

test("budget fill keeps samples in input order until the char budget is hit", () => {
  const big = (c: string) => c.repeat(100);
  const digest = reduceSamples(
    file([sample("b1", big("a")), sample("b2", big("b")), sample("b3", big("c"))]),
    { maxChars: 250, perSampleCap: 1000 },
  );
  expect(digest.samples.map((s) => s.id)).toEqual(["b1", "b2"]);
  expect(digest.meta.n_kept).toBe(2);
  expect(digest.meta.dropped).toBe(1);
});

test("always keeps at least one sample even past budget, and flags thin digests", () => {
  const digest = reduceSamples(file([sample("b1", "y".repeat(500))]), { maxChars: 10 });
  expect(digest.samples.map((s) => s.id)).toEqual(["b1"]);
  expect(digest.meta.notes.some((n) => n.includes("thin digest"))).toBe(true);
});

test("preserves source_kind and src_ref through the reduce", () => {
  const digest = reduceSamples(file([sample("b1", "kept text")]));
  expect(digest.meta.source_kind).toBe("blog");
  expect(digest.samples[0]!.src_ref.url).toBe("https://blog.test/b1");
});
