<!-- Keep PRs focused: one minimal, verifiable change. See CONTRIBUTING.md / AGENTS.md. -->

## What & why
<!-- What does this change, and what problem does it solve? -->

## How
<!-- Brief notes on the approach. Which layer(s): ingest / adapter / recipe / CLI / docs? -->

## Checklist
- [ ] `bun run typecheck` passes
- [ ] `bun test` passes
- [ ] `bun run build` passes (if touching the binary / embedded assets)
- [ ] External tools stay injectable; new logic is unit-tested offline (no network in tests)
- [ ] The CLI still calls no LLM; no API keys added
- [ ] Conventional-commit title (e.g. `fix(youtube): …`)
