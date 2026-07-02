# Design: brand-asset refresh, landing-page demo GIF, zh-TW demo GIF, de-versioning

Date: 2026-07-02 · Status: approved

Batch 2 of the growth plan. Four user-facing polish deliverables; no CLI code
changes. Batch 3 (npm/bunx publish) is a separate spec.

## A. Social preview refresh + brand-mark unification

**Problem**: `assets/social-preview.png` carries the stale claim "4 agents"
(contradicts the v0.2+ message "2 adapters → 30+ tools via AGENTS.md") and its
text renders in generic Helvetica/Arial, not the brand fonts. The site favicon
is a third, faceless variant of the mark — three surfaces, three marks.

**Changes**
1. `assets/social-preview.svg` — copy line becomes
   `voice · code · blend  ·  one AGENTS.md → 30+ agents  ·  4 source kinds`;
   fonts become Space Grotesk (wordmark) / Inter (sub-lines). Keep the
   existing composition, palette, and the three-layer face mark (already
   correct in the SVG).
2. `assets/social-preview.html` (new) — a 1280×640 HTML rendering of the same
   design that loads Google Fonts, so the PNG can be reproduced reliably.
   This wrapper is the render source of truth for the PNG.
3. `assets/social-preview.png` — re-rendered at exactly 1280×640 from the
   HTML wrapper via headless browser screenshot (Playwright MCP or
   equivalent), replacing the old PNG in place. All existing references
   (README banners, og:image) pick it up without edits.
4. Favicon in `site/index.html` — replace the faceless data-URI mask with the
   three-layer face mark (the page's own `#i-mask` symbol: cream rounded
   square + 2 shadow layers + face), encoded as an SVG data URI.
5. `assets/mask-icon.svg` — align with the same mark if it differs.
6. **Manual user step (out of scope for automation)**: upload the new PNG to
   GitHub → repo Settings → Social preview. GitHub has no API for this;
   remind the user at the end.

## B. Landing page: real GIF, no version, Windows install line

1. In `site/index.html`, the "Talk to it" section's hand-written fake
   terminal transcript (fictional dan/gilfoyle dialogue) is replaced by the
   real `assets/demo.gif`, referenced via
   `https://raw.githubusercontent.com/TTigger/mask/main/assets/demo.gif`
   (same pattern as the existing og:image). Keep the section's eyebrow/h2/lead
   copy and keep the `.term` window chrome (bar with the three dots) around
   the image for visual continuity. Add width/height + `loading="lazy"` +
   descriptive `alt`.
2. Footer: `MIT · v0.3.0 — early release, dogfooded, not yet battle-tested.`
   → `MIT — early release, dogfooded, not yet battle-tested.`
3. De-versioning in READMEs: remove the `version-0.3.0` shield badge line from
   `README.md` and `README.zh-TW.md`. `package.json` keeps its version
   (functional).
4. Quickstart step 1 code block in `site/index.html` gains the Windows line,
   mirroring the READMEs: `# Windows (PowerShell):  .\install.ps1`.

## C. zh-TW demo GIF (hung-yi-lee)

A Mandarin-content variant of the demo for the zh-TW README (and future
zh-community launch material), produced with the same staged-replay
infrastructure and the same honesty discipline as the English one.

1. `demo/play.zh-tw.sh` — presenter with the same three-round structure
   (prompt → read → scripted response). Storyline: distill
   `@HungyiLeeNTU` (YouTube) → wear `hung-yi-lee` → ask
   「什麼是 KV cache？為什麼能加速推理？」→ answer in the teacher's
   colloquial lecture voice with `[src:]` citations. Every substantive answer
   line is sourced (condensed verbatim) from
   `examples/hung-yi-lee/knowledge/kv-cache.md`, and the pipeline line's
   sample count from `examples/hung-yi-lee/sources.json`. If script and
   example files disagree, fix the script.
2. `demo/demo.zh-tw.tape` — same settings as `demo/demo.tape`, plus
   `Set FontFamily "Noto Sans Mono CJK TC"`; outputs `assets/demo.zh-tw.gif`.
3. `.github/workflows/demo.yml` — install `fonts-noto-cjk`, render both
   tapes, `git add assets/demo.gif assets/demo.zh-tw.gif` in the commit step.
   **First verification point**: CJK glyphs actually render (no tofu) —
   frame-check the artifact before accepting.
4. `README.zh-TW.md` line 2 — switch the embed from `assets/demo.gif` to
   `assets/demo.zh-tw.gif` (alt text stays Chinese, updated to the
   hung-yi-lee storyline). `README.md` and the landing page keep the English
   GIF.

## Out of scope (YAGNI)

Full visual redesign or palette change · multilingual landing page ·
npm/bunx publishing (batch 3; after it ships, STOP and discuss launch week
with the user before any launch action) · GitHub social-preview upload
automation (impossible via API).

## Verification

- PNG: exact 1280×640, brand fonts visibly applied, corrected copy line,
  eyeballed before replacing.
- Site: serve `site/index.html` locally, check hero/section layout intact,
  GIF loads in the term frame, no `v0.3.0` anywhere in rendered page, favicon
  shows the face mark.
- zh-TW GIF: frame-extract and eyeball CJK rendering + the four criteria used
  for the English GIF; honesty cross-check against the hung-yi-lee example.
- `bun run typecheck` + `bun test` before each commit (nothing should touch
  them).
