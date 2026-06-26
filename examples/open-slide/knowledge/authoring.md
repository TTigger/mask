# Authoring a slide

A deck lives at `slides/<id>/index.tsx` and exports three things: [src:r9, r13]

```tsx
import { type DesignSystem, type Page, type SlideMeta, useSlidePageNumber } from '@open-slide/core';

export const design: DesignSystem = { palette: {…}, fonts: {…}, typeScale: {…}, radius: 6 };
export const meta: SlideMeta = { /* deck/section metadata */ };

const Cover: Page = () => ( /* a React component sized for 1920×1080 */ );
const Agenda: Page = () => ( … );

export default [Cover, Agenda, …] satisfies Page[];
```

- Pages render in array order; each is a `Page` (`() => ReactNode`). [src:r9, r13]
- Position comes from the hook, not props: `const { current, total } = useSlidePageNumber()`. [src:r13]
- Style with design-system vars (see [[design-system]]) and inline styles; animations are a
  keyframes string rendered via `<style>{keyframes}</style>` and referenced with `animation`. [src:r13, r19]
- Some decks also import `SlideTransition` to customize slide-to-slide transitions. [src:r17]

The empty config is valid — `apps/demo/open-slide.config.ts` default-exports
`const openSlideConfig: OpenSlideConfig = {}`. [src:r5]
