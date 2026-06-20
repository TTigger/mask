# mask — SPEC

Companion to `PRD.md`. Describes mask's technical architecture and contracts. Traditional Chinese: `zh-TW/SPEC.md`.

## 1. Architecture overview

Core principle: **borrowed intelligence.** The framework itself calls no LLM; every step that needs intelligence (intent, scope resolution, extraction) runs inside the user's own subscribed agent. The framework is a purely deterministic toolset: ingest + produce files + compile to each agent's native format.

Layers (top to bottom):

```
source: anything (blog / YT / article / web / code / GitHub)
  v  ingestion (yt-dlp / git clone / fetch+readability / pdf) — pure tools
  v  extraction (recipe runs inside the user's agent) — borrowed intelligence, the only smart layer
  v  persona store (Markdown + JSON + Git) — your local mask library
  v  adapters / compile (canonical -> native formats) — pure tools
  v  target agent (Claude Code / Codex / Cursor / Gemini)
```

**Two-tier interface**: natural language to humans; CLI + tools to the agent. The repo's orchestrator turns the agent into the operator, and the agent calls the CLI behind the scenes.

## 2. Execution model

- **In-agent extraction is the spine.** The agent the user has open does all intelligent work in the same conversation, including extraction (reading and writing files). -> zero API key + agent-agnostic.
- **The CLI is the agent's deterministic toolbox**, zero LLM: `ingest`, `reduce`, `compile`, `registry`/state.
- **`reduce` is the bridge that makes in-agent extraction viable.** A whole channel won't fit in context; the CLI first shrinks the raw material (sampling, dedup, salience, structural extraction) into a compact digest that fits, and the agent extracts only from that digest.
- **v1 extraction is always single-source-bounded**: one concrete source -> one mask, no blending, no big batch. Broad requests go through PRD section 7.2 then distill one source at a time.
- **Deferred (not v1)**: headless map-reduce (`claude -p` / `gemini -p` / `codex exec`) as an opt-in "scale mode" behind the same recipe contract.

## 3. mask file format (spec-as-data)

### 3.1 Library separate from framework

- `~/.mask/` is **your mask library**, its own git repo (the framework runs `git init` on first contact).
- The cloned **framework repo** is just the tool; `git pull` to update without touching your masks.

### 3.2 Library layout

```
~/.mask/
  config.json                 # default agent, settings
  _active                     # sticky default mask (slug)
  _registry.json              # roster of all masks
  fireship/                   # one mask (slug)
    mask.md                   # frontmatter(meta) + body(voice profile) — the heart
    knowledge/
      index.md                # topic -> file map, for agent grep navigation
      <topic>.md              # knowledge chunks, each tagged [src:...]
    examples.md               # few-shot: how this voice answers
    sources.json              # provenance: source URLs/IDs, fetch date, sampling, hashes
```

### 3.3 `mask.md`

One file, both human-editable and machine-readable. Frontmatter = meta; body = the voice profile (six sections):

```markdown
---
name: Fireship
slug: fireship
type: voice          # voice | code(future) | ...
source_kind: blog    # blog | youtube | repo | ...
created: 2026-06-18
version: 1
tags: [webdev, opinionated, fast-paced]
---

# Identity
Answer in the voice of Fireship... (one anchoring paragraph)

## Voice & tone
Concrete: rhythm, sentence length, diction, humor, emphasis, signature phrases.

## Stances / recurring takes
Opinions they reliably hold; mental models they reuse.

## Vocabulary & verbal tics
Signature phrases, jargon, catchphrases.

## Boundaries / what they would not say
Anti-patterns; must not fabricate beyond knowledge.

## How to answer
Directives for the agent wearing it: take first then justify, stay punchy, cite [src:...].
```

### 3.4 Knowledge: referenced, not inlined

When a mask is worn, the compiler only embeds `mask.md` (identity + voice + how-to-answer) into the adapter; `knowledge/` stays on disk and the agent fetches it via file read / grep. This is embedding-free, agent-native RAG, and keeps context lean.

## 4. Provenance & citation chain

`[src:id]` runs end to end:

```
source -> ingest -> reduce(samples with stable ids) -> recipe cites id -> knowledge [src:id] -> sources.json maps id->original
```

`mask.md`'s "How to answer" requires: style is free, but factual claims must trace to a knowledge chunk, otherwise say it's speculation. Hallucination is bounded here.

## 5. Extraction recipe

A multi-pass procedure shipped in the repo; the agent follows it on the reduced digest, **checkpointing each pass to disk** (resumable, inspectable):

1. **Pass 1 - voice analysis** — read the digest, extract observable voice features, **each backed by an evidence sample**.
2. **Pass 2 - profile synthesis** — write the `mask.md` six sections; descriptors must be actionable (another agent could reproduce the voice from them alone).
3. **Pass 3 - knowledge extraction** — substantive takes/claims/frameworks into `knowledge/*`, each tagged `[src:id]`; build `index.md`.
4. **Pass 4 - examples** — 2-4 "Q -> answer in this voice" samples into `examples.md`.
5. **Pass 5 - faithfulness self-check** — verify against the digest; flag over-claims / missing evidence / untraceable claims.

Principles: evidence-first; voice != summary; actionable descriptors; coverage honesty (thin digest -> declare limits and "voice unknown" range).

