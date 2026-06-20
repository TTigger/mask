# Phase 0 dogfood — overreacted.io → a worn mask

The 0.11 milestone: run the whole framework end-to-end exactly as an end user would,
with the agent acting as the "borrowed intelligence." The mask itself is **not** stored
in this repo (the framework never stores masks); it was built in a scratch library and
the run is recorded here as evidence.

## What ran
```
mask init
mask ingest https://overreacted.io/rss.xml -n dan -l 15   # 15 posts → samples.json
mask reduce .work/dan                                       # 15 → 7 within 60k-char budget
#   → agent follows recipes/voice/RECIPE.md (5 passes) on digest.json,
#     writing mask.md + knowledge/ + examples.md + _work/pass{1,5}.md
mask compile dan                                            # → ~/.claude/agents/dan.md
mask wear dan                                               # _active = dan; roster stamped
```

## Pipeline verification
- **ingest** expanded the RSS feed and extracted 15 readable posts (Readability), stable ids `b1…b15`.
- **reduce** deduped, capped each post to 8k chars (10 truncated), and filled the budget in recency
  order, keeping 7; `sources.json` recorded each kept id → URL + sha256 of the *original* text.
- **recipe** produced an evidence-bound `mask.md` (six sections), four knowledge files
  (`atproto`, `react-rsc`, `debugging`, `bio`) each chunk tagged `[src:id]`, `examples.md`, and
  Pass 1 / Pass 5 checkpoints under `_work/`.
- **compile** rendered a valid Claude Code subagent (frontmatter `name`/`description` + voice
  profile + knowledge instructions) and upserted the roster entry.
- **citation chain** is intact: every `[src:bN]` in the knowledge base resolves to a real
  source URL in `sources.json` (`b1,b3,b4,b5,b6`).

## Coverage honesty (worked as designed)
The digest skewed to late-2025 posts (atproto explainers, one RSC piece, a debugging essay, a
career post). `mask.md` and `knowledge/index.md` declare that boundary and flag older
React-pedagogy topics (hooks, closures, rendering) as under-evidenced — the agent answers them
in-voice but at lower confidence. Posts ingested-but-not-deep-read (`b2`, `b7`) were deliberately
**not** cited, so no knowledge is attributed to unread sources.

## Follow-ups (not blockers)
- The compiled subagent repeats `Answer in the voice of <name>.` (once from `subagent.hbs`, once
  from the mask's Identity heading) — cosmetic; the template line guarantees the instruction even
  if a hand-edited `mask.md` omits it.
- A future `mask doctor` lint that flags `[src:]` citations with no matching id should ignore the
  literal `[src:id]` token in instructional text.
