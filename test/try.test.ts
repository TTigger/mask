import { expect, test } from "bun:test";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// fileURLToPath (not .pathname) so the path is valid on Windows too —
// .pathname yields a leading-slash "/C:/..." that breaks Bun.spawn.
const CLI = fileURLToPath(new URL("../src/cli.ts", import.meta.url));

interface Run {
  stdout: string;
  stderr: string;
  code: number;
}

async function spawn(args: string[], env: Record<string, string>): Promise<Run> {
  const proc = Bun.spawn(["bun", CLI, ...args], { env: { ...process.env, ...env }, stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { stdout, stderr, code };
}

/** A throwaway framework dir holding examples/sage, pointed at via MASK_FRAMEWORK. */
async function setup(): Promise<{ home: string; agents: string; env: Record<string, string> }> {
  const home = await mkdtemp(join(tmpdir(), "mask-try-home-"));
  const agents = await mkdtemp(join(tmpdir(), "mask-try-agents-"));
  const fw = await mkdtemp(join(tmpdir(), "mask-try-fw-"));

  const ex = join(fw, "examples", "sage", "knowledge");
  await mkdir(ex, { recursive: true });
  await writeFile(
    join(fw, "examples", "sage", "mask.md"),
    `---\nname: Sage\nslug: sage\ntype: voice\nsource_kind: blog\n---\n\n# Identity\nAnswer in the voice of Sage.\n`,
  );
  await writeFile(join(fw, "examples", "sage", "knowledge", "index.md"), "- wisdom -> wisdom.md\n");
  // a checkpoint that must NOT be copied
  await mkdir(join(fw, "examples", "sage", "_work"), { recursive: true });
  await writeFile(join(fw, "examples", "sage", "_work", "scratch.md"), "scratch\n");

  const env = {
    MASK_HOME: home,
    MASK_AGENTS_DIR: agents,
    MASK_CLAUDE_MD: join(home, "CLAUDE.md"),
    MASK_FRAMEWORK: fw,
  };
  await spawn(["init"], env);
  return { home, agents, env };
}

test("mask try copies a curated example into the library, compiled and wearable", async () => {
  const { home, agents, env } = await setup();
  const run = (args: string[]) => spawn(args, env);

  const r = await run(["try", "sage"]);
  expect(r.code).toBe(0);
  expect(r.stdout).toContain("copied example sage");

  expect(existsSync(join(home, "sage", "mask.md"))).toBe(true);
  expect(existsSync(join(home, "sage", "knowledge", "index.md"))).toBe(true);
  expect(existsSync(join(home, "sage", "_work"))).toBe(false); // filter excluded checkpoints
  expect(existsSync(join(agents, "sage.md"))).toBe(true); // compiled

  expect((await run(["list"])).stdout).toContain("Sage");
});

test("mask try guards overwrite and unknown names", async () => {
  const { env } = await setup();
  const run = (args: string[]) => spawn(args, env);

  expect((await run(["try", "sage"])).code).toBe(0);

  const dup = await run(["try", "sage"]);
  expect(dup.code).toBe(1);
  expect(dup.stderr).toContain("already exists");

  expect((await run(["try", "sage", "--force"])).code).toBe(0);

  const missing = await run(["try", "ghost"]);
  expect(missing.code).toBe(1);
  expect(missing.stderr).toContain('no example named "ghost"');
});