**One shared voice recipe**, fed by per-source ingest+reduce that normalize into a common digest. Adding a source ~= adding one ingest+reduce; the recipe doesn't change.

## 6. Ingestion & reduce

- **ingest (per source)**: blog -> fetch + `@mozilla/readability`; youtube -> yt-dlp transcripts (Phase 1); repo -> git clone + structural extraction (Phase 2). Outputs normalized samples.
- **reduce**: dedup, sampling (large sources: top-viewed / most-recent N), salience, structural extraction -> digest.
- **digest format**: a set of samples with stable ids (`{ id, src_ref, text }`); the recipe cites by id, threading the citation chain.

## 7. Adapter / compiler layer

**Shared compile core -> per-agent renderer**: `mask.md` normalizes into an intermediate "persona unit" (identity + voice + how-to-answer + knowledge path + examples path); each adapter renders it natively.

Two distinct config artifacts: **orchestrator instructions** (teach the agent to be the operator, installed once) vs **compiled masks** (the personas, installed on `wear`).

### 7.1 Claude Code (subagent, personas coexist)

Each mask compiles to `~/.claude/agents/<slug>.md` (global by default, follows you across projects):

```markdown
---
name: fireship
description: Answers webdev/frontend questions in Fireship's voice; fast, punchy, opinionated
---
Answer in the voice of Fireship.
[Identity / Voice / Stances / Vocabulary / Boundaries / How to answer — from mask.md]

## Knowledge
Your knowledge base is at ~/.mask/fireship/knowledge/. Grep/read it before stating
facts; tag claims [src:...]; if unsupported, say it's speculation. Match examples.md.
```

All masks coexist and are addressable; `_active` is the sticky default, routed by the `CLAUDE.md` orchestrator block:

```markdown
<!-- mask:orchestrator -->
If no mask is named -> delegate to the active default (read ~/.mask/_active).
"wear X / answer as X" -> update _active; "ask X: ..." -> one-off delegate to X.
<!-- /mask:orchestrator -->
```

### 7.2 AGENTS.md (single context, active-swap)

`wear` rewrites a marked managed block in `AGENTS.md` (project root), touching only its own block:

```markdown
<!-- mask:active fireship -->
You are currently wearing Fireship.
[Identity / Voice / ... from mask.md]
Knowledge: ~/.mask/fireship/knowledge/ (read, tag [src:...]; if unsupported, say speculation)
<!-- /mask:active -->
```

Switching = rewriting that block to another mask; single-active by nature.

### 7.3 Managed artifacts

All compiled outputs are **framework-owned, marked** artifacts; `unwear` / removal cleans them up without polluting the user's own config. Install location: Claude Code global by default, AGENTS.md at project root; both configurable.

## 8. CLI surface (the agent's hands)

| Command | Purpose |
|---|---|
| `mask init` | Init `~/.mask/` library, detect agent, install orchestrator |
| `mask ingest <src>` | Ingest per source -> normalized samples |
| `mask reduce` | dedup/sample/salience -> digest |
| `mask compile <slug>` | mask.md -> persona unit -> current agent's native file |
| `mask wear <slug>` | Set active (subagent routing / swap block) |
| `mask list` | Roster (name/source/description/last-used/active) |
| `mask status` | Who is worn now |
| `mask unwear` / `mask remove <slug>` | Clean up managed artifacts / remove a mask |

`mask add <src>` is the high-level collaboration flow for the agent (ingest -> prompt the agent to run the recipe -> write to library), mostly orchestrator-driven.

## 9. Stack & distribution

- **Language**: TypeScript (kept Node-compatible).
- **Runtime / packaging**: Bun. `bun build --compile` produces a self-contained cross-platform single executable (including `bun-windows-x64`), single-digit-ms startup, no external deps.
- **Distribution, three ways**: download the binary (non-JS users) / `bunx`, `npx` (already on Node) / clone source (contributors).
- **License**: MIT.
- **Phase 0 minimal deps**: `gray-matter` (frontmatter), `@mozilla/readability` + `jsdom` (blog), a CLI framework (commander-like), `simple-git`. yt-dlp / git clone added with later sources.

## 10. Repo structure (framework, separate from `~/.mask/`)

```
mask/
  README.md  package.json  LICENSE  CLAUDE.md  assets/mask-icon.svg
  src/                    # CLI (TS, zero LLM)
    cli.ts
    commands/             # ingest . reduce . compile . wear . list . status ...
    lib/                  # library(registry/active/git) . digest(samples+id)
  ingest/                 # per-source: blog(P0) . youtube . repo
  recipes/                # extraction recipes: voice/RECIPE.md(P0) . code/
  adapters/               # claude-code/(orchestrator+subagent) . agents-md/
  templates/              # mask.md / knowledge skeletons
  docs/                   # PRD.md . SPEC.md . PHASES.md (+ zh-TW/)
```

## 11. Safety / boundaries

- **Copyright / ToS**: mask is a personal, local tool; users distill content **for their own use**; no redistributable persona marketplace. Risk stays on the user side; the framework stays neutral.
- **Coverage honesty**: a mask declares its evidence range and "voice unknown" boundaries.
- **Hallucination control**: creation-side (Pass 5 faithfulness check) + answer-side ([src:] citation contract), double-gated.
