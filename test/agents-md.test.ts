import { expect, test } from "bun:test";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { agentsMdAdapter } from "../src/adapters/agents-md.ts";
import { claudeCodeAdapter } from "../src/adapters/claude-code.ts";
import { toPersonaUnit } from "../src/lib/compile.ts";

const MASK = `---
name: Dan Abramov
slug: dan
source_kind: blog
---

# Identity
Answer in the voice of Dan Abramov.

## How to answer
Take first, then justify. Cite facts [src:...].
`;
const unit = () => toPersonaUnit(MASK, "dan");

async function freshTarget(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "mask-agentsmd-"));
  const target = join(dir, "AGENTS.md");
  process.env.MASK_AGENTS_MD = target;
  return target;
}

test("install seeds the orchestrator and an empty active block, with resolved recipe path", async () => {
  const target = await freshTarget();
  await agentsMdAdapter.installOrchestrator();
  const out = await readFile(target, "utf8");

  expect(out).toContain("<!-- mask:orchestrator -->");
  expect(out).toContain("<!-- mask:active -->");
  expect(out).toContain("No mask worn yet");
  expect(out).not.toContain("{{recipe}}"); // placeholder resolved
  expect(out).toContain("RECIPE.md");
});

test("activate swaps the active block to the worn mask; deactivate resets it", async () => {
  const target = await freshTarget();
  await agentsMdAdapter.installOrchestrator();

  await agentsMdAdapter.activate(unit());
  let out = await readFile(target, "utf8");
  expect(out).toContain("<!-- mask:active dan -->");
  expect(out).toContain("You are currently wearing Dan Abramov.");
  expect(out).toContain("Take first, then justify");
  expect(out).toContain("<!-- mask:orchestrator -->"); // orchestrator untouched
  expect(out.match(/<!-- mask:active/g)).toHaveLength(1); // no duplicate

  await agentsMdAdapter.deactivate();
  out = await readFile(target, "utf8");
  expect(out).toContain("No mask worn yet");
  expect(out).not.toContain("currently wearing Dan Abramov");
});

test("install is idempotent — re-running does not duplicate blocks", async () => {
  const target = await freshTarget();
  await agentsMdAdapter.installOrchestrator();
  await agentsMdAdapter.activate(unit());
  await agentsMdAdapter.installOrchestrator(); // re-install keeps the worn mask
  const out = await readFile(target, "utf8");
  expect(out.match(/<!-- mask:orchestrator -->/g)).toHaveLength(1);
  expect(out.match(/<!-- mask:active/g)).toHaveLength(1);
  expect(out).toContain("currently wearing Dan Abramov"); // active block preserved
});

test("one mask compiles to BOTH Claude Code and AGENTS.md from the same persona unit", async () => {
  const u = unit();

  // Claude Code: a standalone subagent file
  const agentsDir = await mkdtemp(join(tmpdir(), "mask-cc-"));
  process.env.MASK_AGENTS_DIR = agentsDir;
  const subagentPath = await claudeCodeAdapter.compile(u);
  const subagent = await readFile(subagentPath, "utf8");
  expect(subagent).toContain("name: dan");
  expect(subagent).toContain("Take first, then justify");

  // AGENTS.md: an inline active block
  const target = await freshTarget();
  await agentsMdAdapter.installOrchestrator();
  await agentsMdAdapter.activate(u);
  const agentsMd = await readFile(target, "utf8");
  expect(agentsMd).toContain("You are currently wearing Dan Abramov.");
  expect(agentsMd).toContain("Take first, then justify");

  // same voice profile reaches both targets
  expect(subagent).toContain("Answer in the voice of Dan Abramov.");
  expect(agentsMd).toContain("Answer in the voice of Dan Abramov.");
});
