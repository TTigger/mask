import type { Command } from "commander";
import { ingestSource, type SourceKind } from "../lib/source.ts";
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
}

const NOUN: Record<SourceKind, string> = {
  youtube: "transcript(s)",
  repo: "file(s)",
  blog: "post(s)",
};

async function ingest(srcs: string[], opts: IngestOpts): Promise<void> {
  const limit = opts.limit ? Number(opts.limit) : undefined;
  const { kind, samples } = await ingestSource(srcs, limit);

  if (samples.length === 0) {
    console.error(`mask ingest: no usable ${kind} content found at the given source(s).`);
    process.exitCode = 1;
    return;
  }

  const key = stagingKey(opts.name ?? srcs[0]!);
  const dir = await prepareWorkDir(key);
  const file: SamplesFile = { source_kind: kind, samples };
  await writeJson(samplesPath(dir), file);

  console.log(`mask: ingested ${samples.length} ${NOUN[kind]} -> ${samplesPath(dir)}`);
  console.log(`next: mask reduce ${dir}`);
}

export function registerIngest(program: Command): void {
  program
    .command("ingest")
    .argument("<src...>", "blog URL(s) or an RSS/Atom feed URL")
    .option("-n, --name <name>", "name for this distillation (sets the staging key)")
    .option("-l, --limit <n>", "max posts to ingest")
    .description("Ingest a source into normalized samples")
    .action(ingest);
}
