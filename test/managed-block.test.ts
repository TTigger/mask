import { expect, test } from "bun:test";
import { hasBlock, removeBlock, upsertBlock } from "../src/lib/managed-block.ts";

const block = "<!-- mask:orchestrator -->\nhello\n<!-- /mask:orchestrator -->";

test("upsert into empty content", () => {
  const out = upsertBlock("", "orchestrator", block);
  expect(hasBlock(out, "orchestrator")).toBe(true);
  expect(out).toBe(block + "\n");
});

test("upsert appends, preserving surrounding content", () => {
  const out = upsertBlock("# My notes\n", "orchestrator", block);
  expect(out.startsWith("# My notes")).toBe(true);
  expect(hasBlock(out, "orchestrator")).toBe(true);
});

test("upsert replaces in place — never duplicates (idempotent)", () => {
  const once = upsertBlock("# notes\n", "orchestrator", block);
  const twice = upsertBlock(once, "orchestrator", block);
  expect(once).toBe(twice);
  expect(once.match(/<!-- mask:orchestrator -->/g)).toHaveLength(1);

  const changed = upsertBlock(once, "orchestrator", block.replace("hello", "updated"));
  expect(changed).toContain("updated");
  expect(changed.match(/<!-- mask:orchestrator/g)).toHaveLength(1);
});

test("tolerates an inline suffix on the opening marker (slug)", () => {
  const active = "<!-- mask:active fireship -->\nworn\n<!-- /mask:active -->";
  const out = upsertBlock("base\n", "active", active);
  expect(hasBlock(out, "active")).toBe(true);

  const swapped = upsertBlock(out, "active", active.replace("fireship", "gilfoyle").replace("worn", "now"));
  expect(swapped).toContain("gilfoyle");
  expect(swapped).not.toContain("fireship");
});

test("removeBlock strips only the marked region", () => {
  const out = upsertBlock("# keep me\n", "orchestrator", block);
  const removed = removeBlock(out, "orchestrator");
  expect(hasBlock(removed, "orchestrator")).toBe(false);
  expect(removed).toContain("# keep me");
  expect(removeBlock("no block here\n", "orchestrator")).toBe("no block here\n");
});
