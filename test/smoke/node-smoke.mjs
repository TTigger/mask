// test/smoke/node-smoke.mjs — end-to-end smoke of the published npm package,
// executed with plain Node (no Bun at runtime): pack → install the tarball →
// --version → init (package mode: _framework sync + baked paths) → try.
// Run: node test/smoke/node-smoke.mjs
import { execSync, execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const pkgVersion = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8")).version;
const work = mkdtempSync(join(tmpdir(), "mask-smoke-"));

const fail = (msg) => {
  console.error(`SMOKE FAIL: ${msg}`);
  process.exit(1);
};
const ok = (msg) => console.log(`smoke: ${msg}`);

// 1. pack (npm's prepack lifecycle runs bun run build:dist → fresh dist/cli.js)
execSync(`npm pack --pack-destination "${work}"`, { cwd: repoRoot, stdio: "inherit" });
const tgz = readdirSync(work).find((f) => f.endsWith(".tgz"));
if (!tgz) fail("npm pack produced no tarball");

// 2. install the tarball into an isolated prefix (what `npm i -g mask-cli` does)
const prefix = join(work, "prefix");
execSync(`npm install --prefix "${prefix}" "${join(work, tgz)}"`, { stdio: "inherit" });
const pkgDir = join(prefix, "node_modules", "mask-cli");

// 3. tarball contents: runtime + framework assets in, sources out
for (const p of [
  ["dist", "cli.js"],
  ["recipes", "voice", "RECIPE.md"],
  ["recipes", "code", "RECIPE.md"],
  ["recipes", "blend", "RECIPE.md"],
  ["templates"],
  ["examples", "micrograd", "mask.md"],
])
  if (!existsSync(join(pkgDir, ...p))) fail(`missing from package: ${p.join("/")}`);
for (const p of ["src", "site", "docs", "demo", "assets", "adapters", "test", "ingest"])
  if (existsSync(join(pkgDir, p))) fail(`should not ship in package: ${p}`);
ok("tarball contents correct");

const cli = join(pkgDir, "dist", "cli.js");
const maskHome = join(work, "maskhome");
const proj = join(work, "proj");
mkdirSync(proj, { recursive: true });
const env = { ...process.env, MASK_HOME: maskHome };

// 4. plain Node runs the CLI
const version = execFileSync(process.execPath, [cli, "--version"], { env }).toString().trim();
if (version !== pkgVersion) fail(`--version printed "${version}", expected "${pkgVersion}"`);
ok(`node runs the CLI (v${version})`);

// 5. init in package mode (the installed package has no .git) must sync assets
//    into MASK_HOME/_framework and bake THOSE paths into the orchestrator.
execFileSync(process.execPath, [cli, "init", "--agent", "agents-md", "--out", proj], {
  env,
  cwd: proj, // any AGENTS.md writes must land in the project, never the repo
  stdio: "inherit",
});
if (!existsSync(join(maskHome, "_framework", "recipes", "voice", "RECIPE.md")))
  fail("init did not sync recipes into _framework");
if (!existsSync(join(maskHome, "_framework", "templates")))
  fail("init did not sync templates into _framework");
const agentsMd = readFileSync(join(proj, "AGENTS.md"), "utf8");
if (!agentsMd.includes(join(maskHome, "_framework")))
  fail("AGENTS.md does not point at the synced _framework path");
if (agentsMd.includes(pkgDir))
  fail("AGENTS.md points into the evictable install dir — paths must be stable");
ok("init synced _framework and baked stable paths");

// 6. `mask try` reads examples/ from the package and copies into the library
execFileSync(process.execPath, [cli, "try", "micrograd"], { env, cwd: proj, stdio: "inherit" });
if (!existsSync(join(maskHome, "micrograd", "mask.md"))) fail("try micrograd did not install the example");
ok("try micrograd works");

rmSync(work, { recursive: true, force: true });
console.log("SMOKE OK");
