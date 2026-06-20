<p align="center"><img src="assets/mask-icon.svg" width="140" alt="mask" /></p>
<h1 align="center">mask</h1>
<p align="center"><em>Distill anything. Wear anyone.</em></p>
<p align="center"><a href="README.zh-TW.md">繁體中文</a></p>

---

**mask** is an agent-native, open-source framework that distills any source — a blog, articles, a YouTube channel, code, a GitHub repo — into a switchable persona. Wear it, and the AI agent you already use (Claude Code, Codex, Cursor, Gemini…) answers in that source's voice and perspective. Fully local, no API key.

## Why "mask"

Three layers of meaning:

1. **persona** literally means "mask" in Latin — the face an actor wears. Swapping masks = swapping identities. That is exactly what mask does.
2. The craft tradition behind theatrical masks (Noh, opera): the wearer becomes the character in an instant. That "one breath, fully in character" mastery is the spirit of the project.
3. In CS, a **mask** is an overlay applied on top of something underneath. mask lays a persona over your base agent — your Claude Code is still Claude Code, but wearing a mask it answers with someone else's voice and knowledge.

mask also carries a faint "disguise / concealment" connotation; we keep that ambiguity on purpose — a mask both *reveals* (lets you embody someone) and *conceals* (wraps the base agent). The icon echoes it: a profile mask trailing overlapping shadow clones — you distilled someone, then wore their shadow.

## Core ideas

- **Distill anything** into a persona.
- **Voice-first (v1)**: capture how they talk and think; knowledge is secondary, cited, and bounded.
- **Local and yours**: each mask is a folder of Markdown + Git on your machine, hand-editable.
- **Agent-native, zero API key**: the framework calls no LLM; extraction and answering borrow your own subscribed agent's compute.
- **Many personas, switch like skills**: wear whichever the moment needs.

## Talk to it (zero-learning)

After you clone the repo, you drive everything in natural language inside your agent — you never need to learn the CLI:

```
"distill this blog for me"     # ingest -> your agent extracts -> saved to your local library
"what masks do I have"         # roster
"wear fireship"                # switch; the next turns answer in that voice
"ask gilfoyle: ..."            # one-off, without changing the default
```

## Status

Early WIP. The design is frozen in `docs/` (`PRD.md` -> `SPEC.md` -> `PHASES.md`). Implementation follows the phases. Traditional Chinese companions live in `docs/zh-TW/`.

## License

MIT
