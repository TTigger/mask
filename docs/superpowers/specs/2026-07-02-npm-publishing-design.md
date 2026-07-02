# npm/bunx publishing — design

**Date:** 2026-07-02
**Status:** approved (user confirmed: name `mask-cli`, approach B, `.git`-detection + `~/.mask/_framework` sync, token-based automated release, npm-first docs)
**Goal:** `npx mask-cli` / `bunx mask-cli` / `npm i -g mask-cli` all install a working `mask` command — the last install friction before launch. Today the only paths are clone + install.sh/install.ps1, which require Bun and a checkout.

## Non-goals

- Platform-specific compiled binaries on npm (esbuild/biome-style optionalDependencies) — over-engineering at this scale; `build:all` binaries remain a separate, unpublished artifact.
- Publishing to other registries (JSR, Homebrew) — later batches if ever.
- Auto-update / self-update logic in the CLI.
- Changing what `mask init` / `compile` produce — output files are byte-identical for clone users.

## Context that shaped the design

- The npm name `mask` is taken (an unrelated 2015-era browser library). `mask-cli` is free. Fallback if it is somehow grabbed before we publish: `@ttigger/mask-cli`.
- Bun-only API usage in the codebase is tiny: two `Bun.spawn` call sites (`src/lib/proc.ts`, `ingest/repo/index.ts`) plus the Bun text-loader imports in `src/lib/assets.ts` (which a bundling step inlines). "TypeScript kept Node-compatible" is already the stated stack rule.
- `mask init` and `mask compile` bake **absolute** recipe/template paths into the orchestrator (`src/adapters/common.ts` `{{recipe}}` etc.). `bunx`/`npx` run from an evictable cache, so baking cache paths silently breaks the orchestrator later. This is the real architectural problem of this batch, not the upload itself.
- `frameworkRoot()` currently resolves `import.meta.dir/../..` — correct for `src/lib/` in a checkout, wrong for a bundled `dist/cli.js` (one level deep, not two).

## Decision 1 — package identity

- npm name **`mask-cli`**; the installed command stays **`mask`** (`bin: { "mask": "./dist/cli.js" }`).
- Version bumps to **0.4.0** (Node compatibility + packaging is a real feature change). No user-facing surface shows the version (batch-2 rule); package.json is the only home.
- `files`: `dist/`, `recipes/`, `templates/`, `examples/` (+ README/LICENSE auto-included). `adapters/` is NOT shipped: its contents are embedded into the bundle at build time via `assets.ts`, nothing reads it from disk at runtime. `src/` is not shipped; `dist/cli.js` is the runtime.
- `engines`: `node >= 20`. The Bun engines entry goes away (Bun remains the dev toolchain, not a user requirement).

## Decision 2 — runtime: Node-compatible dist bundle (approach B)

One artifact serves npx, bunx, and global installs:

- **Port the two `Bun.spawn` sites to `node:child_process`.**
  - `src/lib/proc.ts runCapture` keeps its exact contract: drains stdout+stderr concurrently, checks exit code, same return shape — existing tests must pass unchanged. Bun runs `node:child_process` natively, so dev/test under Bun is unaffected.
  - `ingest/repo/index.ts`'s direct `Bun.spawn` git-clone call migrates onto `runCapture` (which the repo rules already require for every spawn) with the existing `--` argument-injection guard preserved.
- **Bundle at pack time:** `prepack` runs `bun build ./src/cli.ts --target=node --packages=external --outfile dist/cli.js`.
  - Text-loader imports in `assets.ts` are a *bundler* feature — they inline into the bundle regardless of target.
  - `--packages=external` keeps `jsdom`/`commander`/etc. as normal npm dependencies (jsdom does not bundle cleanly and doesn't need to).
  - The `package.json` version import inlines at build time; because the build runs at `prepack`, the published bundle always carries the published version.
  - `dist/` stays gitignored; it exists only inside the tarball.
- **Shebang `#!/usr/bin/env node`** on the bundle (npm/bun create platform shims on Windows automatically; bunx runs node-target JS fine).
- **`frameworkRoot()` becomes location-independent:** resolve the module's own directory via `import.meta.url` (Node-standard; do not rely on Bun's `import.meta.dir` surviving `--target=node`), then walk up until a directory containing `recipes/` is found. Works from `src/lib/` (dev, two levels) and from `dist/` (package, one level). `MASK_FRAMEWORK` env override stays first-priority.

## Decision 3 — recipe-path stability: `.git` detection + `~/.mask/_framework` sync

The orchestrator must never point into an evictable cache.

