# Voice Recipe — voice distillation procedure (v1)

> A procedure for the agent. You (the user's current agent) follow this to distill a reduced digest into a mask.
> The CLI does NOT do this step — this step IS the "borrowed intelligence".

## Input
- `digest`: the sample set from reduce, each `{ id, src_ref, text }`. `id` is the stable citation anchor.

## Output (written into `~/.mask/<slug>/`)
- `mask.md` (frontmatter + six-section voice profile)
- `knowledge/*.md` + `knowledge/index.md`
- `examples.md`
- `sources.json` — **copy `<workdir>/sources.json` into `~/.mask/<slug>/sources.json`** (it carries the citation map + the per-item manifest `mask coverage` and `mask redistill` need); annotate sampling / coverage.

## Rules (every pass)
1. **Evidence-first**: every voice feature and every knowledge claim is bound to at least one digest sample `id`. If you can't bind it, don't write it.
2. **Voice != summary**: "how they say it" (Pass 1-2) and "what they know" (Pass 3) are done separately.
3. **Actionable**: write the profile as instructions another agent could follow to reproduce the voice — not literary description.
4. **Coverage honesty**: thin or single-topic digest -> note the evidence range and "voice unknown" boundaries in `mask.md`.
5. **Checkpoint**: write each pass's output to `~/.mask/<slug>/_work/pass<N>.md` before moving on (resumable).

---

## Pass 1 - Voice analysis
Read the whole digest. Extract observable voice features, **each followed by 1-2 sample ids as evidence**. Cover at least:
- Rhythm & sentence structure (length, long/short cadence, how sections end)
- Diction & register (formal/casual, technical density, loanword/abbrev habits)
- Rhetorical moves (how they open, take/contrast first, self-deprecation, metaphor habits)
- What they emphasize, what they keep returning to
- Signature phrases, catchphrases, verbal tics

-> write to `_work/pass1-voice.md`.

## Pass 2 - Profile synthesis
Turn Pass 1 into `mask.md` (use the `templates/mask.md` skeleton), filling the six sections: Identity / Voice & tone / Stances / Vocabulary & tics / Boundaries / How to answer.
- Each descriptor should be actionable and verifiable (attach Pass 1 evidence ids).
- Fill frontmatter: `name / slug / type / source_kind / created / tags`.

## Pass 3 - Knowledge extraction
Pull this source's substantive takes, claims, and frameworks into `knowledge/<topic>.md` by topic:
- **End each knowledge chunk with `[src:<id>]`** (one or more).
- Build `knowledge/index.md` (topic -> file).
- Only include what actually appears in the digest; do not add outside common knowledge as if it were theirs.

## Pass 4 - Examples
Produce 2-4 "Q -> answer in this voice" samples into `examples.md`, demonstrating tone, stance, and citation. Label them as examples.

## Pass 5 - Faithfulness self-check
Re-check against the digest and fix:
- Any voice feature / knowledge claim missing an evidence id? -> add evidence or delete.
- Any claim beyond the digest? -> mark as speculation or delete.
- Are coverage boundaries stated in `mask.md`?
- Write the audit to `_work/pass5-faithfulness.md`.

When it passes, the mask is complete. Report the evidence range to the user and prompt that they can now `wear <slug>`.
