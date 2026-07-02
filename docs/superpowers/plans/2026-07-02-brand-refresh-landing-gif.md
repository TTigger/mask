# Brand Refresh + Landing GIF + zh-TW GIF Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refresh the social-preview image (fix stale copy, brand fonts, unify the favicon), put the real demo GIF on the landing page, remove user-facing version numbers, and ship a Mandarin hung-yi-lee demo GIF for README.zh-TW.md.

**Architecture:** Four independent tasks, no CLI code changes. The PNG is re-rendered from a new HTML wrapper (loads Google Fonts) via a headless-browser screenshot; the zh-TW GIF reuses the existing vhs staged-replay infrastructure (`demo/`, `.github/workflows/demo.yml`) with a CJK font added in CI.

**Tech Stack:** HTML/CSS + Playwright MCP screenshot, SVG, charmbracelet/vhs, GitHub Actions, POSIX sh.

**Spec:** `docs/superpowers/specs/2026-07-02-brand-refresh-landing-gif-design.md`

## Global Constraints

- Corrected copy line (exact): `voice · code · blend  ·  one AGENTS.md → 30+ agents  ·  4 source kinds`
- PNG must be exactly 1280×640.
- Demo content honesty: every substantive zh-TW answer line traces to `examples/hung-yi-lee/knowledge/kv-cache.md` (all `[src:y6]`); sample count/ids from `examples/hung-yi-lee/sources.json` (7 sources, y1–y7). If script and example disagree, fix the script.
- `demo/play.zh-tw.sh`: POSIX sh, LF endings, UTF-8; the `❯` prompt uses the octal escape `\342\235\257` (dash-safe; `\xHH` is not POSIX).
- No `v0.3.0` (or any version string) remains user-visible in `site/index.html`, `README.md`, `README.zh-TW.md`. `package.json` keeps its version.
- Run `bun run typecheck` + `bun test` once before each commit (2 pre-existing Windows subprocess flakes don't block). One minimal commit per change.
- Do not edit `assets/mask-icon.svg` — it is already the correct three-layer face mark.

---

### Task 1: Social-preview refresh + favicon unification

**Files:**
- Create: `assets/social-preview.html`
- Modify: `assets/social-preview.svg:24-29` (fonts + copy line)
- Modify: `site/index.html:13` (favicon data URI)
- Replace: `assets/social-preview.png` (re-rendered binary)

**Interfaces:**
- Consumes: brand palette/motif already in `assets/social-preview.svg` and `assets/mask-icon.svg`.
- Produces: `assets/social-preview.png` (1280×640) that Task 2's page and both READMEs keep referencing by unchanged path.

- [ ] **Step 1: Write `assets/social-preview.html`**

```html
<!doctype html>
<!-- Render source for assets/social-preview.png (1280x640).
     Re-render: load in a 1280x640 headless-browser viewport, wait for fonts
     (document.fonts.ready), screenshot the viewport.
     Keep the copy in sync with assets/social-preview.svg. -->
<html lang="en">
<head>
<meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=Inter:wght@400;500&display=swap" rel="stylesheet">
<style>
  html,body{ margin:0; padding:0; }
  .card{ width:1280px; height:640px; overflow:hidden; display:flex; align-items:center;
         background:linear-gradient(135deg,#3B2E6B 0%,#241B45 100%); }
  .mark{ width:400px; height:400px; margin-left:96px; flex:none; }
  .text{ margin-left:64px; }
  .text h1{ font-family:'Space Grotesk',sans-serif; font-weight:700; font-size:150px; line-height:1;
            color:#F4F1EA; margin:0 0 10px; letter-spacing:-5px; }
  .text .tag{ font-family:'Space Grotesk',sans-serif; font-weight:600; font-size:42px; color:#C4BBE6; margin:0 0 26px; }
  .text .sub{ font-family:'Inter',sans-serif; font-weight:400; font-size:25px; color:#9D93C9; margin:0 0 12px; }
</style>
</head>
<body>
<div class="card">
  <svg class="mark" viewBox="0 0 512 512" aria-hidden="true">
    <defs><path id="m" d="M256 120 C314 120 352 162 352 222 C352 300 316 366 256 392 C196 366 160 300 160 222 C160 162 198 120 256 120 Z"/></defs>
    <use href="#m" fill="#6E63A6" transform="translate(104 -8) rotate(13 256 256)"/>
    <use href="#m" fill="#9D93C9" transform="translate(54 -4) rotate(6.5 256 256)"/>
    <use href="#m" fill="#F4F1EA"/>
    <path d="M206 224 q24 -24 48 0 q-24 16 -48 0 Z" fill="#34285F"/>
    <path d="M262 224 q24 -24 48 0 q-24 16 -48 0 Z" fill="#34285F"/>
    <path d="M228 306 q28 20 56 0" stroke="#34285F" stroke-width="10" fill="none" stroke-linecap="round"/>
  </svg>
  <div class="text">
    <h1>mask</h1>
    <p class="tag">Distill anything. Wear anyone.</p>
    <p class="sub">agent-native persona distillation · no API key</p>
    <p class="sub">voice · code · blend  ·  one AGENTS.md → 30+ agents  ·  4 source kinds</p>
  </div>
</div>
</body>
</html>
```

- [ ] **Step 2: Update `assets/social-preview.svg` text block**

Replace lines 24–29 (the `<g font-family=...>` block) with:

```xml
  <g>
    <text x="606" y="300" font-family="'Space Grotesk', Helvetica, Arial, sans-serif" font-size="170" font-weight="700" fill="#F4F1EA" letter-spacing="-4">mask</text>
    <text x="612" y="372" font-family="'Space Grotesk', Helvetica, Arial, sans-serif" font-size="44" font-weight="600" fill="#C4BBE6">Distill anything. Wear anyone.</text>
    <text x="612" y="430" font-family="'Inter', Helvetica, Arial, sans-serif" font-size="27" fill="#9D93C9">agent-native persona distillation · no API key</text>
    <text x="612" y="486" font-family="'Inter', Helvetica, Arial, sans-serif" font-size="25" fill="#9D93C9">voice · code · blend  ·  one AGENTS.md → 30+ agents  ·  4 source kinds</text>
  </g>
```

- [ ] **Step 3: Render the PNG**

Use the Playwright MCP tools (load via ToolSearch if deferred): `browser_resize` to 1280×640 → `browser_navigate` to `file:///C:/Users/user/Desktop/mask/assets/social-preview.html` → `browser_evaluate` `await document.fonts.ready` (or wait ~2 s) → `browser_take_screenshot` (viewport, PNG) → copy the produced file over `C:\Users\user\Desktop\mask\assets\social-preview.png`. Verify with a PNG header/size check (e.g. PowerShell `Add-Type System.Drawing; [System.Drawing.Image]::FromFile(...)` → Width 1280, Height 640) and Read the PNG to eyeball: brand fonts visible (geometric Grotesk "mask", not Helvetica), corrected copy line, mark intact, no clipping.

- [ ] **Step 4: Replace the favicon in `site/index.html`**

Replace line 13 (`<link rel="icon" ...>`) with:

```html
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Crect width='512' height='512' rx='104' fill='%23F4F1EA'/%3E%3Cdefs%3E%3Cpath id='m' d='M256 120C314 120 352 162 352 222 352 300 316 366 256 392 196 366 160 300 160 222 160 162 198 120 256 120Z'/%3E%3C/defs%3E%3Cuse href='%23m' fill='%23C4BBE6' transform='translate(104 -8) rotate(13 256 256)'/%3E%3Cuse href='%23m' fill='%238E83C6' transform='translate(54 -4) rotate(6.5 256 256)'/%3E%3Cuse href='%23m' fill='%2334285F'/%3E%3Cpath d='M206 224 q24 -24 48 0 q-24 16 -48 0 Z' fill='%23F4F1EA'/%3E%3Cpath d='M262 224 q24 -24 48 0 q-24 16 -48 0 Z' fill='%23F4F1EA'/%3E%3Cpath d='M228 306 q28 20 56 0' stroke='%23F4F1EA' stroke-width='10' fill='none' stroke-linecap='round'/%3E%3C/svg%3E">
```

Verify by loading `file:///C:/Users/user/Desktop/mask/site/index.html` in the browser tab and checking the tab icon shows the three-layer face mark.

- [ ] **Step 5: Typecheck + test + commit**

```powershell
bun run typecheck; if ($?) { bun test }
git add assets/social-preview.html assets/social-preview.svg assets/social-preview.png site/index.html
git commit -m "assets: refresh the social preview (brand fonts, AGENTS.md copy) + unify the favicon"
```

---

### Task 2: Landing page GIF + de-versioning + Windows install line

**Files:**
- Modify: `site/index.html:226-235` (fake terminal → real GIF), `site/index.html:250-251` (quickstart install block), `site/index.html:310` (footer)
- Modify: `README.md:10`, `README.zh-TW.md:10` (remove version badge)

**Interfaces:**
- Consumes: `assets/demo.gif` on `main` (already shipped).
- Produces: no interfaces; final user-facing surfaces.

- [ ] **Step 1: Replace the fake terminal in `site/index.html`**

Replace this block (inside the "Talk to it" section):

```html
    <div class="term reveal">
      <div class="bar"><i style="background:#ff5f57"></i><i style="background:#febc2e"></i><i style="background:#28c840"></i></div>
      <div class="body">
        <div><span class="you">you ›</span> distill this blog for me — https://overreacted.io</div>
        <div><span class="out">mask ›</span> ingested 15 posts → reduced → distilled <b>dan</b> (voice). wear it?</div>
        <div style="margin-top:12px"><span class="you">you ›</span> wear dan</div>
        <div><span class="out">dan ›</span> Sure — what are we building? <span style="color:#6f6896">(now in Dan's voice, citing <code>[src:…]</code>)</span></div>
        <div style="margin-top:12px"><span class="you">you ›</span> ask gilfoyle: review this function</div>
      </div>
    </div>
```

with:

```html
    <div class="term reveal">
      <div class="bar"><i style="background:#ff5f57"></i><i style="background:#febc2e"></i><i style="background:#28c840"></i></div>
      <img src="https://raw.githubusercontent.com/TTigger/mask/main/assets/demo.gif" alt="Real session: distill karpathy/micrograd, wear it, ask a question — answered in its idiom with [src:] citations" width="1200" height="640" loading="lazy" style="display:block; width:100%; height:auto;">
    </div>
```

- [ ] **Step 2: Add the Windows line to the quickstart code block**

In the step-1 codeblock, replace:

```
<pre>git clone https://github.com/TTigger/mask &amp;&amp; cd mask
./install.sh</pre>
```

with:

```
<pre>git clone https://github.com/TTigger/mask &amp;&amp; cd mask
./install.sh          <span class="tok"># Windows (PowerShell): .\install.ps1</span></pre>
```

- [ ] **Step 3: De-version the footer**

Replace `<small>MIT · v0.3.0 — early release, dogfooded, not yet battle-tested.</small>` with `<small>MIT — early release, dogfooded, not yet battle-tested.</small>`.

- [ ] **Step 4: Remove the version badge from both READMEs**

Delete this line from `README.md`:
```html
  <img src="https://img.shields.io/badge/version-0.3.0-7C6BD6?style=flat-square" alt="version 0.3.0">
```
Delete this line from `README.zh-TW.md`:
```html
  <img src="https://img.shields.io/badge/version-0.3.0-7C6BD6?style=flat-square" alt="版本 0.3.0">
```

- [ ] **Step 5: Verify no version remains, typecheck + test, commit**

Run: `grep -rn "0\.3\.0" site/ README.md README.zh-TW.md` → expected: no matches.

```powershell
bun run typecheck; if ($?) { bun test }
git add site/index.html README.md README.zh-TW.md
git commit -m "site+docs: real demo GIF on the landing page, drop user-facing version numbers"
```

---

### Task 3: zh-TW demo GIF (hung-yi-lee) — presenter, tape, workflow, render

**Files:**
- Create: `demo/play.zh-tw.sh`, `demo/demo.zh-tw.tape`
- Modify: `.github/workflows/demo.yml`

**Interfaces:**
- Consumes: `examples/hung-yi-lee/knowledge/kv-cache.md` (+ `sources.json`: 7 sources y1–y7); the existing demo infra conventions (three `prompt; read -r _` rounds; workflow bot-commit pattern).
- Produces: `assets/demo.zh-tw.gif` on `main` (Task 4 embeds it); `demo.yml` that renders BOTH tapes from now on.

- [ ] **Step 1: Write `demo/play.zh-tw.sh`** (UTF-8, LF)

```sh
#!/bin/sh
# zh-TW demo presenter for README.zh-TW.md -- a pre-scripted "agent session".
# demo/demo.zh-tw.tape (vhs) types the user's lines into the prompts below.
# Substantive content (sample count/ids, the answer, its [src:] citations) is
# sourced from examples/hung-yi-lee (knowledge/kv-cache.md, sources.json) --
# see docs/superpowers/specs/2026-07-02-brand-refresh-landing-gif-design.md.

printf '\033[2J\033[H'

p()   { printf '%s\n' "$1"; }
dim() { printf '\033[2m%s\033[0m\n' "$1"; }
ok()  { printf '\033[32m%s\033[0m\n' "$1"; }
prompt() { printf '\n\033[35m\342\235\257 \033[0m'; }

# round 1: "distill 李宏毅老師的頻道 youtube.com/@HungyiLeeNTU"
prompt; read -r _
sleep 0.6
dim '  ingest    youtube.com/@HungyiLeeNTU -> 7 個樣本'
sleep 0.9
dim '  reduce    -> digest (y1..y7)'
sleep 0.9
dim '  extract   語音特徵 / 知識   [recipe: voice]'
sleep 0.9
dim '  compile   -> subagent 已安裝'
sleep 0.6
ok  '  已蒸餾 hung-yi-lee -- 說「wear hung-yi-lee」戴上'

# round 2: "wear hung-yi-lee"
prompt; read -r _
sleep 0.5
ok '  已戴上 hung-yi-lee  (voice / 李宏毅 NTU ML 講課)'

# round 3: the question
prompt; read -r _
sleep 0.9
p ''
p '[hung-yi-lee] 好，生成的時候，每個新 token 的 query 都要對前面'
p '所有 token 的 key 跟 value 做 attention。每一步都重算整個前綴'
p '的 K 跟 V 太浪費了，所以把它們存起來重複使用——這個倉庫就是'
p 'KV Cache，Q 不用存 [src:y6]。代價是倉庫會爆掉：每個 token 都'
p '多存一份 K,V，而且 attention 是 multi-head 的，所以才需要 GQA'
p '這些技巧 [src:y6]。'
sleep 3

# end card
printf '\n\n'
p '   蒸餾萬物，戴上任何人。'
dim '   github.com/TTigger/mask'
sleep 3
```

- [ ] **Step 2: Honesty cross-check**

Every claim in the answer maps to `examples/hung-yi-lee/knowledge/kv-cache.md`: query attends over all previous tokens' K/V (lines 6–7); recomputing the prefix K/V wasteful → store and reuse = KV Cache; Q dropped (lines 7–10); the 倉庫/爆倉 metaphor + per-token K,V growth + multi-head multiplicity → GQA (lines 12–17); all tagged `[src:y6]`, and y6 exists in `sources.json` (7 sources y1–y7). If anything drifted, fix the script.

- [ ] **Step 3: Local run check**

Run: `printf 'a\nb\nc\n' | sh demo/play.zh-tw.sh`
Expected: exit 0 after ~11–12 s; pipeline lines, two green status lines, 6-line answer containing `[src:y6]` twice, end card. Confirm the file has no CR bytes (`grep -c $'\r' demo/play.zh-tw.sh` → 0).

- [ ] **Step 4: Write `demo/demo.zh-tw.tape`**

```
# mask zh-TW README demo -- rendered by .github/workflows/demo.yml (installs vhs directly).
# Edit this file + re-run the workflow to re-record.
Output assets/demo.zh-tw.gif

Set FontSize 20
Set Width 1200
Set Height 640
Set Padding 24
Set Theme "Catppuccin Mocha"
Set FontFamily "Noto Sans Mono CJK TC"
Set TypingSpeed 45ms

Hide
Type "bash demo/play.zh-tw.sh"
Enter
Show

Sleep 1s
Type "distill 李宏毅老師的頻道 youtube.com/@HungyiLeeNTU"
Sleep 400ms
Enter
Sleep 5s

Type "wear hung-yi-lee"
Sleep 300ms
Enter
Sleep 1.5s

Type "什麼是 KV cache？為什麼能加速推理？"
Sleep 500ms
Enter
Sleep 12s
```

Known risk: vhs `Type` with CJK text. If the rendered GIF shows the typed Chinese garbled or missing, fall back: change the two Chinese `Type` lines to ASCII stand-ins the script can ignore (e.g. `Type "distill @HungyiLeeNTU"` and have round 3 typed as `Type "KV cache?"`) OR have `play.zh-tw.sh` print the full Chinese question itself right after the `read`. Document whichever fallback was needed in the report.

- [ ] **Step 5: Update `.github/workflows/demo.yml`**

Full new content:

```yaml
name: Demo GIF

on:
  workflow_dispatch:

permissions:
  contents: write

jobs:
  render:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # charmbracelet/vhs-action@v2 is broken (its ffmpeg installer hardcodes a
      # BtbN release asset name that no longer exists — vhs-action#459), so we
      # install first-party artifacts directly: apt for ffmpeg/ttyd (+ CJK fonts
      # for the zh-TW tape), the pinned official vhs .deb from charmbracelet/vhs
      # releases.
      - name: Install vhs
        run: |
          sudo apt-get update
          sudo apt-get install -y ffmpeg ttyd fonts-noto-cjk
          curl -fsSL -o /tmp/vhs.deb https://github.com/charmbracelet/vhs/releases/download/v0.11.0/vhs_0.11.0_amd64.deb
          echo "fbc970f9e20ba59884af09b4d52c66117239a16cfe9a2a757f8af5b30b16d055  /tmp/vhs.deb" | sha256sum -c
          sudo dpkg -i /tmp/vhs.deb

      - name: Render demo/demo.tape
        run: vhs demo/demo.tape

      - name: Render demo/demo.zh-tw.tape
        run: vhs demo/demo.zh-tw.tape

      - name: Commit the rendered GIFs
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add assets/demo.gif assets/demo.zh-tw.gif
          git diff --cached --quiet || git commit -m "assets: render demo GIFs from demo/*.tape"
          git push
```

- [ ] **Step 6: Typecheck + test + commit + push**

```powershell
bun run typecheck; if ($?) { bun test }
git add demo/play.zh-tw.sh demo/demo.zh-tw.tape .github/workflows/demo.yml
git commit -m "demo: add the zh-TW (hung-yi-lee) demo tape + render both GIFs in CI"
git push
```

- [ ] **Step 7: Trigger, wait, pull, eyeball BOTH GIFs**

```powershell
gh workflow run demo.yml
gh run watch (gh run list --workflow=demo.yml --limit 1 --json databaseId --jq '.[0].databaseId')
git pull --ff-only
```

Extract frames / Read both GIFs and check: **zh-TW GIF** — CJK glyphs render (no tofu boxes) in both the typed lines and the script output, `[src:y6]` visible twice, end card `蒸餾萬物，戴上任何人。` present, nothing truncated; **English GIF** — this run re-renders it too, so re-verify its four criteria (legible, `[src:r3]` ×2, end card, no truncation). Up to 3 render attempts (tape/timing/font tweaks between attempts); report BLOCKED with run logs if still failing.

---

### Task 4: Swap the zh-TW README embed to the Mandarin GIF

**Files:**
- Modify: `README.zh-TW.md:2`

**Interfaces:**
- Consumes: `assets/demo.zh-tw.gif` on `main` (Task 3).

- [ ] **Step 1: Replace the embed line**

Replace line 2 of `README.zh-TW.md`:

```html
<p align="center"><img src="assets/demo.gif" alt="demo：蒸餾 karpathy/micrograd、戴上它、提問——agent 以它的慣用語回答並附 [src:] 引用" width="840"></p>
```

with:

```html
<p align="center"><img src="assets/demo.zh-tw.gif" alt="demo：蒸餾李宏毅老師的頻道、戴上 hung-yi-lee、問 KV cache——以老師的講課口吻回答並附 [src:] 引用" width="840"></p>
```

- [ ] **Step 2: Verify, typecheck + test, commit, push**

Confirm `assets/demo.zh-tw.gif` exists on `main` (Task 3's bot commit) and `README.md:2` still points at `assets/demo.gif`.

```powershell
bun run typecheck; if ($?) { bun test }
git add README.zh-TW.md
git commit -m "docs: use the Mandarin hung-yi-lee demo GIF in the zh-TW README"
git push
```

---

## Post-plan manual step (user)

GitHub → repo **Settings → Social preview** → upload the new `assets/social-preview.png`. No API exists for this; remind the user in the final summary.

## As-built deviations

- Social preview: the copy line wrapped at the plan's 25px/96px/64px geometry; as built, `.sub` is 22px with `white-space:nowrap` and margins are mark 64px / text 48px (commit adc4553). `assets/social-preview.html` is the render source of truth; the SVG's last text line uses font-size 22 with `textLength="640"` to match.
