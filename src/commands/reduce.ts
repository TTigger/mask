import type { Command } from "commander";
import { existsSync } from "node:fs";
import { numOpt } from "../lib/opts.ts";
import {
  reduceSamples,
  buildSources,
  readJson,
  writeJson,
  samplesPath,
  digestPath,
  sourcesPath,
  type SamplesFile,
} from "../lib/digest.ts";

interface ReduceOpts {
  maxChars?: string;
}

async function reduce(dir: string, opts: ReduceOpts): Promise<void> {
  const inPath = samplesPath(dir);
  if (!existsSync(inPath)) {
    console.error(`mask reduce: no samples.json in ${dir} (run \`mask ingest\` first).`);
    process.exitCode = 1;
    return;
  }

  const samples = await readJson<SamplesFile>(inPath);
  const digest = reduceSamples(samples, {
    maxChars: numOpt(opts.maxChars, "--max-chars"),
  });

  const sources = buildSources(samples, digest);
  await writeJson(digestPath(dir), digest);
  await writeJson(sourcesPath(dir), sources);

  const { n_input, n_kept } = digest.meta;
  console.log(`mask: reduced ${n_input} -> ${n_kept} sample(s) -> ${digestPath(dir)}`);
  console.log(`mask: wrote provenance for ${sources.sources.length} source(s) -> ${sourcesPath(dir)}`);
  for (const note of digest.meta.notes) console.log(`  · ${note}`);
}

export function registerReduce(program: Command): void {
  program
    .command("reduce")
    .argument("<dir>", "staging dir produced by `mask ingest`")
    .option("-m, --max-chars <n>", "total character budget for the digest")
    .description("Reduce samples into a compact digest")
    .action(reduce);
}
