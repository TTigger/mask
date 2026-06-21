import type { Sample, SamplesFile } from "./digest.ts";

/**
 * Explicit blended masks (Phase 3.4) — a single voice-neutral knowledge mask
 * synthesized from *multiple* sources (opt-in; the default is one source = one
 * mask). Merging namespaces each source's sample ids (`1.b1`, `2.r3`) so every
 * citation still resolves to a specific source, and the blend is clearly its own
 * source_kind so the recipe/compile treat it as knowledge-first and labeled.
 */
export interface BlendPart {
  source: string;
  samples: Sample[];
}

export function mergeBlended(parts: BlendPart[]): SamplesFile {
  const samples: Sample[] = [];
  parts.forEach((part, i) => {
    const ns = i + 1; // 1-based source namespace
    for (const s of part.samples) {
      samples.push({ ...s, id: `${ns}.${s.id}`, src_ref: { ...s.src_ref } });
    }
  });
  return { source_kind: "blend", samples };
}
