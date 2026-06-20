import { expect, test } from "bun:test";
import {
  ORCHESTRATOR_MD,
  SUBAGENT_HBS,
  AGENTS_MD_ORCHESTRATOR,
  ACTIVE_BLOCK_HBS,
} from "../src/lib/assets.ts";

// These are embedded via Bun's text loader so the compiled binary is self-
// sufficient; assert they're populated and carry their expected markers.
test("orchestrator asset is embedded with its managed-block markers", () => {
  expect(ORCHESTRATOR_MD.length).toBeGreaterThan(100);
  expect(ORCHESTRATOR_MD).toContain("<!-- mask:orchestrator -->");
  expect(ORCHESTRATOR_MD).toContain("{{recipe}}"); // unresolved until install
});

test("subagent template is embedded with its handlebars slots", () => {
  expect(SUBAGENT_HBS.length).toBeGreaterThan(50);
  expect(SUBAGENT_HBS).toContain("{{slug}}");
  expect(SUBAGENT_HBS).toContain("{{voice_profile}}");
});

test("agents-md assets are embedded with orchestrator + active blocks", () => {
  expect(AGENTS_MD_ORCHESTRATOR).toContain("<!-- mask:orchestrator -->");
  expect(AGENTS_MD_ORCHESTRATOR).toContain("<!-- mask:active -->");
  expect(ACTIVE_BLOCK_HBS).toContain("{{slug}}");
  expect(ACTIVE_BLOCK_HBS).toContain("{{voice_profile}}");
});
