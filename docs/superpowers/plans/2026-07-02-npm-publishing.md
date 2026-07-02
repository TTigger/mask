# npm/bunx Publishing (mask-cli) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish the CLI to npm as **`mask-cli`** (installed command stays `mask`) so `npx mask-cli` / `bunx mask-cli` / `npm i -g mask-cli` all work on plain Node — the last install friction before launch.

**Architecture:** Port the two Bun-only spawn sites to `node:child_process`, bundle `src/cli.ts` into a Node-target `dist/cli.js` at `prepack` (Bun text-loader assets inline; deps stay external), and make baked recipe/template paths survive cache eviction: when the CLI runs from a package (no `.git` at the framework root), `mask init` syncs `recipes/` + `templates/` into `~/.mask/_framework/` and bakes those stable paths. A tag-triggered release workflow publishes with the user's `NPM_TOKEN`.

**Tech Stack:** TypeScript + Bun (dev toolchain), `bun build --target=node` (bundler), npm lifecycle (`prepack`), GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-07-02-npm-publishing-design.md`

## Global Constraints

- Before every commit: `bun run typecheck` and `bun test` must pass. `test/roster.test.ts` (also init/try) may flake on Windows — pre-existing Bun nested-subprocess bug; Linux CI is authoritative, do not chase it.
- **The CLI calls no LLM** (hard rule). Nothing here changes that.
- Determinism: no `Date.now()` / `Math.random()` in sync logic; compare and copy by content.
- All spawns go through `src/lib/proc.ts runCapture`; user-controlled values are passed after `--` where the tool supports it. Never add `shell: true`.
- npm package name: exactly `mask-cli` (fallback ONLY if taken at publish time: `@ttigger/mask-cli`). Bin name: exactly `mask`. Version: `0.4.0`. `engines.node >= 20`.
- Package `files`: `dist`, `recipes`, `templates`, `examples` — never `src`, `site`, `docs`, `demo`, `assets`, `adapters` (adapter templates are embedded via `src/lib/assets.ts` at build time).
- No user-facing surface shows a version number (batch-2 rule); package.json is the only home.
- Workflows: first-party actions only (`actions/*`, `oven-sh/setup-bun`), same supply-chain posture as `demo.yml`.
- One minimal, verifiable commit per task; keep the tree green between commits.

---

### Task 1: Port `runCapture` to `node:child_process`; route the repo cloner through it

**Files:**
- Modify: `src/lib/proc.ts`
- Modify: `ingest/repo/index.ts` (the `defaultCloner` at lines 92–102)
- Create: `test/proc.test.ts`

**Interfaces:**
- Produces: `runCapture(argv: string[]): Promise<string>` — signature and behavior contract UNCHANGED (drains stdout+stderr concurrently, resolves with stdout, throws `` `${argv[0]} exited ${code}` `` on non-zero exit). Callers in `ingest/youtube`, `ingest/pdf`, `src/lib/scale.ts` must not need edits.

- [ ] **Step 1: Write the failing test**

Create `test/proc.test.ts`. `process.execPath` is the running runtime (bun under `bun test`, node under Node), and both support `-e`, so the test is runtime-agnostic and offline:

```ts
import { describe, expect, test } from "bun:test";
import { runCapture } from "../src/lib/proc.ts";

describe("runCapture", () => {
  test("returns stdout and drains a large stderr without deadlock", async () => {
    // 1 MiB on BOTH streams — an undrained pipe would fill the OS buffer and hang.
    const script =
      'const big = "x".repeat(1 << 20); process.stdout.write(big); process.stderr.write(big);';
    const out = await runCapture([process.execPath, "-e", script]);
    expect(out.length).toBe(1 << 20);
  });

  test("throws with the argv[0] and exit code on non-zero exit", async () => {
    await expect(runCapture([process.execPath, "-e", "process.exit(3)"])).rejects.toThrow(
      `${process.execPath} exited 3`,
    );
  });

  test("rejects when the executable does not exist", async () => {
    await expect(runCapture(["mask-definitely-not-a-real-tool-xyz"])).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run it — it must pass against the CURRENT Bun implementation first**

Run: `bun test test/proc.test.ts`
Expected: 2 of 3 PASS; the "does not exist" test may pass or fail under `Bun.spawn` (Bun throws synchronously). If anything fails, adjust ONLY the third test's expectation to "rejects or throws" — the first two lock the contract we must preserve.

- [ ] **Step 3: Replace the implementation with `node:child_process`**

Replace the whole body of `src/lib/proc.ts`:

```ts
import { spawn } from "node:child_process";

/**
 * Spawn `argv`, drain stdout AND stderr concurrently (an unread piped stream can
 * fill its OS buffer and deadlock the child), and return stdout; throws on a
 * non-zero exit. Shared by the yt-dlp / pdftotext / git / headless-agent call
 * sites. node:child_process (not Bun.spawn) so the npm-published bundle runs on
 * plain Node; Bun executes node:child_process natively, so dev is unaffected.
 */
