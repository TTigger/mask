import type { Command } from "commander";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { libraryRoot, maskFile, maskSourcesPath } from "../lib/paths.ts";
import { commitAll } from "../lib/git.ts";
import { ingestSource } from "../lib/source.ts";
import {
  reduceSamples,
  buildSources,
  readJson,
  writeJson,
  prepareWorkDir,
  digestPath,
  samplesPath,
  sourcesPath,
  type SamplesFile,
  type SourcesFile,
} from "../lib/digest.ts";
import {
  diffSources,
  hasChanges,
  deltaSamples,
  summarizeDiff,
  bumpMaskVersion,
} from "../lib/redistill.ts";

interface RedistillOpts {
  limit?: string;
}

async function redistill(slug: string, srcs: string[], opts: RedistillOpts): Promise<void> {
  const mask = maskFile(slug);
  const sources = maskSourcesPath(slug);
  if (!existsSync(mask)) {
    console.error(`mask redistill: no mask at ${mask}.`);
    process.exitCode = 1;
    return;
  }
  if (!existsSync(sources)) {
    console.error(
      `mask redistill: ${slug} has no sources.json to diff against — distill it from scratch instead.`,
    );
    process.exitCode = 1;
    return;
  }

  const limit = opts.limit ? Number(opts.limit) : undefined;
  const { kind, samples } = await ingestSource(srcs, limit);
  if (samples.length === 0) {
    console.error(`mask redistill: re-ingest found no usable ${kind} content.`);
    process.exitCode = 1;
    return;
  }

  const fresh: SamplesFile = { source_kind: kind, samples };
  const old = await readJson<SourcesFile>(sources);
  const diff = diffSources(old, fresh);

  if (!hasChanges(diff)) {
    console.log(`mask: ${slug} is up to date — ${summarizeDiff(diff)}. No re-distillation needed.`);
    return;
  }

  // Stage the delta (added + changed) the agent must re-extract, the fresh full
  // samples, refreshed provenance to adopt after merging, and a diff report.
  const dir = await prepareWorkDir(`${slug}-redistill`);
  const delta = deltaSamples(diff);
  const deltaDigest = reduceSamples({ source_kind: kind, samples: delta });
  const fullDigest = reduceSamples(fresh);
  await writeJson(samplesPath(dir), fresh);
  await writeJson(digestPath(dir), deltaDigest);
  await writeJson(sourcesPath(dir), buildSources(fresh, fullDigest));
  await writeJson(`${dir}/diff.json`, {
    summary: summarizeDiff(diff),
    added: diff.added.map((s) => s.src_ref.url),
    changed: diff.changed.map((s) => s.src_ref.url),
    removed: diff.removed.map((s) => s.url),
  });

  // Bump the mask version (a library mutation — commit it).
  const bump = bumpMaskVersion(await readFile(mask, "utf8"));
  await writeFile(mask, bump.content);
  await commitAll(libraryRoot(), `mask: redistill ${slug} v${bump.to}`);

  console.log(`mask: redistill ${slug} — ${summarizeDiff(diff)}`);
  console.log(`  delta digest -> ${digestPath(dir)} (${delta.length} sample(s) to re-extract)`);
  console.log(`  refreshed provenance -> ${sourcesPath(dir)}`);
  if (diff.removed.length) console.log(`  prune ${diff.removed.length} removed source(s) from knowledge`);
  console.log(`  bumped ${slug} to version ${bump.to}`);
  console.log(`next: extract the delta per the recipe, merge into ~/.mask/${slug}/, then mask compile ${slug}`);
}

export function registerRedistill(program: Command): void {
  program
    .command("redistill")
    .argument("<slug>", "mask to update")
    .argument("<src...>", "the source(s) to re-ingest")
    .option("-l, --limit <n>", "max items to ingest")
    .description("Re-ingest a source and stage only what changed since last distillation")
    .action(redistill);
}
