import type { Command } from "commander";
import { registerInit } from "./init.ts";
import { registerIngest } from "./ingest.ts";
import { registerStub } from "./stub.ts";

/**
 * Register the full CLI surface (SPEC §8 — "the agent's hands").
 * Commands are deterministic, zero-LLM. Stubs are filled in task by task.
 */
export function registerCommands(program: Command): void {
  registerInit(program);
  registerIngest(program);

  registerStub(program, "reduce", "Reduce samples into a compact digest", "0.6");
  registerStub(program, "compile", "Compile a mask into the current agent's native format", "0.9", "<slug>");
  registerStub(program, "wear", "Set the active mask", "0.10", "<slug>");
  registerStub(program, "list", "Show the mask roster", "0.10");
  registerStub(program, "status", "Show which mask is currently worn", "0.10");
  registerStub(program, "unwear", "Remove the active mask's managed artifacts", "0.10");
  registerStub(program, "remove", "Remove a mask from the library", "0.10", "<slug>");
}