export function runCapture(argv: string[]): Promise<string> {
  const [cmd, ...args] = argv;
  return new Promise((resolvePromise, reject) => {
    // stdin "ignore" (Bun.spawn's old default) so a prompt-happy tool can't wait
    // on input. The explicit stdio tuple makes TS type the streams nullable —
    // they are always present for "pipe", hence the assertions.
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    child.stdout!.setEncoding("utf8");
    child.stdout!.on("data", (chunk: string) => (stdout += chunk));
    child.stderr!.resume(); // drain — an unread pipe fills the OS buffer and deadlocks the child
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolvePromise(stdout);
      else reject(new Error(`${cmd} exited ${code}`));
    });
  });
}
```

- [ ] **Step 4: Route `defaultCloner` through `runCapture`**

In `ingest/repo/index.ts`, add the import and replace `defaultCloner` (the repo rule already requires every spawn to go through `runCapture`; this was the one holdout):

```ts
import { runCapture } from "../../src/lib/proc.ts";
```

```ts
async function defaultCloner(source: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "mask-repo-"));
  // `--` ends options so a `-`-leading source can't be parsed as a git flag
  // (e.g. --upload-pack=...); runCapture drains both streams so a verbose
  // clone can't block.
  try {
    await runCapture(["git", "clone", "--depth", "1", "--", source, dir]);
  } catch {
    throw new Error(`git clone failed: ${source}`);
  }
  return dir;
}
```

Remove any now-unused `Bun.spawn` remnants. After this task, `grep -rn "Bun\." src ingest` must return NOTHING.

- [ ] **Step 5: Run the full gates**

Run: `bun test test/proc.test.ts && bun run typecheck && bun test`
Expected: all PASS (Windows roster/init/try flake excepted).

- [ ] **Step 6: Commit**

```bash
git add src/lib/proc.ts ingest/repo/index.ts test/proc.test.ts
git commit -m "lib: port runCapture to node:child_process; route repo cloner through it"
```

---

### Task 2: Location-independent `frameworkRoot()` + `effectiveAssetsRoot()`

**Files:**
- Modify: `src/lib/framework.ts` (full rewrite below)
- Create: `test/framework.test.ts`

**Interfaces:**
- Consumes: `libraryRoot()` from `src/lib/paths.ts` (`MASK_HOME` env override, else `~/.mask`).
- Produces:
  - `frameworkRoot(): string` — where the framework's shipped assets live (env `MASK_FRAMEWORK` → walk-up from the module's own directory to the first ancestor containing `recipes/voice/RECIPE.md` → legacy two-up fallback). Works from `src/lib/` (dev, two levels deep) AND from a bundled `dist/cli.js` (one level deep).
  - `effectiveAssetsRootFrom(root: string): string` — pure decision: `root` if it contains `.git` (clone mode — `git pull` live-updates recipes), else `join(libraryRoot(), "_framework")` (package mode — stable synced copy).
  - `effectiveAssetsRoot(): string` — `MASK_FRAMEWORK` if set, else `effectiveAssetsRootFrom(frameworkRoot())`.
  - `recipePath() / codeRecipePath() / blendRecipePath() / templatesDir()` — now based on `effectiveAssetsRoot()`.
  - `examplesDir()` — stays based on `frameworkRoot()` (examples are read from the package at `mask try` time and copied; no path is baked, so they are never synced).

- [ ] **Step 1: Write the failing test**

Create `test/framework.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  frameworkRoot,
  effectiveAssetsRoot,
  effectiveAssetsRootFrom,
  recipePath,
  examplesDir,
} from "../src/lib/framework.ts";

