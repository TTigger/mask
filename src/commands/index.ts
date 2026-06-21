import type { Command } from "commander";
import { registerInit } from "./init.ts";
import { registerIngest } from "./ingest.ts";
import { registerReduce } from "./reduce.ts";
import { registerRedistill } from "./redistill.ts";
import { registerCompile } from "./compile.ts";
import {
  registerWear,
  registerList,
  registerStatus,
  registerUnwear,
  registerRemove,
} from "./roster.ts";

/**
 * Register the full CLI surface (SPEC §8 — "the agent's hands").
 * Commands are deterministic, zero-LLM. Stubs are filled in task by task.
 */
export function registerCommands(program: Command): void {
  registerInit(program);
  registerIngest(program);
  registerReduce(program);
  registerRedistill(program);
  registerCompile(program);
  registerWear(program);
  registerList(program);
  registerStatus(program);
  registerUnwear(program);
  registerRemove(program);
}
