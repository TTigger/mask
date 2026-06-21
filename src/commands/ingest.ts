import type { Command } from "commander";
import { ingestSource, type SourceKind } from "../lib/source.ts";
import { mergeBlended } from "../lib/blend.ts";
import { numOpt } from "../lib/opts.ts";
import {
  prepareWorkDir,
  stagingKey,
  samplesPath,
  writeJson,
  type SamplesFile,
} from "../lib/digest.ts";

interface IngestOpts {
  name?: string;
  limit?: string;
  blend?: boolean;
}

const NOUN: Record<SourceKind, string> = {
  youtube: "transcript(s)",
  repo: "file(s)",
  book: "page(s)",
  blog: "post(s)",
};

const COPYRIGHT_NOTE =
  "⚠ copyright: distill voice and ideas, not verbatim text — respect the source's license and fair use; the recipe extracts a persona, not a copy.";

/** Ingest each source independently and merge into one voice-neutral blend. */
async function ingestBlend(srcs: string[], limit: number | undefined): Promise<SamplesFile | null> {
  if (srcs.length < 2) {
    console.error("mask ingest --blend: give two or more sources to blend.");
    process.exitCode = 1;
    return null;
  }
  const parts = [];
  for (const src of srcs) {
    const { kind, samples } = await ingestSource([src], limit);
    if (kind === "book") console.log(COPYRIGHT_NOTE);
    if (samples.length === 0) console.warn(`  (skipped ${src}: no usable content)`);
    else parts.push({ source: src, samples });
  }
  if (parts.length < 2) {
    console.error("mask ingest --blend: fewer than two sources yielded content.");
    process.exitCode = 1;
    return null;
  }
  console.log(`mask: blending ${parts.length} source(s), voice-neutralized.`);
  return mergeBlended(parts);
}

async function ingest(srcs: string[], opts: IngestOpts): Promise<void> {
  const limit = numOpt(opts.limit, "--limit");

  let file: SamplesFile;
  let noun: string;
  if (opts.blend) {
    const blended = await ingestBlend(srcs, limit);
    if (!blended) return;
    file = blended;
    noun = "blended sample(s)";
  } else {
    const { kind, samples } = await ingestSource(srcs, limit);
    if (kind === "book") console.log(COPYRIGHT_NOTE);
    if (samples.length === 0) {
      console.error(`mask ingest: no usable ${kind} content found at the given source(s).`);
      process.exitCode = 1;
      return;
    }
    file = { source_kind: kind, samples };
    noun = NOUN[kind];
  }

  const key = stagingKey(opts.name ?? srcs[0]!);
  const dir = await prepareWorkDir(key);
  await writeJson(samplesPath(dir), file);

  console.log(`mask: ingested ${file.samples.length} ${noun} -> ${samplesPath(dir)}`);
  console.log(`next: mask reduce ${dir}`);
}

export function registerIngest(program: Command): void {
  program
    .command("ingest")
    .argument("<src...>", "source URL(s): blog/feed, YouTube, a repo, or a PDF")
    .option("-n, --name <name>", "name for this distillation (sets the staging key)")
    .option("-l, --limit <n>", "max items to ingest")
    .option("--blend", "blend multiple sources into one voice-neutral knowledge mask")
    .description("Ingest a source into normalized samples")
    .action(ingest);
}