let tmp: string;
const saved = { MASK_FRAMEWORK: process.env.MASK_FRAMEWORK, MASK_HOME: process.env.MASK_HOME };

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "mask-fw-"));
  delete process.env.MASK_FRAMEWORK;
  process.env.MASK_HOME = join(tmp, "home");
});

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true });
  if (saved.MASK_FRAMEWORK === undefined) delete process.env.MASK_FRAMEWORK;
  else process.env.MASK_FRAMEWORK = saved.MASK_FRAMEWORK;
  if (saved.MASK_HOME === undefined) delete process.env.MASK_HOME;
  else process.env.MASK_HOME = saved.MASK_HOME;
});

describe("frameworkRoot", () => {
  test("walks up to the repo root (this checkout ships recipes/voice/RECIPE.md)", () => {
    expect(frameworkRoot()).toBe(resolve(import.meta.dir, ".."));
  });

  test("MASK_FRAMEWORK overrides, resolved", () => {
    process.env.MASK_FRAMEWORK = tmp;
    expect(frameworkRoot()).toBe(resolve(tmp));
  });
});

describe("effectiveAssetsRootFrom", () => {
  test("a checkout (.git present) is used in place", () => {
    mkdirSync(join(tmp, "repo", ".git"), { recursive: true });
    expect(effectiveAssetsRootFrom(join(tmp, "repo"))).toBe(join(tmp, "repo"));
  });

  test("a package (no .git) redirects to <library>/_framework", () => {
    mkdirSync(join(tmp, "pkg"), { recursive: true });
    expect(effectiveAssetsRootFrom(join(tmp, "pkg"))).toBe(join(tmp, "home", "_framework"));
  });
});

