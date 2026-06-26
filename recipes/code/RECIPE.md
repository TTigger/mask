# Code Recipe — code-expert distillation procedure (v1)

> A procedure for the agent. You (the user's current agent) follow this to distill a reduced
> repo digest into a `type: code` mask — a knowledge-first expert on one codebase.
> The CLI does NOT do this step; this step IS the "borrowed intelligence".

## Input
- `digest`: samples from reduce, each `{ id, src_ref, text }`. For repos a sample is a README,
  the directory tree, a config/lint file, or a source file; `src_ref.title` is its path.
  `id` is the stable citation anchor.

## Output (written into `~/.mask/<slug>/`)
- `mask.md` (frontmatter `type: code` + the six-section conventions profile)
- `knowledge/*.md` + `knowledge/index.md` (catalog) + `knowledge/log.md` (chronological log)
- `examples.md`
- `sources.json` — **copy `<workdir>/sources.json` into `~/.mask/<slug>/sources.json`** (it carries the citation map + the per-item manifest `mask coverage` and `mask redistill` need); annotate sampling / coverage.

## Rules (every pass)
1. **Evidence-first**: every convention and every claim is bound to at least one digest sample
   `id` (a file path). If you can't point at the code, don't assert it.
2. **Conventions, not prose**: describe rules another agent could *follow* to write code that fits
   in — naming, layout, error handling, the "house" way — not a literary tour.
3. **Knowledge-first, not voice**: a code mask captures *what the repo does and how it's built*,
   not a personality. (Voice masks are the other flavor; don't blend them.)
4. **Coverage honesty**: a thin/partial sample of the repo → state which areas you saw and which
   you didn't in `mask.md`.
5. **Checkpoint**: write each pass to `~/.mask/<slug>/_work/pass<N>.md` before moving on.

---

## Pass 1 - Survey
Read the digest. From the README + tree, state what the project is, its stack, and its top-level
layout. From config/lint files, extract the enforced rules (formatter, lint config, TS strictness,
module type). Each observation followed by its sample `id`(s). -> `_work/pass1-survey.md`.

## Pass 2 - Conventions synthesis
Turn the survey + a read of the source samples into `mask.md` (use `templates/mask.code.md`),
filling: Identity / Conventions & idioms / Architecture / APIs & patterns / Boundaries / How to
answer. Each convention must be actionable and carry evidence `id`s. Fill frontmatter
(`type: code`, `source_kind: repo`, `name`, `slug`, …).

## Pass 3 - Knowledge extraction
The `knowledge/` dir is a small persistent wiki (after Karpathy's LLM-wiki idea): topic pages, a
catalog (`index.md`), a chronological log (`log.md`), and associative cross-links between pages.
Pull the reusable building blocks into `knowledge/<topic>.md` by area (e.g. `architecture.md`,
`apis.md`, `conventions.md`): core functions/types and how features are added.
- **End each chunk with `[src:<id>]`** (the file path's id).
- Build `knowledge/index.md` (topic -> file).
- **Cross-link**: where one area references another, add a `[[topic]]` link (resolves to
  `knowledge/<topic>.md`) — e.g. "see also [[architecture]]".
- **Log it**: append one dated entry to `knowledge/log.md` (skeleton in `templates/knowledge/log.md`),
  format `## [YYYY-MM-DD] ingest | <repo> — <range>`, listing the pages you created. Use today's
  date. This is what makes the wiki auditably *compound* across redistills.
- Only include what's in the digest; don't import general knowledge as if it were this repo's.

## Pass 4 - Examples
Produce 2-4 "task -> idiomatic implementation/answer for this repo" samples into `examples.md`,
demonstrating the conventions and citation. Label them as examples.

## Pass 5 - Faithfulness self-check
Re-check against the digest and fix:
- Any convention / API claim missing an evidence id? -> add evidence or delete.
- Any API or pattern that isn't actually in the digest? -> mark speculation or delete.
- Are coverage boundaries (which parts of the repo you saw) stated in `mask.md`?
- Write the audit to `_work/pass5-faithfulness.md`.

When it passes, the mask is complete. Report the coverage range and prompt that they can now
`wear <slug>`.
