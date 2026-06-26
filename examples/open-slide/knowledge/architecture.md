# Monorepo layout & tooling

pnpm + Turbo monorepo, two packages + two apps. [src:r1]

- `packages/core` (`@open-slide/core`) — runtime (home page, slide viewer, present
  mode, in-browser inspector), the Vite plugin, and the `open-slide` dev/build/preview
  CLI. Exports authoring types/hooks/components (`Page`, `SlideMeta`, `DesignSystem`,
  `SlideTransition`, `useSlidePageNumber`, `ImagePlaceholder`). [src:r1, r9, r13, r17]
- `packages/cli` (`@open-slide/cli`) — `npx @open-slide/cli init <name>` scaffolder;
  the generated workspace hides Vite/React/tsconfig inside core. [src:r1]
- `apps/demo` — example workspace consuming `@open-slide/core` via `workspace:*`,
  used to develop the framework. [src:r1, r5]
- `apps/web` — Next.js docs site; see [[agent-authoring]] for its agent-native routes. [src:r29, r33, r34]

Tooling (root `package.json`): scripts fan out via `turbo run` (`dev`, `build`,
`typecheck`, `check`); Biome for format+lint+check (`@biomejs/biome` 2.4.12); Vitest
for tests; Changesets for releases (`changeset version` / `release`); pnpm@10.17.0
pinned as `packageManager`. [src:r3]
