# Design: README demo GIF + install.ps1

Date: 2026-07-02 · Status: approved

Two small deliverables that cut the project's time-to-wow and remove Windows
install friction. No CLI code changes.

## 1. Demo GIF (`assets/demo.gif`)

**Goal**: a ~30-second GIF at the top of both READMEs showing the full loop
(distill → wear → answer) in under 10 seconds of reading attention.

**Approach**: scripted replay via [charmbracelet/vhs](https://github.com/charmbracelet/vhs).
A `demo/demo.tape` file is checked into the repo and rendered to
`assets/demo.gif` by a manually-triggered GitHub Actions workflow
(`charmbracelet/vhs-action`), which commits the GIF back. Re-recording after a
UI change = edit the tape, re-run the workflow. No local ttyd/ffmpeg needed
(vhs is awkward on Windows).

**Honesty constraint**: the replayed conversation is staged for pacing, but
every substantive line — the mask's answer, its `[src:]` citations — is taken
verbatim (condensed) from `examples/micrograd`, which was really distilled with
mask's own recipes and passes `mask coverage`. Nothing in the GIF claims
anything the shipped example can't back.

**Storyboard (~30 s)**

| time | beat |
|---|---|
| 0–4 s | user tells the agent: `distill karpathy/micrograd for me` |
| 4–12 s | condensed pipeline progress: `ingest → reduce → extract → compile`, one line each |
| 12–15 s | `✓ distilled micrograd` → user: `wear micrograd` |
| 15–27 s | user asks `why does backward() build a topological order first?` → answer in micrograd's idiom with `[src:]` citations (sourced from examples/micrograd) |
| 27–30 s | end card: **Distill anything. Wear anyone.** + repo URL |

**Mechanics**: the tape drives a small presenter script (`demo/play.sh`, plain
POSIX sh + printf with delays) that prints the conversation; vhs records the
terminal. The presenter script is demo-only and lives under `demo/` — it is not
part of the CLI and imports nothing from `src/`.

**Files**
- `demo/demo.tape` — vhs script (font, theme, timings, keystrokes)
- `demo/play.sh` — presenter that prints the staged session
- `.github/workflows/demo.yml` — `workflow_dispatch`; runs vhs-action, commits `assets/demo.gif`
- `README.md` / `README.zh-TW.md` — GIF embedded directly under the social-preview banner (both share `assets/demo.gif`)

**Verification**: run the workflow, eyeball the artifact GIF (length ≈30 s,
readable at README width, citations visible) before it lands in README.

## 2. install.ps1

**Goal**: Windows parity with `install.sh` — same philosophy: never edit the
user's environment; print the exact line instead.

**Behavior (mirrors install.sh step-for-step)**
1. Resolve `$REPO` from the script's own location.
2. Require `bun` (`Get-Command`); if missing, point to https://bun.sh and exit 1.
3. `bun install --frozen-lockfile` in the repo.
4. Write launcher `mask.cmd` to `$env:USERPROFILE\.local\bin`
   (override: `-InstallDir <dir>` param or `$env:INSTALL_DIR`; param wins).
   Launcher body: `@bun run "<repo>\src\cli.ts" %*` — runs from the checkout,
   so `git pull` updates it, no rebuild.
5. PATH check against `$env:Path`: present → done message; absent → print the
   exact `[Environment]::SetEnvironmentVariable('Path', …, 'User')` line and
   an "open a new terminal" note. Do NOT modify PATH ourselves. (`setx` is
   avoided: it truncates at 1024 chars and merges machine PATH into user PATH.)
6. Print the same "Next: mask init …" footer as install.sh.

**Files**
- `install.ps1` (repo root, next to install.sh)
- `README.md` / `README.zh-TW.md` — Install section gains the Windows line
  (`.\install.ps1`)

**Verification**: run `install.ps1` on this Windows machine → `mask --version`
works from a fresh shell; missing-bun path checked by temporarily shadowing
PATH. No unit tests (parity with install.sh, which has none).

## Out of scope (YAGNI)
scoop/winget packaging · auto-editing PATH · npm/bunx publishing (separate,
next task) · a hung-yi-lee voice variant of the GIF (possible follow-up).