- **Clone mode** (the walked-up framework root contains `.git`): behavior unchanged — paths bake to the checkout, `git pull` live-updates recipes. install.sh/install.ps1 users and this repo's dev flow are untouched.
- **Package mode** (no `.git` — global node_modules, npx/bunx cache, or a compiled binary next to nothing): `mask init` and `mask compile` first call a new `ensureFrameworkAssets()` which syncs `recipes/` + `templates/` from the package into **`~/.mask/_framework/`** (underscore-namespaced like `_registry.json` / `_active`), and the path getters (`recipePath()` etc.) resolve against `~/.mask/_framework` instead of the package dir. Baked paths survive cache eviction and package upgrades; re-running `mask init` after an upgrade re-syncs (init is already idempotent).
  - Sync is deterministic: write a file only when content differs (no timestamps, no `Date.now()`); a `_framework/.source` marker records the package version for debuggability.
  - Pure path getters never write; only `ensureFrameworkAssets()` does, and only init/compile call it (they are the two commands that emit paths into orchestrator/subagent files). If assets are missing because init never ran, the existing `existsSync(recipePath())` warning in init covers it; that warning's "set MASK_FRAMEWORK" wording updates to mention re-running `mask init`.
  - `examples/` is not synced: `mask try` reads it from the package dir at invocation time and copies into the library — no path is baked, so eviction can't hurt it.
- This narrows the compiled-binary wart in `framework.ts` rather than fixing it: the binary's walk-up cannot see assets shipped next to the executable, so it degrades to the (now honest) missing-assets warning, and `MASK_FRAMEWORK` remains the manual override.

## Decision 4 — release flow

- New **`.github/workflows/release.yml`**: triggers on tag push `v*` and `workflow_dispatch`. Steps: checkout → bun install → `bun run typecheck` + `bun test` → `npm publish --provenance --access public` (prepack builds `dist/` inside publish). Auth via `NODE_AUTH_TOKEN` from the repo secret **`NPM_TOKEN`**.
- No third-party actions beyond `actions/checkout` / `actions/setup-node` / `oven-sh/setup-bun` (same supply-chain posture as demo.yml).
- **User manual steps (one-time, documented in the plan and the final report):**
  1. npmjs.com → profile → Access Tokens → *Generate New Token* → **Granular**, scope: *Read and write* on packages, expiry per preference.
  2. GitHub repo → Settings → Secrets and variables → Actions → *New repository secret* → name `NPM_TOKEN`, paste the token.
  3. First and every publish thereafter: push a `v0.4.0`-style tag (or run the workflow manually) — no local publish needed.
- The version tag is created by the user or by us on request; the workflow never bumps versions itself (deterministic, no surprise publishes).

## Decision 5 — docs sync

npm becomes the headline install; clone becomes the contributor path.

- `README.md` / `README.zh-TW.md` quickstart: lead with `npm i -g mask-cli` (or `bun add -g mask-cli`) → `mask init`; show `bunx mask-cli init` as the try-it-once line; move clone + install.sh/install.ps1 down as the from-source/dev path.
- `site/index.html` quickstart block: same reordering (keep the Windows PowerShell token line for the from-source path).
- Sweep for other `install.sh` mentions in user-facing docs and align them.

## Testing & verification

- Existing `bun test` suite must stay green — the `proc.ts` port is covered by existing runCapture/command tests (Windows nested-subprocess flake remains non-blocking; Linux CI authoritative).
- New unit coverage: `frameworkRoot()` walk-up (dev depth vs dist depth via a temp fixture) and `ensureFrameworkAssets()` sync (fresh copy, no-op when identical, refresh when content differs) — pure fs, no subprocess.
- **CI Node-smoke job** (the point of approach B): on ubuntu + windows, `bun install` → build `dist/cli.js` → with Bun *not* on PATH for the run steps, `node dist/cli.js --version`, then `mask init` + `mask try <example>` against a temp `HOME`/`USERPROFILE`, asserting the orchestrator's baked paths exist under `~/.mask/_framework`.
- `npm pack --dry-run` in CI: assert the tarball contains `dist/cli.js`, `recipes/`, `templates/`, `examples/` and does NOT contain `src/`, `site/`, `docs/`, `demo/`, `assets/`.
- Dogfood before tagging: `npm pack` locally, install the tarball globally in a scratch prefix, run the quickstart end-to-end.

## Risks / verify-during-implementation

- `bun build --target=node` semantics for `import.meta` — mitigated by switching `framework.ts` to `import.meta.url` + walk-up before bundling; the Node-smoke job proves it.
- npm name squatting between now and publish — fallback name `@ttigger/mask-cli` (user-approved).
- jsdom as a runtime dependency makes `npx mask-cli` downloads noticeably heavier; acceptable now, revisit only if it becomes a complaint (lazy-import is a later optimization, not this batch).