describe("path getters", () => {
  test("recipePath follows the effective root; in this checkout that's the repo", () => {
    expect(recipePath()).toBe(join(resolve(import.meta.dir, ".."), "recipes", "voice", "RECIPE.md"));
  });

  test("examplesDir always reads from the framework (package) root", () => {
    expect(examplesDir()).toBe(join(resolve(import.meta.dir, ".."), "examples"));
  });

  test("MASK_FRAMEWORK forces both roots", () => {
    process.env.MASK_FRAMEWORK = tmp;
    expect(effectiveAssetsRoot()).toBe(resolve(tmp));
    expect(recipePath()).toBe(join(resolve(tmp), "recipes", "voice", "RECIPE.md"));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/framework.test.ts`
Expected: FAIL — `effectiveAssetsRootFrom` / `effectiveAssetsRoot` are not exported yet.

- [ ] **Step 3: Rewrite `src/lib/framework.ts`**

```ts
import { dirname, join, resolve } from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { libraryRoot } from "./paths.ts";

/**
 * Where the framework's shipped assets (recipes/ templates/ examples/) live —
 * the tool, NOT the user's ~/.mask library. Resolved by walking up from this
 * module's own directory to the first ancestor that ships the voice recipe, so
 * it is correct from src/lib/ (dev checkout, two levels deep) AND from the
 * bundled dist/cli.js of the npm package (one level deep). MASK_FRAMEWORK
 * overrides everything (e.g. pointing a standalone compiled binary at a clone).
 */
export function frameworkRoot(): string {
  const env = process.env.MASK_FRAMEWORK;
  if (env) return resolve(env);
  const here = dirname(fileURLToPath(import.meta.url));
  let dir = here;
  while (true) {
    if (existsSync(join(dir, "recipes", "voice", "RECIPE.md"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return resolve(here, "..", ".."); // nothing found; init warns
    dir = parent;
  }
}

/**
 * Where baked recipe/template paths should POINT. A clone (`.git` present) is
 * used in place so `git pull` live-updates recipes; a package install (global
 * node_modules, npx/bunx cache — evictable, version-suffixed) redirects to the
 * stable per-user copy that `mask init` syncs into <library>/_framework.
 */
export function effectiveAssetsRootFrom(root: string): string {
  return existsSync(join(root, ".git")) ? root : join(libraryRoot(), "_framework");
}

export function effectiveAssetsRoot(): string {
  const env = process.env.MASK_FRAMEWORK;
  if (env) return resolve(env);
  return effectiveAssetsRootFrom(frameworkRoot());
}

export function frameworkFile(...parts: string[]): string {
  return join(frameworkRoot(), ...parts);
}

/** Absolute path to the voice recipe the agent follows on the digest. */
export function recipePath(): string {
  return join(effectiveAssetsRoot(), "recipes", "voice", "RECIPE.md");
}

/** Absolute path to the code recipe (conventions-first, for repo sources). */
export function codeRecipePath(): string {
  return join(effectiveAssetsRoot(), "recipes", "code", "RECIPE.md");
}

/** Absolute path to the blend recipe (voice-neutral multi-source synthesis). */
export function blendRecipePath(): string {
  return join(effectiveAssetsRoot(), "recipes", "blend", "RECIPE.md");
}

/** Absolute path to the skeleton dir (mask.md / knowledge index). */
export function templatesDir(): string {
  return join(effectiveAssetsRoot(), "templates");
}

/** Curated example-mask pack — read from the package at `try` time, never baked. */
export function examplesDir(): string {
  return frameworkFile("examples");
}
```

- [ ] **Step 4: Run tests + gates**

Run: `bun test test/framework.test.ts && bun run typecheck && bun test`
Expected: all PASS. (Existing init/orchestrator/try tests run inside this checkout, which has `.git`, so every baked path is unchanged — byte-identical output for clone users.)

- [ ] **Step 5: Commit**

```bash
git add src/lib/framework.ts test/framework.test.ts
git commit -m "lib: resolve framework assets by walk-up + clone/package mode split"
```

---

### Task 3: `ensureFrameworkAssets()` sync, wired into `mask init`

**Files:**
- Create: `src/lib/framework-sync.ts`
- Modify: `src/commands/init.ts` (call the sync before `installOrchestrator`; update the missing-assets warning at lines 74–81)
- Create: `test/framework-sync.test.ts`

**Interfaces:**
- Consumes: `frameworkRoot()`, `effectiveAssetsRoot()` from Task 2.
- Produces: `ensureFrameworkAssets(from?: string, to?: string): Promise<{ synced: boolean; written: number; root: string }>` — no-op (`synced: false`) when `from` and `to` resolve to the same directory (clone mode / MASK_FRAMEWORK); otherwise recursively copies `recipes/` + `templates/` from `from` into `to`, writing only files whose bytes differ, plus a `.source` marker. `written` counts files actually written; `root` is `to`.

- [ ] **Step 1: Write the failing test**

Create `test/framework-sync.test.ts`:

```ts
import { beforeEach, afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ensureFrameworkAssets } from "../src/lib/framework-sync.ts";

let tmp: string, from: string, to: string;

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "mask-sync-"));
  from = join(tmp, "pkg");
  to = join(tmp, "home", "_framework");
  mkdirSync(join(from, "recipes", "voice"), { recursive: true });
  mkdirSync(join(from, "templates"), { recursive: true });
  writeFileSync(join(from, "recipes", "voice", "RECIPE.md"), "# recipe v1\n");
  writeFileSync(join(from, "templates", "mask.md"), "# skeleton\n");
});

afterEach(() => rmSync(tmp, { recursive: true, force: true }));

describe("ensureFrameworkAssets", () => {
  test("no-op when from === to (clone mode)", async () => {
    const r = await ensureFrameworkAssets(from, from);
    expect(r.synced).toBe(false);
    expect(r.written).toBe(0);
  });

  test("fresh sync copies recipes + templates and writes the .source marker", async () => {
    const r = await ensureFrameworkAssets(from, to);
    expect(r.synced).toBe(true);
    expect(r.written).toBeGreaterThan(0);
    expect(readFileSync(join(to, "recipes", "voice", "RECIPE.md"), "utf8")).toBe("# recipe v1\n");
    expect(existsSync(join(to, "templates", "mask.md"))).toBe(true);
    expect(readFileSync(join(to, ".source"), "utf8")).toMatch(/^mask-cli /);
  });

  test("second run is a byte-compare no-op (written = 0)", async () => {
    await ensureFrameworkAssets(from, to);
    const r = await ensureFrameworkAssets(from, to);
    expect(r.synced).toBe(true);
    expect(r.written).toBe(0);
  });

  test("a changed source file is re-copied (upgrade refresh)", async () => {
    await ensureFrameworkAssets(from, to);
    writeFileSync(join(from, "recipes", "voice", "RECIPE.md"), "# recipe v2\n");
    const r = await ensureFrameworkAssets(from, to);
    expect(r.written).toBe(1);
    expect(readFileSync(join(to, "recipes", "voice", "RECIPE.md"), "utf8")).toBe("# recipe v2\n");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test test/framework-sync.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `src/lib/framework-sync.ts`**

```ts
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { frameworkRoot, effectiveAssetsRoot } from "./framework.ts";
import pkg from "../../package.json" with { type: "json" };

/** The asset dirs whose paths get baked into orchestrators (examples/ never is). */
const SYNC_DIRS = ["recipes", "templates"];

/** Write only when the bytes differ — deterministic, no timestamps. */
async function writeIfDiffers(dest: string, content: Buffer | string): Promise<number> {
  const next = Buffer.from(content);
  if (existsSync(dest) && next.equals(await readFile(dest))) return 0;
  await writeFile(dest, next);
  return 1;
}

async function syncDir(src: string, dest: string): Promise<number> {
  await mkdir(dest, { recursive: true });
  let written = 0;
  const entries = (await readdir(src, { withFileTypes: true })).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  for (const e of entries) {
    const s = join(src, e.name);
    const d = join(dest, e.name);
    if (e.isDirectory()) written += await syncDir(s, d);
    else if (e.isFile()) written += await writeIfDiffers(d, await readFile(s));
  }
  return written;
}

/**
 * Make the baked-path assets exist at the effective root. Clone mode (from ===
 * to) is a no-op — the checkout IS the asset root and `git pull` updates it.
 * Package mode copies recipes/ + templates/ into <library>/_framework so the
 * orchestrator's absolute paths survive npx/bunx cache eviction and package
 * upgrades; re-running `mask init` after an upgrade refreshes the copy.
 */
export async function ensureFrameworkAssets(
  from: string = frameworkRoot(),
  to: string = effectiveAssetsRoot(),
): Promise<{ synced: boolean; written: number; root: string }> {
  if (resolve(from) === resolve(to)) return { synced: false, written: 0, root: to };
  let written = 0;
  for (const dir of SYNC_DIRS) {
    if (!existsSync(join(from, dir))) continue; // broken install → init's recipe warning fires
    written += await syncDir(join(from, dir), join(to, dir));
  }
  await mkdir(to, { recursive: true });
  written += await writeIfDiffers(join(to, ".source"), `mask-cli ${pkg.version}\n`);
  return { synced: true, written, root: to };
}
```

Note the `.source` content embeds `pkg.version` (build-time constant after bundling) — deterministic, and the fourth test's `written = 1` stays exact because the marker is unchanged between runs of the same build.

- [ ] **Step 4: Wire into `src/commands/init.ts`**

Add imports:

```ts
import { ensureFrameworkAssets } from "../lib/framework-sync.ts";
```

Immediately BEFORE `const adapter = getAdapter(agent);` (currently line 58), insert:

```ts
  // Package mode (npm/bunx — no .git next to the assets): copy recipes/templates
  // into <library>/_framework so the paths baked below outlive the install cache.
  const assets = await ensureFrameworkAssets();
  if (assets.synced && assets.written > 0) {
    console.log(`mask: synced framework assets -> ${assets.root} (${assets.written} files)`);
  }
```

Replace the warning block at the end of `init` (the `if (!existsSync(recipePath())) { ... }` at lines 76–81) with:

```ts
  if (!existsSync(recipePath())) {
    console.warn(
      `mask: ⚠ framework assets not found at ${recipePath()} — the orchestrator points at a recipe path that doesn't exist.\n` +
        `  Re-run \`mask init\` from a healthy install, or set MASK_FRAMEWORK to a cloned mask repo and re-run \`mask init\`.`,
    );
  }
```

(Design note, recorded: the spec said init AND compile call the sync, but only `installOrchestrator` — reached solely from `init` — bakes asset paths; the compile templates contain no `{{recipe}}`/`{{templates}}` placeholders. Wiring it into `init` alone covers every baked path with no dead call.)

- [ ] **Step 5: Run tests + gates**

Run: `bun test test/framework-sync.test.ts && bun run typecheck && bun test`
Expected: all PASS (init tests run in the checkout → clone mode → sync is a no-op, output unchanged).

- [ ] **Step 6: Commit**

```bash
git add src/lib/framework-sync.ts src/commands/init.ts test/framework-sync.test.ts
git commit -m "init: sync recipes/templates into ~/.mask/_framework in package mode"
```

---

### Task 4: Package identity + Node-target `dist` build

**Files:**
- Modify: `package.json`
- Modify: `src/cli.ts` (remove the `#!/usr/bin/env bun` shebang line — nothing executes the file directly; the launcher scripts run `bun run .../cli.ts`, and the bundle gets its own node shebang via `--banner`, which must be the ONLY shebang in `dist/cli.js`)

**Interfaces:**
- Consumes: Tasks 1–3 (the bundle must contain no `Bun.*` API and the new path logic).
- Produces: `bun run build:dist` → `dist/cli.js` (Node-target bundle, node shebang, deps external); `prepack` runs it, so `npm pack`/`npm publish` always ship a fresh build. Task 5's smoke and Task 6's release depend on both.

- [ ] **Step 1: Edit `package.json`**

Apply exactly (unchanged keys — `type`, `license`, `dependencies`, `devDependencies` — stay as they are):

```json
{
  "name": "mask-cli",
  "version": "0.4.0",
  "description": "Distill anything. Wear anyone. — agent-native persona distillation framework.",
  "repository": { "type": "git", "url": "git+https://github.com/TTigger/mask.git" },
  "homepage": "https://github.com/TTigger/mask#readme",
  "bugs": "https://github.com/TTigger/mask/issues",
  "keywords": ["agent", "ai", "persona", "distillation", "claude-code", "agents-md", "cli"],
  "bin": { "mask": "./dist/cli.js" },
  "files": ["dist", "recipes", "templates", "examples"],
  "engines": { "node": ">=20" }
}
```

- The old `"engines": { "bun": ">=1.1.0" }` is REPLACED by the node floor (Bun stays the dev toolchain; users no longer need it).
- Before committing, check `site/index.html` for a canonical/og:url pointing at the GitHub Pages site; if one exists, use THAT as `homepage` instead of the `#readme` URL.
- In `scripts`, add two entries (keep `dev`, `typecheck`, `build`, `build:all`, `test` untouched):

```json
"build:dist": "bun build ./src/cli.ts --target=node --packages=external --banner \"#!/usr/bin/env node\" --outfile dist/cli.js",
"prepack": "bun run build:dist"
```

- [ ] **Step 2: Remove the shebang from `src/cli.ts`**

Delete line 1 (`#!/usr/bin/env bun`). The file must now start with `import { Command } from "commander";`.

- [ ] **Step 3: Build and verify the bundle**

Run: `bun run build:dist`
Expected: `dist/cli.js` created. Then verify:

```bash
head -c 60 dist/cli.js        # must start with EXACTLY "#!/usr/bin/env node" and no second shebang below it
grep -c "Bun\." dist/cli.js   # expect 0 (Task 1 removed the runtime uses; comments may mention Bun — if grep only hits comment text, that's fine; there must be no `Bun.spawn`/`Bun.file` call)
node dist/cli.js --version    # expect: 0.4.0
node dist/cli.js --help       # expect: command list, exit 0
```

If `--banner` is rejected by the installed bun version: remove it from the script and instead create `scripts/build-dist.mjs`:

```js
// scripts/build-dist.mjs — bundle for Node and prepend the node shebang
// (used because `bun build --banner` is unavailable in this bun version).
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

execSync("bun build ./src/cli.ts --target=node --packages=external --outfile dist/cli.js", {
  stdio: "inherit",
});
const bundled = readFileSync("dist/cli.js", "utf8");
writeFileSync("dist/cli.js", "#!/usr/bin/env node\n" + bundled.replace(/^#![^\n]*\n/, ""));
```

and set `"build:dist": "node scripts/build-dist.mjs"`. Re-run the verification block either way.

- [ ] **Step 4: Verify the tarball contents**

Run: `npm pack --dry-run`
Expected file list: `dist/cli.js`, everything under `recipes/`, `templates/`, `examples/`, plus `README.md`, `LICENSE`, `package.json` — and NO `src/`, `site/`, `docs/`, `demo/`, `assets/`, `adapters/`, `test/`, `ingest/`.

- [ ] **Step 5: Run gates**

Run: `bun run typecheck && bun test && bun run build`
Expected: all PASS (`bun run build` proves the compiled-binary path still builds after the shebang removal).

- [ ] **Step 6: Commit**

```bash
git add package.json src/cli.ts            # plus scripts/build-dist.mjs if the fallback was needed
git commit -m "package: publish as mask-cli 0.4.0 — Node-target dist bundle, bin mask"
```

---

### Task 5: Node-only end-to-end smoke (script + CI job)

**Files:**
- Create: `test/smoke/node-smoke.mjs`
- Modify: `.github/workflows/ci.yml` (add a `node-smoke` job)

**Interfaces:**
- Consumes: `bun run build:dist` via npm's `prepack` (Task 4); `mask init`'s `_framework` sync (Task 3).
- Produces: `node test/smoke/node-smoke.mjs` exits 0 ⇔ the real tarball, installed and run by plain Node, passes pack → contents → `--version` → `init` (package mode, `_framework` baked) → `try micrograd`. Task 6's release workflow reuses it as a publish gate.

- [ ] **Step 1: Write `test/smoke/node-smoke.mjs`**

`bun test` only collects `*.test.*`/`*.spec.*` files, so this `.mjs` script never runs in the unit suite — it is invoked explicitly, with plain Node, in CI:

```js
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
```

- [ ] **Step 2: Run it locally**

Run: `node test/smoke/node-smoke.mjs`
Expected: `SMOKE OK`, exit 0. (Requires git on PATH — the library auto-commits; `src/lib/git.ts ensureIdentity` already falls back to a local identity on bare machines.)

- [ ] **Step 3: Add the CI job**

Append to `.github/workflows/ci.yml` under `jobs:` (sibling of `check`):

```yaml
  # Proves the npm package runs on plain Node (no Bun at runtime), on both OSes:
  # pack → install tarball → --version → init (package mode) → try.
  node-smoke:
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4

      - name: Set up Bun (build toolchain for prepack)
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install (frozen lockfile)
        run: bun install --frozen-lockfile

      - name: Node smoke (pack -> install -> init -> try)
        run: node test/smoke/node-smoke.mjs
```

- [ ] **Step 4: Run gates**

Run: `bun run typecheck && bun test && node test/smoke/node-smoke.mjs`
Expected: all PASS + `SMOKE OK`.

- [ ] **Step 5: Commit**

```bash
git add test/smoke/node-smoke.mjs .github/workflows/ci.yml
git commit -m "ci: Node-only end-to-end smoke of the npm package (ubuntu + windows)"
```

---

### Task 6: Release workflow

**Files:**
- Create: `.github/workflows/release.yml`

**Interfaces:**
- Consumes: `NPM_TOKEN` repo secret (user manual step — the workflow must reference it, never contain a token); the smoke script from Task 5.
- Produces: pushing a `v*` tag (or manual dispatch) publishes `mask-cli` to npm with provenance.

- [ ] **Step 1: Write `.github/workflows/release.yml`**

```yaml
name: Release (npm)

on:
  push:
    tags: ["v*"]
  workflow_dispatch:

permissions:
  contents: read
  id-token: write # npm --provenance attests the build via GitHub OIDC

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Bun (build toolchain for prepack)
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Set up Node (wires NODE_AUTH_TOKEN into .npmrc)
        uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: https://registry.npmjs.org

      - name: Install (frozen lockfile)
        run: bun install --frozen-lockfile

      - name: Typecheck
        run: bun run typecheck

      - name: Test
        run: bun test

      - name: Node smoke (pack -> install -> init -> try)
        run: node test/smoke/node-smoke.mjs

      - name: Publish
        run: npm publish --provenance --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

- [ ] **Step 2: Validate the workflow file**

Run: `bun x yaml-lint .github/workflows/release.yml` if available; otherwise a quick parse check:
`node -e "const y=require('js-yaml');y.load(require('fs').readFileSync('.github/workflows/release.yml','utf8'));console.log('yaml ok')"`
Expected: no parse errors. (js-yaml is already in node_modules via gray-matter.)

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/release.yml
git commit -m "ci: tag-triggered npm release workflow (provenance, NPM_TOKEN)"
```

---

### Task 7: Docs — npm-first install everywhere

**Files:**
- Modify: `README.md` (the "Install & run" section, lines 69–88)
- Modify: `README.zh-TW.md` (the「安裝與使用」section, lines 67–86)
- Modify: `site/index.html` (Quickstart step 1, lines ~233–242)

The surrounding content (the `mask init` block, the "start a new agent session" note, the adapters table) stays untouched. No version numbers appear anywhere (batch-2 rule).

- [ ] **Step 1: README.md — replace the install intro**

Replace lines 71–79 (from `Requires [Bun](https://bun.sh).` through the `install.sh` explanation paragraph) with:

```markdown
```sh
npm i -g mask-cli        # or: bun add -g mask-cli
```

That's it — `mask` is on your PATH (Node ≥ 20; no Bun required). To try it without installing: `npx mask-cli init` (or `bunx mask-cli init`). Your masks live separately in `~/.mask/` (its own Git repo). Then, from any project:
```

And replace line 88 (the `(Prefer no installer? ...)` line) with:

```markdown
<details>
<summary><b>From source</b> (contributors — runs the CLI from a live checkout)</summary>

Requires [Bun](https://bun.sh).

```sh
git clone https://github.com/TTigger/mask && cd mask
./install.sh        # macOS/Linux — installs deps + puts a `mask` launcher on your PATH
# Windows (PowerShell):  .\install.ps1
```

The launcher runs the CLI from this checkout, so `git pull` updates it — no rebuild. (`bun run dev <command>` also works straight from the clone.)

</details>
```

- [ ] **Step 2: README.zh-TW.md — mirror the same change**

Replace lines 69–77 (from `需要 [Bun](https://bun.sh)。` through the launcher explanation paragraph) with:

```markdown
```sh
npm i -g mask-cli        # 或：bun add -g mask-cli
```

這樣就好 —— `mask` 已經在你的 PATH 上（Node ≥ 20；不需要 Bun）。想先試再裝：`npx mask-cli init`（或 `bunx mask-cli init`）。你的 mask 另外存在 `~/.mask/`（它自己的 Git repo）。接著在任何專案裡：
```

And replace line 86 (the `（不想用安裝腳本？...）` line) with:

```markdown
<details>
<summary><b>從原始碼安裝</b>（貢獻者 —— 直接跑 checkout 裡的 CLI）</summary>

需要 [Bun](https://bun.sh)。

```sh
git clone https://github.com/TTigger/mask && cd mask
./install.sh        # macOS/Linux — 裝相依 + 在 PATH 放一個 `mask` launcher
# Windows（PowerShell）：  .\install.ps1
```

launcher 直接從這份 checkout 跑 CLI，所以 `git pull` 就更新、不用重 build。（`bun run dev <command>` 也能直接從 clone 跑。）

</details>
```

- [ ] **Step 3: site/index.html — Quickstart step 1**

In the `#start` section: change the lead line (line 233) from
`Requires <a href="https://bun.sh">Bun</a>. The framework is a cloned repo; your masks live separately in <code>~/.mask/</code>.`
to
`Node ≥ 20 — no Bun required. Your masks live separately in <code>~/.mask/</code>.`

Replace step 1's heading/copy/codeblock (lines 238–241):

```html
          <h3>Install</h3>
          <p>One command from npm. Prefer to try first? <code>npx mask-cli init</code> works too.</p>
          <div class="codeblock"><button class="copy" aria-label="Copy"><svg><use href="#i-copy"/></svg></button><pre>npm i -g mask-cli     <span class="tok"># or: bun add -g mask-cli</span></pre></div>
```

- [ ] **Step 4: Verify the sweep is complete**

Run: `grep -rn "install\.sh\|install\.ps1\|git clone https://github.com/TTigger/mask" README.md README.zh-TW.md site/index.html`
Expected: hits ONLY inside the two new `<details>` from-source blocks (README ×2); none in site/index.html.

- [ ] **Step 5: Run gates + commit**

Run: `bun run typecheck && bun test`

```bash
git add README.md README.zh-TW.md site/index.html
git commit -m "docs+site: npm-first install (mask-cli); clone becomes the contributor path"
```

---

## Post-merge (controller + USER, not subagent tasks)

1. **USER one-time setup:** npmjs.com → avatar → *Access Tokens* → *Generate New Token* → **Granular Access Token**, permissions *Read and write* on Packages (all packages, or scope to `mask-cli` after first publish), pick an expiry → copy it. Then GitHub `TTigger/mask` → *Settings → Secrets and variables → Actions → New repository secret* → name `NPM_TOKEN`, paste.
2. **Publish 0.4.0:** create and push the tag — `git tag v0.4.0 && git push origin v0.4.0` — the release workflow runs gates + smoke, then publishes. Verify with `npm view mask-cli version` (expect `0.4.0`) and a clean-machine `npx mask-cli --version`.
3. If `mask-cli` turns out taken at publish time (squatted since 2026-07-02): rename to `@ttigger/mask-cli` in package.json + docs and re-tag (user-approved fallback).
4. After the publish succeeds: STOP — launch week is discussed with the user before any launch action (explicit instruction).

## As-built deviations

- `ensureFrameworkAssets` writes nothing (incl. no `.source` marker) when `from` ships neither `recipes/` nor `templates/` — a compiled binary degrades to the missing-assets warning instead of a misleading marker; spec's compiled-binary sentence softened accordingly.
