/**
 * Framework assets the CLI reads at runtime, embedded at build time via Bun's
 * text loader. This is what makes the `bun build --compile` binary self-
 * sufficient — install/compile no longer depend on an adjacent source tree
 * (where `frameworkRoot()` would resolve to "/" and the reads would fail).
 *
 * The voice recipe and the templates are NOT embedded here: those are read by
 * the *agent* from the cloned framework repo (see framework.ts / MASK_FRAMEWORK).
 */
import orchestratorMd from "../../adapters/claude-code/orchestrator.md" with { type: "text" };
import subagentHbs from "../../adapters/claude-code/subagent.hbs" with { type: "text" };
import agentsMdOrchestrator from "../../adapters/agents-md/orchestrator.md" with { type: "text" };
import activeBlockHbs from "../../adapters/agents-md/active-block.hbs" with { type: "text" };

// Claude Code adapter assets
export const ORCHESTRATOR_MD: string = orchestratorMd;
export const SUBAGENT_HBS: string = subagentHbs;

// AGENTS.md adapter assets
export const AGENTS_MD_ORCHESTRATOR: string = agentsMdOrchestrator;
export const ACTIVE_BLOCK_HBS: string = activeBlockHbs;
