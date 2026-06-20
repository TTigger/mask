import type { Command } from "commander";

/**
 * `mask init` — initialize the user's mask library at ~/.mask/ and install the
 * agent orchestrator. Real implementation lands in Phase 0.2 / 0.4.
 */
export function registerInit(program: Command): void {
  program
    .command("init")
    .description("Initialize the mask library (~/.mask) and install the orchestrator")
    .action(() => {
      console.log("mask init: not implemented yet (lands in Phase 0.2).");
    });
}
