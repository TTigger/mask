import { expect, test } from "bun:test";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ingestRepo, isRepoSource } from "../ingest/repo/index.ts";

async function fixtureRepo(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "mask-repo-fix-"));
  await writeFile(join(dir, "README.md"), "# Cool Lib\n\nA library that does cool things.");
  await writeFile(join(dir, "package.json"), `{ "name": "cool-lib", "type": "module" }`);
  await writeFile(join(dir, "package-lock.json"), `{ "lockfileVersion": 3 }`); // must be skipped
  await mkdir(join(dir, "src"), { recursive: true });
  await writeFile(join(dir, "src", "index.ts"), "export const greet = () => 'hi';");
  await writeFile(join(dir, "src", "util.ts"), "export const add = (a:number,b:number)=>a+b;");
  await mkdir(join(dir, "node_modules", "dep"), { recursive: true }); // must be ignored
  await writeFile(join(dir, "node_modules", "dep", "index.js"), "module.exports = 1;");
  return dir;
}

test("isRepoSource recognizes git URLs and local dirs, rejects blogs/handles", () => {
  expect(isRepoSource("https://github.com/user/repo")).toBe(true);
  expect(isRepoSource("git@github.com:user/repo.git")).toBe(true);
  expect(isRepoSource("https://example.com/blog.git")).toBe(true);
  expect(isRepoSource("https://overreacted.io/rss.xml")).toBe(false);
  expect(isRepoSource("@fireship")).toBe(false);
  expect(isRepoSource("/no/such/path/here")).toBe(false);
});

test("ingestRepo extracts README, tree, config, and source files with stable ids", async () => {
  const dir = await fixtureRepo();
  const samples = await ingestRepo({ source: dir });

  expect(samples[0]!.id).toBe("r1");
  expect(samples[0]!.src_ref.title).toMatch(/README/i);
  expect(samples[0]!.text).toContain("does cool things");

  const tree = samples.find((s) => s.src_ref.title === "(tree)")!;
  expect(tree.text).toContain("src/");
  expect(tree.text).toContain("index.ts");

  const titles = samples.map((s) => s.src_ref.title);
  expect(titles).toContain("package.json");
  expect(titles.some((t) => t?.endsWith("index.ts"))).toBe(true);
  expect(titles.some((t) => t?.endsWith("util.ts"))).toBe(true);
});

test("ingestRepo ignores node_modules and lockfiles", async () => {
  const dir = await fixtureRepo();
  const samples = await ingestRepo({ source: dir });
  const titles = samples.map((s) => s.src_ref.title ?? "");

  expect(titles.some((t) => t.includes("node_modules"))).toBe(false);
  expect(titles).not.toContain("package-lock.json");
  // ids stay sequential with no gaps
  expect(samples.map((s) => s.id)).toEqual(samples.map((_, i) => `r${i + 1}`));
});

test("limit caps the number of sampled source files", async () => {
  const dir = await fixtureRepo();
  const samples = await ingestRepo({ source: dir, limit: 1 });
  const sourceFiles = samples.filter((s) => /\.ts$/.test(s.src_ref.title ?? ""));
  expect(sourceFiles).toHaveLength(1);
});
