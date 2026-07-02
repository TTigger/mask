import { Command } from "commander";
import { registerCommands } from "./commands/index.ts";
import pkg from "../package.json" with { type: "json" };

const program = new Command();

program
  .name("mask")
  .description("Distill anything. Wear anyone. — agent-native persona distillation.")
  .version(pkg.version, "-v, --version");

registerCommands(program);

program.parseAsync(process.argv).catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
