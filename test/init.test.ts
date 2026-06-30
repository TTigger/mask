import { expect, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
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

/** Run the CLI with an isolated MASK_HOME and a chosen cwd. */
async function run(args: string[], env: Record<string, string>, cwd?: string): Promise<Run> {
  const proc = Bun.spawn(["bun", CLI, ...args], {
    cwd,
    env: { ...process.env, ...env },
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  return { stdout, stderr, code };
}

async function freshHome(): Promise<string> {
  return mkdtemp(join(tmpdir(), "mask-init-"));
}

test("init --agent agents-md --out <dir> installs AGENTS.md there, prints the absolute path, no warning", async () => {
  const home = await freshHome();
  const out = await freshHome();
  const r = await run(["init", "--agent", "agents-md", "--out", out], { MASK_HOME: home });

  expect(r.code).toBe(0);
  expect(existsSync(join(out, "AGENTS.md"))).toBe(true);
  // printed path is absolute and points at the chosen dir (matches the CLI's resolve())
  expect(r.stdout).toContain(join(out, "AGENTS.md"));
  expect(`${r.stdout}${r.stderr}`).not.toContain("framework repo");
});

test("init warns when the AGENTS.md lands inside the mask framework repo", async () => {
  const home = await freshHome();
  // Point the framework root at a temp dir and install into it, so the footgun
  // fires without writing an AGENTS.md into the real repo working tree.
  const fw = await freshHome();
  const r = await run(["init", "--agent", "agents-md", "--out", fw], { MASK_HOME: home, MASK_FRAMEWORK: fw });
  expect(r.stderr).toContain("framework repo");
  expect(r.stderr).toContain("--out");
});

test("a removed agent id is rejected with the supported list", async () => {
  const home = await freshHome();
  const r = await run(["init", "--agent", "gemini"], { MASK_HOME: home });
  expect(r.code).not.toBe(0);
  expect(r.stderr).toContain('unknown agent "gemini"');
  expect(r.stderr).toContain("claude-code, agents-md");
});
