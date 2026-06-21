import type { Command } from "commander";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { readConfig } from "../lib/config.ts";
import { readJson, samplesPath, type SamplesFile } from "../lib/digest.ts";
import { chunkSamples, runMap, defaultRunner, runnerForAgent, RUNNER_ARGV } from "../lib/scale.ts";

interface ScaleOpts {
  runner?: string;
  maxChars?: string;
}

async function scale(dir: string, opts: ScaleOpts): Promise<void> {
  const inPath = samplesPath(dir);
  if (!existsSync(inPath)) {
    console.error(`mask scale: no samples.json in ${dir} (run \`mask ingest\` first).`);
    process.exitCode = 1;
    return;
  }

  const { samples } = await readJson<SamplesFile>(inPath);
  const chunks = chunkSamples(samples, opts.maxChars ? Number(opts.maxChars) : undefined);
  if (chunks.length <= 1) {
    console.log(`mask: ${samples.length} sample(s) fit one context — use the normal recipe on the digest; scale mode isn't needed.`);
    return;
  }

  const runnerName = opts.runner ?? runnerForAgent((await readConfig()).agent);
  if (!RUNNER_ARGV[runnerName]) {
    console.error(`mask scale: unknown runner "${runnerName}" (one of: ${Object.keys(RUNNER_ARGV).join(", ")}).`);
    process.exitCode = 1;
    return;
  }

  // Opt-in exception to the zero-LLM rule: this shells out to your own agent CLI.
  console.log(`mask scale: mapping ${samples.length} sample(s) in ${chunks.length} chunk(s) via \`${RUNNER_ARGV[runnerName]!.join(" ")}\` (borrowed compute — no API key).`);

  const runner = defaultRunner(runnerName);
  let partials: string[];
  try {
    partials = await runMap(chunks, runner, (done, total) => console.log(`  mapped ${done}/${total}`));
  } catch (err) {
    console.error(`mask scale: ${err instanceof Error ? err.message : String(err)} — is \`${RUNNER_ARGV[runnerName]![0]}\` installed and on PATH?`);
    process.exitCode = 1;
    return;
  }

  const partialsDir = join(dir, "partials");
  await mkdir(partialsDir, { recursive: true });
  for (let i = 0; i < partials.length; i++) {
    await writeFile(join(partialsDir, `chunk-${i + 1}.md`), partials[i]!);
  }

  console.log(`mask: wrote ${partials.length} partial(s) -> ${partialsDir}`);
  console.log(`next: reduce the partials in-session per the recipe into ~/.mask/<slug>/, then mask compile <slug>`);
}

export function registerScale(program: Command): void {
  program
    .command("scale")
    .argument("<dir>", "staging dir with samples.json (a corpus too large for one context)")
    .option("--runner <name>", `headless agent CLI (${Object.keys(RUNNER_ARGV).join(" | ")})`)
    .option("-m, --max-chars <n>", "per-chunk character budget")
    .description("Opt-in: map-reduce a large corpus via your own headless agent CLI")
    .action(scale);
}
