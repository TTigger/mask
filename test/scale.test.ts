import { expect, test } from "bun:test";
import {
  chunkSamples,
  buildMapPrompt,
  runMap,
  runnerForAgent,
  defaultRunner,
  type AgentRunner,
} from "../src/lib/scale.ts";
import type { Sample } from "../src/lib/digest.ts";

function sample(id: string, chars: number, title?: string): Sample {
  return { id, src_ref: { url: `https://x/${id}`, title }, text: "z".repeat(chars) };
}

test("chunkSamples packs under the budget; an oversized sample stands alone", () => {
  const samples = [sample("a", 30), sample("b", 30), sample("c", 30), sample("big", 100)];
  const chunks = chunkSamples(samples, 70);
  expect(chunks.map((c) => c.map((s) => s.id))).toEqual([["a", "b"], ["c"], ["big"]]);
  // every sample appears exactly once, order preserved
  expect(chunks.flat().map((s) => s.id)).toEqual(["a", "b", "c", "big"]);
});

test("a corpus that fits in one chunk yields a single chunk", () => {
  expect(chunkSamples([sample("a", 10), sample("b", 10)], 1000)).toHaveLength(1);
});

test("buildMapPrompt embeds each sample with its id and title", () => {
  const p = buildMapPrompt([sample("y1", 5, "Intro"), sample("y2", 5)], 0, 3);
  expect(p).toContain("(1/3)");
  expect(p).toContain("[y1] (Intro)");
  expect(p).toContain("[y2]");
  expect(p).toContain("[src:ID]"); // the extraction instruction
});

test("runMap calls the runner once per chunk and collects partials in order", async () => {
  const seen: string[] = [];
  const fake: AgentRunner = async (prompt) => {
    const id = prompt.match(/\((\d)\/\d\)/)![1]!;
    seen.push(id);
    return `partial-${id}`;
  };
  const chunks = [[sample("a", 5)], [sample("b", 5)], [sample("c", 5)]];
  const out = await runMap(chunks, fake);
  expect(out).toEqual(["partial-1", "partial-2", "partial-3"]);
  expect(seen).toEqual(["1", "2", "3"]); // sequential, in order
});

test("runnerForAgent maps the library agent to a headless CLI; defaultRunner rejects unknown", () => {
  expect(runnerForAgent("claude-code")).toBe("claude");
  expect(runnerForAgent("gemini")).toBe("gemini");
  expect(runnerForAgent("cursor")).toBe("claude"); // no headless CLI of its own
  expect(() => defaultRunner("nope")).toThrow(/unknown runner/);
});
