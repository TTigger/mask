import { expect, test } from "bun:test";
import { mergeBlended } from "../src/lib/blend.ts";
import { toPersonaUnit, renderSubagent } from "../src/lib/compile.ts";
import { SUBAGENT_BLEND_HBS } from "../src/lib/assets.ts";
import type { Sample } from "../src/lib/digest.ts";

function s(id: string, text: string): Sample {
  return { id, src_ref: { url: `u/${id}` }, text };
}

test("mergeBlended namespaces ids by source and labels the kind", () => {
  const merged = mergeBlended([
    { source: "blogA", samples: [s("b1", "a1"), s("b2", "a2")] },
    { source: "repoB", samples: [s("r1", "b1")] },
  ]);
  expect(merged.source_kind).toBe("blend");
  expect(merged.samples.map((x) => x.id)).toEqual(["1.b1", "1.b2", "2.r1"]);
  expect(merged.samples.every((x) => x.text)).toBe(true); // text preserved
});

test("toPersonaUnit recognizes type:blend with a voice-neutral default description", () => {
  const md = `---\nname: webdev-brain\ntype: blend\nsource_kind: blend\n---\n\n# Identity\nA blend.\n`;
  const unit = toPersonaUnit(md, "webdev-brain");
  expect(unit.type).toBe("blend");
  expect(unit.description).toBe("Voice-neutral knowledge blend: webdev-brain.");
});

test("the blend subagent template is voice-neutral and attribution-first", () => {
  const md = `---\nname: webdev-brain\ntype: blend\n---\n\n# Identity\nSynthesis of 2 sources. [src:1.b1]\n`;
  const out = renderSubagent(SUBAGENT_BLEND_HBS, toPersonaUnit(md, "webdev-brain"));
  expect(out).toContain("voice-neutral knowledge synthesis");
  expect(out).toContain("Do NOT imitate any single author");
  expect(out).toContain("disagree, say so");
  expect(out).not.toContain("Answer in the voice of");
  expect(out).not.toContain("{{");
});
