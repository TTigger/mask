import type { Command } from "commander";
import { ingestBlog } from "../../ingest/blog/index.ts";
import { ingestYoutube } from "../../ingest/youtube/index.ts";
import { ingestRepo, isRepoSource } from "../../ingest/repo/index.ts";
import {
  prepareWorkDir,
  stagingKey,
  samplesPath,
  writeJson,
  type Sample,
  type SamplesFile,
} from "../lib/digest.ts";

type SourceKind = "youtube" | "repo" | "blog";

interface IngestOpts {
  name?: string;
  limit?: string;
}

/** Pick the ingester from the source: repo vs. YouTube vs. blog (default). */
function detectSourceKind(src: string): SourceKind {
  if (/(?:^|\/\/)(?:www\.)?(?:youtube\.com|youtu\.be)\b/i.test(src)) return "youtube";
  if (/^@[\w.-]+$/.test(src)) return "youtube"; // bare @handle
  if (isRepoSource(src)) return "repo";
  return "blog";
}

const NOUN: Record<SourceKind, string> = {
  youtube: "transcript(s)",
  repo: "file(s)",
  blog: "post(s)",
};

async function ingest(srcs: string[], opts: IngestOpts): Promise<void> {
  const limit = opts.limit ? Number(opts.limit) : undefined;
  const kind = detectSourceKind(srcs[0]!);

  let samples: Sample[];
  if (kind === "youtube") {
    samples = await ingestYoutube({ source: srcs[0]!, limit });
  } else if (kind === "repo") {
    samples = await ingestRepo({ source: srcs[0]!, limit });
  } else {
    samples = await ingestBlog({ urls: srcs, limit });
  }

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
