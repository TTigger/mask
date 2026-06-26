# Agent-native authoring

open-slide is built so a coding agent drives the deck. see also [[architecture]]. [src:r1]

Built-in agent skills (shipped by the scaffolder, preconfigured for Claude Code):
- **`/create-slide`** — drafts a deck end-to-end: asks four scoping questions
  (topic & aesthetic, page count, text density, motion vs. static), picks an id,
  plans the structure, writes the pages. [src:r1]
- **`/slide-authoring`** — the technical reference (1920×1080 canvas, type scale,
  palette, layout rules) the agent reads *before* writing. [src:r1]
- **In-browser inspector** — click any element and attach a comment ("make this
  red"); comments persist as `@slide-comment` markers in source. **`/apply-comments`**
  applies every pending edit then clears the markers. Loop: present → comment →
  `/apply-comments` → repeat. [src:r1]

The docs site is itself agent-native: `apps/web` exposes machine-readable docs —
a catch-all `/llms.mdx/docs/*` route returns a page as `text/markdown` via
`getLLMText`, and `/llms-full.txt` concatenates every page into one document for an
LLM to read. [src:r33, r34]

Works with any coding agent (Claude Code, Codex, Cursor, …). [src:r1]
