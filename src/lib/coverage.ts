import type { SourcesFile } from "./digest.ts";

/**
 * Coverage-honesty reporting (Phase 3.5). Summarize how much evidence a mask
 * actually stands on, from its provenance — so a thin or heavily-truncated
 * distillation is visible rather than implied.
 */
export interface Coverage {
  source_kind: string;
  nSources: number;
  nTruncated: number;
  totalChars: number;
  /** Heuristic confidence band from the breadth of evidence. */
  confidence: "thin" | "moderate" | "broad";
}

export function coverageOf(sources: SourcesFile): Coverage {
  const recs = sources.sources;
  const nSources = recs.length;
  const nTruncated = recs.filter((r) => r.truncated).length;
  const totalChars = recs.reduce((sum, r) => sum + r.chars, 0);
  const confidence: Coverage["confidence"] = nSources <= 2 ? "thin" : nSources <= 7 ? "moderate" : "broad";
  return { source_kind: sources.source_kind, nSources, nTruncated, totalChars, confidence };
}

/** Human-readable lines describing the coverage. */
export function describeCoverage(c: Coverage): string[] {
  const lines = [
    `source: ${c.source_kind} · ${c.nSources} item(s) · ${c.totalChars.toLocaleString()} chars of original material`,
    `evidence: ${c.confidence}${c.nTruncated ? ` · ${c.nTruncated} item(s) truncated to the per-sample cap` : ""}`,
  ];
  if (c.confidence === "thin") {
    lines.push("note: thin evidence — the mask should declare its limits and treat gaps as speculation.");
  }
  return lines;
}
