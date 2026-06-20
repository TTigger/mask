import { expect, test } from "bun:test";
import { reduceSamples, buildSources, type SamplesFile, type Sample } from "../src/lib/digest.ts";

function sample(id: string, url: string, text: string, title?: string): Sample {
  return { id, src_ref: { url, title }, text };
}

function file(samples: Sample[]): SamplesFile {
  return { source_kind: "blog", samples };
}

test("every kept digest id resolves to a provenance record; dropped ids do not", () => {
  const input = file([
    sample("b1", "https://blog.test/one", "x".repeat(200), "One"),
    sample("b2", "https://blog.test/two", "x".repeat(200), "Two"), // exact dup of b1 -> dropped
    sample("b3", "https://blog.test/three", "y".repeat(200), "Three"),
  ]);
  const digest = reduceSamples(input);
  const sources = buildSources(input, digest);

  const keptIds = digest.samples.map((s) => s.id);
  const srcIds = sources.sources.map((s) => s.id);
  expect(srcIds).toEqual(keptIds); // chain covers exactly the kept samples
  expect(srcIds).not.toContain("b2");

  const b3 = sources.sources.find((s) => s.id === "b3")!;
  expect(b3.url).toBe("https://blog.test/three");
  expect(b3.title).toBe("Three");
});

test("hash is sha256 of the original text and is stable across runs", () => {
  const input = file([sample("b1", "https://blog.test/one", "stable content")]);
  const a = buildSources(input, reduceSamples(input));
  const b = buildSources(input, reduceSamples(input));
  expect(a.sources[0]!.hash).toBe(b.sources[0]!.hash);
  expect(a.sources[0]!.hash).toMatch(/^sha256:[0-9a-f]{64}$/);
});

test("hash and chars track the ORIGINAL text even when the digest truncates", () => {
  const long = "word ".repeat(4000); // 20000 chars, capped to 8000 in the digest
  const input = file([sample("b1", "https://blog.test/long", long)]);
  const digest = reduceSamples(input);
  const sources = buildSources(input, digest);

  const rec = sources.sources[0]!;
  expect(rec.truncated).toBe(true);
  expect(rec.chars).toBe(long.length); // original length, not the truncated copy
  expect(digest.samples[0]!.text.length).toBeLessThan(rec.chars);

  // full-text hash, computed from the source — not from the truncated digest copy
  const ofTruncated = buildSources(input, { ...digest, samples: [{ ...digest.samples[0]!, id: "b1" }] });
  expect(rec.hash).toBe(ofTruncated.sources[0]!.hash);
  expect(sources.sampling.max_chars).toBe(digest.meta.max_chars);
});
