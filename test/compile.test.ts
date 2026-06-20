import { expect, test } from "bun:test";
import { toPersonaUnit, renderSubagent } from "../src/lib/compile.ts";

const MASK = `---
name: Dan Abramov
slug: dan
type: voice
source_kind: blog
---

# Identity
Answer in the voice of Dan Abramov.

## How to answer
Take first, then justify. Cite facts [src:...].
`;

test("toPersonaUnit pulls name + body and synthesizes a description", () => {
  const unit = toPersonaUnit(MASK, "dan");
  expect(unit.slug).toBe("dan");
  expect(unit.name).toBe("Dan Abramov");
  expect(unit.source_kind).toBe("blog");
  expect(unit.description).toBe("Answer in the voice of Dan Abramov.");
  expect(unit.voice_profile).toContain("# Identity");
  expect(unit.voice_profile).toContain("Take first, then justify");
});

test("frontmatter description wins over the synthesized one", () => {
  const md = `---\nname: X\ndescription: Crisp web-dev takes.\n---\n\n# Identity\nbody\n`;
  expect(toPersonaUnit(md, "x").description).toBe("Crisp web-dev takes.");
});

test("missing name or empty body is rejected", () => {
  expect(() => toPersonaUnit(`---\nslug: x\n---\n\nbody\n`, "x")).toThrow(/name/);
  expect(() => toPersonaUnit(`---\nname: X\n---\n\n`, "x")).toThrow(/empty/);
});

test("renderSubagent fills the template with no leftover placeholders", () => {
  const tpl = `---\nname: {{slug}}\ndescription: {{description}}\n---\nAnswer in the voice of {{name}}.\n\n{{voice_profile}}\n`;
  const out = renderSubagent(tpl, toPersonaUnit(MASK, "dan"));
  expect(out).toContain("name: dan");
  expect(out).toContain("description: Answer in the voice of Dan Abramov.");
  expect(out).toContain("Answer in the voice of Dan Abramov.");
  expect(out).toContain("Take first, then justify");
  expect(out).not.toContain("{{");
});

test("a voice profile containing $ patterns is inserted literally", () => {
  const md = `---\nname: X\n---\n\nUse $& and $1 freely, costs $5.\n`;
  const out = renderSubagent(`<<{{voice_profile}}>>`, toPersonaUnit(md, "x"));
  expect(out).toBe("<<Use $& and $1 freely, costs $5.>>");
});
