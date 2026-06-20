import type { PersonaUnit } from "../lib/compile.ts";

/**
 * Per-agent renderer (SPEC §7). The shared compile core normalizes mask.md into
 * a PersonaUnit; each adapter renders that unit into its agent's native format
 * and owns that agent's install / activate / cleanup mechanics. Adding an agent
 * = adding one Adapter; the recipe and the library stay put.
 */
export interface Adapter {
  readonly id: string;

  /** Install the orchestrator into the agent's instruction file. Returns the target path. */
  installOrchestrator(): Promise<string>;

  /** Produce the agent-native persona artifact for a mask. Returns a human-facing path/description. */
  compile(unit: PersonaUnit): Promise<string>;

  /** Called on `wear`: make this mask the active persona (no-op where personas coexist). */
  activate(unit: PersonaUnit): Promise<void>;

  /** Called on `unwear`: clear the active persona (no-op where there's nothing inline to clear). */
  deactivate(): Promise<void>;

  /** Called on `remove`: strip any compiled artifact / active block for this slug. */
  removeArtifacts(slug: string): Promise<void>;
}
