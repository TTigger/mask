import { expect, test } from "bun:test";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CLI = new URL("../src/cli.ts", import.meta.url).pathname;

interface Run {
  stdout: string;
  stderr: string;
  code: number;
}

async function setup(): Promise<{ home: string; agents: string; env: Record<string, string> }> {
  const home = await mkdtemp(join(tmpdir(), "mask-roster-"));
  const agents = await mkdtemp(join(tmpdir(), "mask-agents-"));
  const env = { MASK_HOME: home, MASK_AGENTS_DIR: agents, MASK_CLAUDE_MD: join(home, "CLAUDE.md") };

  const run = (args: string[]) => spawn(args, env);
  await run(["init"]);
  await mkdir(join(home, "dan", "knowledge"), { recursive: true });
  await writeFile(
    join(home, "dan", "mask.md"),
    `---\nname: Dan Abramov\nslug: dan\ntype: voice\nsource_kind: blog\n---\n\n# Identity\nAnswer in the voice of Dan Abramov.\n`,
  );
  await run(["compile", "dan"]);
  return { home, agents, env };
}

async function spawn(args: string[], env: Record<string, string>): Promise<Run> {
  const proc = Bun.spawn(["bun", CLI, ...args], {
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

test("wear → status → list mark the active mask; unwear clears it", async () => {
  const { env } = await setup();
  const run = (args: string[]) => spawn(args, env);

  let r = await run(["status"]);
  expect(r.stdout).toContain("No mask worn");

  r = await run(["wear", "dan"]);
  expect(r.code).toBe(0);
  expect(r.stdout).toContain("now wearing Dan Abramov");

  r = await run(["status"]);
  expect(r.stdout).toContain("Dan Abramov");
  expect(r.stdout).toContain("dan");

  r = await run(["list"]);
  expect(r.stdout).toContain("● dan"); // active marker
  expect(r.stdout).toContain("Dan Abramov");
  expect(r.stdout).toContain("last worn");

  r = await run(["unwear"]);
  expect(r.stdout).toContain("unwore dan");

  r = await run(["status"]);
  expect(r.stdout).toContain("No mask worn");
});

test("wear rejects an unknown mask", async () => {
  const { env } = await setup();
  const r = await spawn(["wear", "ghost"], env);
  expect(r.code).toBe(1);
  expect(r.stderr).toContain('no mask named "ghost"');
});

test("remove deletes the folder, the compiled subagent, and the roster entry", async () => {
  const { home, agents, env } = await setup();
  const run = (args: string[]) => spawn(args, env);

  await run(["wear", "dan"]);
  expect(existsSync(join(home, "dan", "mask.md"))).toBe(true);
  expect(existsSync(join(agents, "dan.md"))).toBe(true);

  const r = await run(["remove", "dan"]);
  expect(r.stdout).toContain("removed dan");
  expect(existsSync(join(home, "dan"))).toBe(false);
  expect(existsSync(join(agents, "dan.md"))).toBe(false);

  // active was cleared and the roster is empty
  expect((await run(["status"])).stdout).toContain("No mask worn");
  expect((await run(["list"])).stdout).toContain("No masks yet");
});
