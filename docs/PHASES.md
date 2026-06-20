# mask — PHASES

Each phase ships something usable. Phase 0 = a demoable MVP. Traditional Chinese: `zh-TW/PHASES.md`.

## Phase 0 — Prove the whole loop (MVP)

**Goal**: on Claude Code, with a blog source, get `talk -> distill -> wear -> answer` working end-to-end, zero API key.

**Tasks**

- **0.1** Project scaffold: Bun + TS setup, `package.json`, CLI entry (`src/cli.ts`), commander wiring.
- **0.2** Library init: `mask init` -> create `~/.mask/`, `git init`, `config.json`, `_registry.json`, `_active`.
- **0.3** library lib: registry read/write, active pointer, auto git commit on change.
- **0.4** Claude Code orchestrator: `adapters/claude-code/orchestrator.md` template + install into `CLAUDE.md` managed block; define NL intent routing (add / wear / list / status).
- **0.5** blog ingest: `ingest/blog/` — fetch + `@mozilla/readability` -> normalized samples (multiple posts).
- **0.6** reduce: dedup / sampling / salience -> digest.
- **0.7** digest format (`{ id, src_ref, text }`) + write `sources.json` provenance.
- **0.8** voice recipe: `recipes/voice/RECIPE.md` (five passes) + `templates/` (mask.md / knowledge skeletons).
- **0.9** compile: `mask.md -> persona unit -> Claude Code subagent` renderer (`adapters/claude-code/`).
- **0.10** wear / list / status: sticky active; triggered by NL via the orchestrator.
- **0.11** End-to-end wiring + dogfood: distill a blog -> wear -> ask -> verify voice + `[src:]`.
- **0.12** README / install (`bun build --compile` binary + bunx path) + basic tests.

**Exit criteria**

- `mask add <blog> -> wear -> ask` works end-to-end on Claude Code, no API key.
- The produced mask is a human-readable, editable folder.
- Switching is one sentence and takes effect next turn.
- Factual claims carry `[src:]`, traceable to `sources.json`.

## Phase 1 — Prove portability + hero source

**Goal**: a second agent + YouTube, satisfying the PRD ">= 2 agents" criterion.

- **1.1** Converge the persona-unit abstraction (extract the shared core out of 0.9's Claude-Code-specific parts).
- **1.2** AGENTS.md adapter: orchestrator + active-swap managed block + clean install/update/remove.
- **1.3** YouTube ingest: `ingest/youtube/` — yt-dlp transcripts, denoise, normalize to samples.
- **1.4** reduce hardening: large-channel sampling, transcript noise cleanup.
- **1.5** Reuse the same voice recipe to validate noisy extraction; tune the recipe against blog results.

**Exit**: one mask compiles to both Claude Code and AGENTS.md; a YouTube-distilled mask has a recognizable voice.

## Phase 2 — Second flavor + multi-source

**Goal**: code expert (knowledge-first) and multi-mask resolution.

- **2.1** A `type: code` mask variant + `recipes/code/` (conventions/idioms first, not voice).
- **2.2** repo ingest: `ingest/repo/` — git clone, file tree, lint rules, README, conventions.
- **2.3** Scope protocol producing multiple single-source masks (one request -> several masks).
- **2.4** (optional) Cursor (`.cursor/rules`) and Gemini (`GEMINI.md`) adapters.

**Exit**: can distill a usable "code expert for repo X"; a broad request resolves into several masks.

## Phase 3 — Scale mode + polish

**Goal**: very large corpora and long-tail sources; quality and ops polish.

- **3.1** Headless "scale mode" opt-in: `claude -p` / `gemini -p` / `codex exec` map-reduce over huge corpora, behind the same recipe contract.
- **3.2** book / PDF sources (with copyright-boundary prompts).
- **3.3** Mask versioning / re-distillation (source update -> diff -> incremental update).
- **3.4** Explicit blended knowledge masks (multi-source, voice-neutralized, clearly labeled).
- **3.5** Coverage-honesty reporting, roster UX, statusline polish.

**Exit**: can handle a source too large for a single context; existing masks can be re-distilled.

## Next

Once Phase 0 is locked, the first implementation artifact is `CLAUDE.md` (the orchestrator) — it turns the agent into the mask operator and is the entry point to the whole conversation-first experience.
