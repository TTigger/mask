# mask — Development guide (for agents working in THIS repo)

This is the **mask framework** repo (the tool) — not a user's mask library (`~/.mask/`).

## What this project is
Distill any source into a switchable persona that runs inside the user's own agent. Full design and spec live in `docs/`: read `PRD.md` -> `SPEC.md` -> `PHASES.md`.

## Hard rules
- **The CLI calls no LLM.** Everything under `src/` is deterministic (ingest, reduce, compile, git). All "intelligence" is borrowed from the user's agent — never call a model API or key here.
- **Spec-as-data.** A mask is plain files (Markdown + JSON + Git), human-readable and hand-editable.
- **Framework and library are separate.** This repo never stores a user's masks; those live in `~/.mask/`.
- **Add an agent via an adapter, add a source via an ingest module, the recipe stays put.** The three layers are independent.

## Stack
TypeScript (kept Node-compatible) + Bun. Build: `bun run build` (single executable; cross-platform targets in `package.json` `build:all`).

## Layout
- `src/` — CLI (`commands/` + `lib/`)
- `ingest/` — per-source ingestion (blog -> youtube -> repo)
- `recipes/` — extraction recipes (procedures the agent follows, **not code**)
- `adapters/` — per-agent renderers + orchestrator templates (claude-code, agents-md…)
- `templates/` — skeletons for distilled output
- `docs/` — PRD / SPEC / PHASES (English; `docs/zh-TW/` for Traditional Chinese)

## How to proceed
Follow `docs/PHASES.md`. Start at Phase 0, task 0.1, implement task by task, and verify each against its exit criteria. Make one minimal, verifiable commit per task.
