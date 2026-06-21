import matter from "gray-matter";
import { hashText, type Sample, type SamplesFile, type SourcesFile, type SourceRecord } from "./digest.ts";

/**
 * Re-distillation (Phase 3.3): compare a fresh ingest against the mask's stored
 * provenance to find what actually changed, so the agent re-extracts only the
 * delta instead of redoing the whole source. Samples are matched by source URL
 * (ids are positional per-ingest); content is compared by hash.
 */
export interface SourceDiff {
  added: Sample[]; // a URL not in the old provenance
  changed: Sample[]; // same URL, different content hash
  removed: SourceRecord[]; // a URL gone from the fresh ingest
  unchanged: number;
}

export function diffSources(old: SourcesFile, fresh: SamplesFile): SourceDiff {
  const oldByUrl = new Map(old.sources.map((s) => [s.url, s]));
  const freshUrls = new Set(fresh.samples.map((s) => s.src_ref.url));

  const added: Sample[] = [];
  const changed: Sample[] = [];
  let unchanged = 0;
  for (const s of fresh.samples) {
    const prev = oldByUrl.get(s.src_ref.url);
    if (!prev) added.push(s);
    else if (prev.hash !== hashText(s.text)) changed.push(s);
    else unchanged++;
  }
  const removed = old.sources.filter((s) => !freshUrls.has(s.url));
  return { added, changed, removed, unchanged };
}

export function hasChanges(diff: SourceDiff): boolean {
  return diff.added.length > 0 || diff.changed.length > 0 || diff.removed.length > 0;
}

/** The added + changed samples, the only ones the agent needs to (re-)extract. */
export function deltaSamples(diff: SourceDiff): Sample[] {
  return [...diff.added, ...diff.changed];
}

export interface VersionBump {
  content: string;
  from: number;
  to: number;
}

/** Increment a mask.md's frontmatter `version` (default 1 → 2), preserving the body. */
export function bumpMaskVersion(maskMd: string): VersionBump {
  const { data, content } = matter(maskMd);
  const from = typeof data.version === "number" ? data.version : 1;
  const to = from + 1;
  const next = matter.stringify(content, { ...data, version: to });
  return { content: next, from, to };
}

/** One-line human summary of a diff. */
export function summarizeDiff(diff: SourceDiff): string {
  return `+${diff.added.length} new, ~${diff.changed.length} changed, -${diff.removed.length} removed, ${diff.unchanged} unchanged`;
}
