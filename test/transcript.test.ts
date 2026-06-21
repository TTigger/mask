import { expect, test } from "bun:test";
import { denoiseTranscript } from "../src/lib/transcript.ts";
import { reduceSamples, type SamplesFile, type Sample } from "../src/lib/digest.ts";

test("denoiseTranscript strips bracketed non-speech and filler tokens", () => {
  expect(denoiseTranscript("[Music] welcome um back uh everyone")).toBe("welcome back everyone");
  expect(denoiseTranscript("intro [Applause] outro")).toBe("intro outro");
});

test("denoiseTranscript collapses immediately-repeated phrases (to a fixed point)", () => {
  expect(denoiseTranscript("we ship we ship fast")).toBe("we ship fast");
  expect(denoiseTranscript("the the bug")).toBe("the bug");
  expect(denoiseTranscript("so today so today we build")).toBe("so today we build");
  expect(denoiseTranscript("yeah yeah yeah")).toBe("yeah"); // odd run fully collapses
});

function sample(id: string, text: string): Sample {
  return { id, src_ref: { url: `https://youtu.be/${id}` }, text };
}

test("reduce denoises only youtube sources and notes it", () => {
  const yt: SamplesFile = { source_kind: "youtube", samples: [sample("y1", "[Music] hello hello world")] };
  const out = reduceSamples(yt);
  expect(out.samples[0]!.text).toBe("hello world");
  expect(out.meta.notes.some((n) => n.includes("denoised"))).toBe(true);

  const blog: SamplesFile = { source_kind: "blog", samples: [{ ...sample("b1", "[Music] hello hello world"), src_ref: { url: "x" } }] };
  const blogOut = reduceSamples(blog);
  expect(blogOut.samples[0]!.text).toBe("[Music] hello hello world"); // untouched
  expect(blogOut.meta.notes.some((n) => n.includes("denoised"))).toBe(false);
});

test("large sources are breadth-sampled (span early/middle/late), not just the prefix", () => {
  // 20 distinct samples, each 5000 chars; budget fits ~7 (within 60k).
  const samples = Array.from({ length: 20 }, (_, i) =>
    sample(`s${i}`, String.fromCharCode(97 + (i % 26)).repeat(5000) + ` ${i}`),
  );
  const out = reduceSamples({ source_kind: "blog", samples }, { perSampleCap: 6000 });

  const keptNums = out.samples.map((s) => Number(s.id.slice(1)));
  expect(keptNums).toEqual([...keptNums].sort((a, b) => a - b)); // emitted in source order
  expect(keptNums[0]).toBe(0); // newest included
  expect(Math.max(...keptNums)).toBeGreaterThan(9); // reaches the back half — true breadth
  expect(out.meta.notes.some((n) => n.includes("breadth-sampled"))).toBe(true);
});

test("small sources keep the recency-prefix path", () => {
  const samples = Array.from({ length: 5 }, (_, i) => sample(`s${i}`, "z".repeat(100) + ` ${i}`));
  const out = reduceSamples({ source_kind: "blog", samples }, { maxChars: 250, perSampleCap: 1000 });
  expect(out.samples.map((s) => s.id)).toEqual(["s0", "s1"]); // prefix, not spread
  expect(out.meta.notes.some((n) => n.includes("recency-ordered"))).toBe(true);
});
