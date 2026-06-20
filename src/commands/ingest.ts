import type { Command } from "commander";
import { ingestBlog } from "../../ingest/blog/index.ts";
import { ingestYoutube } from "../../ingest/youtube/index.ts";
import {
  prepareWorkDir,
  stagingKey,
  samplesPath,
  writeJson,
  type Sample,
  type SamplesFile,
} from "../lib/digest.ts";

interface IngestOpts {
  name?: string;
  limit?: string;
}

/** Pick the ingester from the source: YouTube hosts/handles vs. everything else. */
function detectSourceKind(src: string): "youtube" | "blog" {
  if (/(?:^|\/\/)(?:www\.)?(?:youtube\.com|youtu\.be)\b/i.test(src)) return "youtube";
  if (/^@[\w.-]+$/.test(src)) return "youtube"; // bare @handle
  return "blog";
}

async function ingest(srcs: string[], opts: IngestOpts): Promise<void> {
  const limit = opts.limit ? Number(opts.limit) : undefined;
  const kind = detectSourceKind(srcs[0]!);

  let samples: Sample[];
  if (kind === "youtube") {
    samples = await ingestYoutube({ source: srcs[0]!, limit });
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

  const noun = kind === "youtube" ? "transcript(s)" : "post(s)";
  console.log(`mask: ingested ${samples.length} ${noun} -> ${samplesPath(dir)}`);
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
