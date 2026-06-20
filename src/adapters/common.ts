import { recipePath, templatesDir } from "../lib/framework.ts";

/**
 * Resolve framework-asset placeholders to absolute paths so the agent can find
 * the recipe/skeletons from any working directory. Shared by every adapter's
 * orchestrator install — a relative path in the agent's global instructions is
 * meaningless.
 */
export function renderOrchestrator(template: string): string {
  return template
    .replaceAll("{{recipe}}", recipePath())
    .replaceAll("{{templates}}", templatesDir());
}
