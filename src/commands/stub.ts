import type { Command } from "commander";

/**
 * Register a placeholder subcommand whose surface matches SPEC §8 from day one.
 * Real implementations replace these task by task through Phase 0.
 */
export function registerStub(
  program: Command,
  name: string,
  summary: string,
  phase: string,
  args = "",
): void {
  program
    .command(`${name}${args ? " " + args : ""}`)
    .description(summary)
    .action(() => {
      console.log(`mask ${name}: not implemented yet (lands in Phase ${phase}).`);
    });
}
