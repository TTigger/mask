import { expect, test } from "bun:test";
import { isAbsolute } from "node:path";
import { renderOrchestrator } from "../src/commands/install-orchestrator.ts";
import { recipePath, templatesDir } from "../src/lib/framework.ts";

test("renderOrchestrator resolves asset placeholders to absolute framework paths", () => {
  const out = renderOrchestrator("follow {{recipe}}; skeletons in {{templates}}");
  expect(out).toContain(recipePath());
  expect(out).toContain(templatesDir());
  expect(isAbsolute(recipePath())).toBe(true);
  expect(out).not.toContain("{{"); // no placeholder left unresolved
});

test("the shipped orchestrator template has no unresolved placeholders after render", async () => {
  const raw = await Bun.file(
    new URL("../adapters/claude-code/orchestrator.md", import.meta.url),
  ).text();
  expect(raw).toContain("{{recipe}}"); // template carries placeholders
  const rendered = renderOrchestrator(raw);
  expect(rendered).not.toContain("{{");
  expect(rendered).toContain(recipePath());
});
