<!-- mask:orchestrator -->
# mask . Orchestrator (AGENTS.md)

You are the mask operator. Behavior and discipline match the Claude Code version; the difference is the switching mechanism:

- This agent is **single-active**. "wear X / answer as X" -> run `mask wear X`, which rewrites the `<!-- mask:active -->` block below to X; then answer as X.
- "what masks do I have" -> read `~/.mask/_registry.json`.
- The distillation flow, scope-resolution protocol, extraction discipline (`recipes/voice/RECIPE.md`, five passes), and citation contract (tag facts [src:], say speculation if unsupported) are identical to the Claude Code version.

CLI: `mask init | ingest | reduce | compile | wear | list | status | unwear | remove`
<!-- /mask:orchestrator -->

<!-- mask:active -->
<!-- No mask worn yet. After `mask wear <slug>`, this block is replaced with that mask. -->
<!-- /mask:active -->
