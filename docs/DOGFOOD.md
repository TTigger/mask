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

---

# Phase 1 dogfood — a YouTube channel (Fireship) → a portable mask

The 1.5 milestone: prove the YouTube pipeline and a second agent end-to-end. Again the agent is
the borrowed intelligence; the mask lives in a scratch library, recorded here as evidence.

## What ran
```
mask init                                                  # claude-code library
mask ingest https://www.youtube.com/@Fireship/videos -n fireship -l 12
#   → yt-dlp listed videos + fetched auto-subs; 11/12 had usable transcripts (~36s)
mask reduce .work/fireship                                 # denoise + budget → 8 kept
#   → agent follows recipes/voice/RECIPE.md (5 passes) on the denoised digest
mask compile fireship && mask wear fireship                # → ~/.claude/agents/fireship.md
# portability: same mask folder, config.agent = agents-md, `mask wear fireship`
#   → persona swapped into the AGENTS.md `mask:active` block
```

## Pipeline verification
- **ingest (youtube)** shelled out to yt-dlp via the default provider, expanded the channel, and
  parsed WebVTT into 11 transcripts with stable ids `y1…`.
- **reduce** denoised the auto-captions (stripped `[Music]`/fillers, collapsed rolling-caption
  repetition — noisy subs became clean prose), then kept 8 within the 60k-char budget; provenance
  hashed the original transcripts.
- **recipe** produced an evidence-bound `mask.md`, three knowledge files (`format`, `stances`,
  `tech-history`) tagged `[src:y#]`, `examples.md`, and Pass 1 / Pass 5 checkpoints.
- **dual compile** — the *same* persona unit rendered to a Claude Code subagent **and** an
  AGENTS.md active block (Phase 1's portability criterion, also covered by unit tests).
- **recognizable voice** — the worn mask reproduces the Code Report register (cold open, sardonic
  hyperbole, movie analogies, "two haters at MIT," accurate-first/funny-second) with `[src:]`.

## Coverage honesty (worked on hard material)
The Code Report is fast-moving, often **satirical/near-future** tech news. The recipe's faithfulness
pass fenced satire off from fact: `mask.md`, `knowledge/index.md`, and the examples all flag model
names / dates / "banned model" events as of-the-moment bits, not durable truths, and one-off
satirical asides were left uncited. The denoise step was essential — without it the digest would be
mostly repeated caption fragments.
