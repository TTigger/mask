# Contributing to mask

Thanks for helping out! mask is small, deterministic, and agent-native — contributions that keep it that way are easy to land.

> The full developer guide lives in **[AGENTS.md](AGENTS.md)** (read by Claude Code, Codex, Cursor, Gemini, …). This page is the short version; AGENTS.md is the source of truth.

## Dev setup

Requires [Bun](https://bun.sh).

```sh
git clone https://github.com/TTigger/mask && cd mask
bun install
bun run dev <command>   # run the CLI straight from the clone, e.g. `bun run dev list`
```

## Before you open a PR

Run the same three checks CI runs (see `.github/workflows/ci.yml`):

```sh
bun run typecheck   # tsc --noEmit
bun test            # the deterministic-core suite
bun run build       # single executable — needed for anything touching the binary / embedded assets
```

Keep the tree green between commits.

## House rules (the short list)

- **The CLI calls no LLM.** Everything under `src/` is deterministic; the "intelligence" is borrowed from the user's agent following a recipe. The only sanctioned exception is `mask scale` (shells out to the user's *own* headless agent CLI). Never add a model API or key.
- **Framework ≠ library.** This repo is the tool; a user's masks live in `~/.mask/`. Don't store masks here.
- **External tools are injectable.** New ingest modules take a fetcher/provider/extractor that defaults to the real tool (git / yt-dlp / pdftotext) with a fake in tests — the suite must run offline. Prefer extracting pure helpers and unit-testing those (see `parseVtt`, `pickSubtitleLang`).
- **Evidence-bound output.** Distilled claims trace to a source sample `[src:id]`; thin coverage is declared, not hidden.
- **Add an agent** via an adapter, **add a source** via an ingest module — the recipe stays put. The three layers are independent.

## Commits & PRs

- One minimal, verifiable change per commit.
- Conventional-commit messages, e.g. `fix(youtube): …`, `feat(ingest): …`, `docs: …`.
- Keep the PR focused; fill in the PR template checklist.

## Reporting bugs / proposing features

Open an issue using the templates. For ingest bugs, include the source kind (blog / YouTube / repo / PDF) and, if relevant, the URL or a minimal repro.
