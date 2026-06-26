import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
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

/**
 * Deterministic integrity report for a mask's knowledge wiki — no LLM. Surfaces
 * the bookkeeping the agent is supposed to maintain so drift is visible:
 * orphan pages, dangling [[cross-links]], and citations with no provenance.
 */
export interface WikiIntegrity {
  /** knowledge/ exists at all (vs a mask with no wiki). */
  present: boolean;
  /** Topic pages (excludes index.md / log.md). */
  nPages: number;
  /** Pages not referenced by index.md. */
  orphans: string[];
  /** `[[target]]` links whose `target.md` page does not exist. */
  brokenLinks: { from: string; target: string }[];
  /** `[src:id]` whose id is absent from sources.json. */
  unknownCitations: { from: string; id: string }[];
}

const LINK_RE = /\[\[([^\]]+)\]\]/g;
const CITE_RE = /\[src:([^\]]+)\]/g;

/** A reserved page name -> the topic-page filename it would resolve to. */
function pageFile(target: string): string {
  return `${target.trim().toLowerCase()}.md`;
}

export async function checkWikiIntegrity(knowledgeDir: string, sourceIds: Set<string>): Promise<WikiIntegrity> {
  const empty: WikiIntegrity = { present: false, nPages: 0, orphans: [], brokenLinks: [], unknownCitations: [] };
  if (!existsSync(knowledgeDir)) return empty;

  const entries = (await readdir(knowledgeDir)).filter((f) => f.endsWith(".md"));
  const pages = entries.filter((f) => f !== "index.md" && f !== "log.md").sort();
  const pageSet = new Set(entries.map((f) => f.toLowerCase()));

  const indexText = existsSync(join(knowledgeDir, "index.md"))
    ? await readFile(join(knowledgeDir, "index.md"), "utf8")
    : "";

  const orphans: string[] = [];
  const brokenLinks: WikiIntegrity["brokenLinks"] = [];
  const unknownCitations: WikiIntegrity["unknownCitations"] = [];

  for (const page of pages) {
    // Orphan: filename not mentioned anywhere in the index catalog.
    if (!indexText.toLowerCase().includes(page.toLowerCase())) orphans.push(page);

    const text = await readFile(join(knowledgeDir, page), "utf8");
    for (const m of text.matchAll(LINK_RE)) {
      const target = m[1];
      if (!pageSet.has(pageFile(target))) brokenLinks.push({ from: page, target: target.trim() });
    }
    for (const m of text.matchAll(CITE_RE)) {
      // A chunk may cite several ids: [src:b1, b2].
      for (const id of m[1].split(",").map((s) => s.trim()).filter(Boolean)) {
        if (!sourceIds.has(id)) unknownCitations.push({ from: page, id });
      }
    }
  }

  return { present: true, nPages: pages.length, orphans, brokenLinks, unknownCitations };
}

/** Human-readable lines describing wiki integrity (additive to describeCoverage). */
export function describeWikiIntegrity(w: WikiIntegrity): string[] {
  if (!w.present) return ["knowledge: none"];
  const lines = [`knowledge: ${w.nPages} page(s)`];
  lines.push(w.orphans.length ? `orphans: ${w.orphans.length} (${w.orphans.join(", ")})` : "orphans: none");
  lines.push(
    w.brokenLinks.length
      ? `broken links: ${w.brokenLinks.length} (${w.brokenLinks.map((b) => `[[${b.target}]] in ${b.from}`).join(", ")})`
      : "broken links: none",
  );
  lines.push(
    w.unknownCitations.length
      ? `unknown citations: ${w.unknownCitations.length} (${w.unknownCitations
          .map((u) => `[src:${u.id}] in ${u.from}`)
          .join(", ")})`
      : "unknown citations: none",
  );
  return lines;
}
