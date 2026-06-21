# Blend Recipe — voice-neutral multi-source synthesis (v1)

> A procedure for the agent. You follow this to distill a reduced **multi-source** digest into a
> `type: blend` mask — a voice-neutral knowledge synthesis, clearly labeled. This is opt-in; the
> default is one source = one mask. The CLI does NOT do this step.

## Input
- `digest`: samples from reduce, each `{ id, src_ref, text }`. Ids are **namespaced by source**
  (`1.x`, `2.y`, …); the leading number identifies which source a sample came from.

## Output (written into `~/.mask/<slug>/`)
- `mask.md` (frontmatter `type: blend` + the six-section synthesis profile)
- `knowledge/*.md` + `knowledge/index.md`
- `examples.md`
- `sources.json` — **copy `<workdir>/sources.json` into `~/.mask/<slug>/sources.json`** (citation map + per-item manifest for `mask coverage`/`mask redistill`); annotate which namespace = which source.

## Rules (every pass)
1. **Voice-neutral.** Do not adopt or blend anyone's personal voice/style. The output reads as a
   balanced synthesis, not an impression of a person.
2. **Attribute everything.** Every claim ends with the source-namespaced id(s) `[src:n.x]`. A claim
   you can't attribute doesn't go in.
3. **Keep disagreement visible.** Where sources differ, say so and cite both — don't average them
   into a false consensus.
4. **Label the blend.** State up front (Identity + Sources sections) that this is a multi-source
   synthesis and list the sources by namespace.
5. **Coverage honesty + checkpoints** as in the other recipes (`_work/pass<N>.md`).

---

## Pass 1 - Source survey
Read the digest. For each source namespace, note what it covers and its stance. → `_work/pass1-survey.md`.

## Pass 2 - Synthesis profile
Write `mask.md` (use `templates/mask.blend.md`): Identity (labeled blend) / Sources (namespace map) /
Synthesized knowledge / Where sources differ / Boundaries / How to answer. Each point attributed.

## Pass 3 - Knowledge extraction
Pull combined knowledge into `knowledge/<topic>.md` by topic, each chunk `[src:n.x]`. Build
`knowledge/index.md`. Mark cross-source agreement and disagreement explicitly.

## Pass 4 - Examples
2-4 "question → voice-neutral, attributed answer" samples into `examples.md`, demonstrating
attribution and how disagreement is surfaced.

## Pass 5 - Faithfulness self-check
Any unattributed claim? Any imitation of a single voice creeping in? Any source flattened? Are the
namespaces in `sources.json`? Write the audit to `_work/pass5-faithfulness.md`.

When it passes, the mask is complete. Report the source list + coverage and prompt `wear <slug>`.
