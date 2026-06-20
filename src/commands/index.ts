import type { Command } from "commander";
import { registerInit } from "./init.ts";
import { registerIngest } from "./ingest.ts";
import { registerReduce } from "./reduce.ts";
import { registerCompile } from "./compile.ts";
import { registerStub } from "./stub.ts";

/**
 * Register the full CLI surface (SPEC §8 — "the agent's hands").
 * Commands are deterministic, zero-LLM. Stubs are filled in task by task.
 */
export function registerCommands(program: Command): void {
  registerInit(program);
  registerIngest(program);
  registerReduce(program);
  registerCompile(program);

  registerStub(program, "wear", "Set the active mask", "0.10", "<slug>");
  registerStub(program, "list", "Show the mask roster", "0.10");
  registerStub(program, "status", "Show which mask is currently worn", "0.10");
  registerStub(program, "unwear", "Remove the active mask's managed artifacts", "0.10");
  registerStub(program, "remove", "Remove a mask from the library", "0.10", "<slug>");
}
