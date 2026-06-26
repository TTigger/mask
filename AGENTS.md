# mask — Development guide (for agents working in THIS repo)

> Canonical dev guide. Every coding agent reads this: Codex, Cursor, Gemini, Windsurf, Zed, … read `AGENTS.md` natively; `CLAUDE.md` imports it via `@AGENTS.md`. Single source of truth — edit here, not in copies. (mask itself preaches the AGENTS.md standard, so the repo practices it.)

This is the **mask framework** repo (the tool) — not a user's mask library (`~/.mask/`).

## What this project is
Distill any source (blog / YouTube / GitHub repo / PDF) into a switchable persona that runs inside the user's own agent. The CLI is a deterministic toolbox; the "intelligence" is borrowed from the user's agent following a Markdown recipe. Full design lives in `docs/`: read `PRD.md` -> `SPEC.md` -> `PHASES.md`.

## Hard rules
- **The CLI calls no LLM.** Everything under `src/` is deterministic (ingest, reduce, compile, git). All "intelligence" is borrowed from the user's agent — never call a model API or key here. The one sanctioned exception is `mask scale`, which shells out to the user's *own* headless agent CLI (`claude -p` / `gemini -p` / `codex exec`) — still no API key in our code.
- **Spec-as-data.** A mask is plain files (Markdown + JSON + Git), human-readable and hand-editable.
- **Framework and library are separate.** This repo never stores a user's *working* masks; those live in `~/.mask/`. The sole exception is `examples/` — a small curated reference pack (still evidence-bound) that `mask try <name>` copies into the user's library.
- **Add an agent via an adapter, add a source via an ingest module, the recipe stays put.** The three layers are independent.
- **Evidence-bound output.** Distilled claims trace to a source sample `[src:id]` → `sources.json`; thin coverage is declared, never hidden.

## Stack
TypeScript (kept Node-compatible) + Bun. Tests use the built-in `bun test`. Build: `bun run build` (single executable; cross-platform targets in `package.json` `build:all`).

## Layout
- `src/` — CLI (`commands/` + `lib/`)
- `ingest/` — per-source ingestion (`blog`, `youtube`, `repo`, `pdf`); each uses an injectable fetcher/provider so tests run offline
- `recipes/` — extraction recipes (procedures the agent follows, **not code**): `voice`, `code`, `blend`
- `adapters/` — per-agent renderers + orchestrator templates. Two adapters: `claude-code` (subagents) and `agents-md` (the universal `AGENTS.md` that 30+ tools read)
- `templates/` — skeletons for distilled output
- `examples/` — curated, evidence-bound reference masks shipped with the framework; `mask try <name>` installs one. Resolved via `frameworkRoot()`, like recipes/templates.
- `site/` — the static landing page (deployed to GitHub Pages)
- `docs/` — PRD / SPEC / PHASES (English; `docs/zh-TW/` for Traditional Chinese)

## Working in this repo
- **One minimal, verifiable commit per change.** Keep the tree green between commits.
- **Before committing, run:** `bun run typecheck` (tsc --noEmit) and `bun test`. For anything touching the compiled binary or embedded assets, also `bun run build`.
- **Determinism:** no `Date.now()` / `Math.random()` where output must be reproducible; hash and diff by content.
- **External tools are injectable.** New ingest modules take a fetcher/provider/extractor param defaulting to the real tool (git/yt-dlp/pdftotext), with a fake in tests — never require the real tool to run the suite.
- **Subprocesses:** route every spawn through `src/lib/proc.ts runCapture` (drains stdout+stderr, checks exit) and pass user paths after `--` to avoid argument injection.
- **The phase roadmap in `docs/PHASES.md` is complete (Phase 0–3).** New work is feature/fix-driven; still follow its discipline (exit criteria, dogfood, coverage honesty).
