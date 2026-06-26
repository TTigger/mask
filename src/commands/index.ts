import type { Command } from "commander";
import { registerInit } from "./init.ts";
import { registerIngest } from "./ingest.ts";
import { registerReduce } from "./reduce.ts";
import { registerRedistill } from "./redistill.ts";
import { registerScale } from "./scale.ts";
import { registerCompile } from "./compile.ts";
import { registerTry } from "./try.ts";
import {
  registerWear,
  registerList,
  registerStatus,
  registerStatusline,
  registerCoverage,
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
  registerScale(program);
  registerCompile(program);
  registerTry(program);
  registerWear(program);
  registerList(program);
  registerStatus(program);
  registerStatusline(program);
  registerCoverage(program);
  registerUnwear(program);
  registerRemove(program);
}
