# mask — PRD

> Distill anything. Wear anyone. — Traditional Chinese: `zh-TW/PRD.md`

## One-liner

mask is an agent-native, open-source framework that distills any source (blog, articles, YouTube channel, code, GitHub repo) into a switchable persona. Wear it and the AI agent you already use answers in that source's voice and perspective — fully local, zero API key.

## 1. Problem & vision

We constantly meet sources whose thinking we'd like on tap — a creator's takes, a book's mental models, a codebase's conventions. Today that knowledge stays locked in the source. mask distills any source into a switchable persona that runs inside your own agent: voice-first, fully local, zero API key. After cloning the project, you just open your agent CLI and drive everything in natural language — without understanding the internals.

## 2. First principles

1. **Conversation-first / zero-learning-cost.** Cloning the repo gives you an agent that already knows how to operate mask. You drive everything in natural language; the CLI is the agent's hands, never your homework.
2. **Voice-first (v1).** Capture how they talk and think; knowledge is secondary, and every factual claim is sourced and traceable.
3. **Local and yours.** Each mask is Markdown + Git on your machine, hand-editable. Your distillates are portable, backup-able, and yours.
4. **Zero API key.** The framework calls no LLM; extraction and answering borrow the user's own subscribed agent.
5. **Agent-agnostic.** Any agent that can run a shell and read/write files works.

## 3. Goals (v1)

- Distill a defined set of source types into portable, fully-local masks (persona packs).
- Let users switch the active mask in their existing agent (`wear`), like switching skills.
- Zero API key: all LLM work borrowed from the user's own agent.
- Personas are plain files (Markdown + Git), hand-editable and local.
- Work across at least two agents (proving the adapter abstraction).

## 4. Non-goals (v1)

- No hosting, no persona marketplace/registry. We open-source the **method and framework**; everyone distills what they want, for their own use.
- No model training / fine-tuning / embedding infrastructure (stay file- and agent-native).
- Not chasing perfect knowledge fidelity — voice-first, knowledge cited and bounded.
- No GUI (v1 is CLI + files + natural language).

## 5. Users

- **Primary**: developers and power users already on an agent CLI (Claude Code / Codex / Cursor / Gemini) who want a favorite source's voice and perspective on demand.
- **Secondary**: creators who distill *themselves* to share the method (sharing the method, not a hosted persona).

## 6. Core use cases

1. Distill a blog / author corpus -> wear -> ask in that author's voice.
2. Distill a YouTube channel -> wear -> answer in that creator's voice (Phase 1).
3. Distill a GitHub repo -> wear a "code expert for this repo" -> answer in its conventions (Phase 2).
4. Keep several masks, switch per task (code expert -> article expert).
5. Hand-edit a mask's markdown to refine its voice.

## 7. Key product behaviors

### 7.1 Two-tier interface (natural-language operation)

- **To humans = pure natural language.** The repo ships orchestrator instructions (in `CLAUDE.md` / `AGENTS.md`) that turn the user's agent into the mask operator. Users just talk: "distill this channel", "wear the code expert", "what masks do I have".
- **To the agent = CLI + tools.** `mask add / ingest / reduce / compile / wear / list` are the **agent's hands**, called behind the scenes; the user need not know them.

### 7.2 Scope-resolution protocol (broad / ambiguous requests)

Before any distillation, a request must resolve to a concrete, finite source list:

1. A natural-language request comes in.
2. The agent decides: does it resolve to a concrete, finite source?
3. **No (too broad / vague, e.g. "all coding habits on YouTube")** -> propose candidate sources + clarify (single voice or blended? which channels? a sub-topic?) -> user narrows -> re-evaluate.
4. **Yes** -> show plan + estimate (sample large sources) -> user confirms -> distill -> write locally.

Default: **voice-first means one source = one mask** (one voice). A blended knowledge mask is only built when the user explicitly asks, and is flagged as voice-neutralized. Large sources are sampled by default, with the count surfaced at the "show plan" step.

### 7.3 Multi-persona switching (zero learning cost)

1. **Switch by talking** — "wear X", "answer as X", "who's active", "what masks do I have".
2. **Active mask is always visible and sticky** — injected into the agent's context, self-reported when answering; once worn it stays until you change it.
3. **An at-a-glance roster** — name, source, one-line description, last used, which is active.
4. **Personas coexist; the user has one vocabulary** — under the hood it is subagent-coexistence vs single-active-swap, but the user always says the same words.

## 8. Success criteria (v1)

- `mask add -> wear -> ask` works end-to-end for at least 1 source x 1 agent, with no API key.
- A distilled mask is a folder a human can read and edit.
- Switching is one sentence and takes effect on the next agent turn.
- The same mask compiles to >= 2 agents' native formats.

## 9. Future (beyond v1)

- More sources: GitHub repo / code expert, book / PDF.
- More adapters: Cursor, Gemini.
- A headless "scale mode" (`claude -p`, etc.) for very large corpora.
- Mask versioning / re-distillation; explicit blended knowledge masks.
