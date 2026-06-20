import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { libraryRoot, configPath } from "./paths.ts";

/** The library's config.json — which agent this library targets. */
export interface MaskConfig {
  agent: string;
  version: number;
}

const DEFAULT: MaskConfig = { agent: "claude-code", version: 1 };

export async function readConfig(root = libraryRoot()): Promise<MaskConfig> {
  const p = configPath(root);
  if (!existsSync(p)) return { ...DEFAULT };
  try {
    return { ...DEFAULT, ...(JSON.parse(await readFile(p, "utf8")) as Partial<MaskConfig>) };
  } catch {
    return { ...DEFAULT };
  }
}
