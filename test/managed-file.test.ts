import { expect, test } from "bun:test";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { geminiAdapter } from "../src/adapters/gemini.ts";
import { cursorAdapter } from "../src/adapters/cursor.ts";
import { getAdapter, SUPPORTED_AGENTS } from "../src/adapters/index.ts";
import { toPersonaUnit } from "../src/lib/compile.ts";

const unit = () =>
  toPersonaUnit(`---\nname: Dan Abramov\nslug: dan\n---\n\n# Identity\nVoice body here.\n`, "dan");

test("the four agents are registered and resolvable", () => {
  expect(SUPPORTED_AGENTS).toEqual(
    expect.arrayContaining(["claude-code", "agents-md", "gemini", "cursor"]),
  );
  expect(getAdapter("gemini").id).toBe("gemini");
  expect(getAdapter("cursor").id).toBe("cursor");
});

test("gemini installs into GEMINI.md and wears inline, like AGENTS.md", async () => {
  const target = join(await mkdtemp(join(tmpdir(), "mask-gem-")), "GEMINI.md");
  process.env.MASK_GEMINI_MD = target;

  await geminiAdapter.installOrchestrator();
  let out = await readFile(target, "utf8");
  expect(out).toContain("<!-- mask:orchestrator -->");
  expect(out).toContain("No mask worn yet");
  expect(out).not.toContain("{{recipe}}");

  await geminiAdapter.activate(unit());
  out = await readFile(target, "utf8");
  expect(out).toContain("<!-- mask:active dan -->");
  expect(out).toContain("You are currently wearing Dan Abramov.");
  expect(out.match(/<!-- mask:active/g)).toHaveLength(1);

  await geminiAdapter.deactivate();
  expect(await readFile(target, "utf8")).toContain("No mask worn yet");
});

test("cursor writes a .mdc with frontmatter header, then swaps the active block", async () => {
  const target = join(await mkdtemp(join(tmpdir(), "mask-cur-")), "mask.mdc");
  process.env.MASK_CURSOR_MDC = target;

  await cursorAdapter.installOrchestrator();
  let out = await readFile(target, "utf8");
  expect(out.startsWith("---\n")).toBe(true); // MDC frontmatter at the very top
  expect(out).toContain("alwaysApply: true");
  expect(out).toContain("<!-- mask:orchestrator -->");

  await cursorAdapter.activate(unit());
  out = await readFile(target, "utf8");
  expect(out.startsWith("---\n")).toBe(true); // header preserved after activate
  expect(out).toContain("You are currently wearing Dan Abramov.");
  expect(out.match(/^---$/gm)?.length).toBe(2); // frontmatter delimiters only — not duplicated
});
