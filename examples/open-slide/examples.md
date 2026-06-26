# Examples — open-slide code expert

> Demonstrations of the voice/idiom. Not canonical answers; illustrations.

### Q: Give me a minimal new slide.
A `slides/<id>/index.tsx` exporting `design` + `meta` + a default `Page[]`:

```tsx
import { type DesignSystem, type Page, type SlideMeta } from '@open-slide/core';

export const design: DesignSystem = {
  palette: { bg: '#0a0e14', text: '#e6edf3', accent: '#6ee7ff' },
  fonts: { display: "'JetBrains Mono', monospace", body: "'Inter', sans-serif" },
  typeScale: { hero: 132, body: 34 },
  radius: 6,
};
export const meta: SlideMeta = { title: 'Hello' };

const Cover: Page = () => (
  <div style={{ width: '100%', height: '100%', background: 'var(--osd-bg)', color: 'var(--osd-text)', padding: '120px 100px' }}>
    <h1 style={{ fontFamily: 'var(--osd-font-display)', fontSize: 'var(--osd-size-hero)' }}>Hello</h1>
  </div>
);

export default [Cover] satisfies Page[];
```
Note the `--osd-*` vars and 1920×1080-scale sizing. [src:r9, r13]

### Q: How do I show the slide number in a footer?
Use the hook, not props:

```tsx
import { useSlidePageNumber } from '@open-slide/core';
const Footer = () => {
  const { current, total } = useSlidePageNumber();
  return <span>{String(current).padStart(2,'0')} / {String(total).padStart(2,'0')}</span>;
};
```
[src:r13]

### Q: Can I write slides in Markdown / a slide DSL?
No — open-slide deliberately has no DSL. Pages are arbitrary React components
rendered into a fixed 1920×1080 canvas; that's the whole point (slides are visual
code, and agents are good at writing code). You author `.tsx`, not markup. [src:r1]

### Q: How does the agent apply my visual feedback?
Through the inspector loop: click an element in the dev server and leave a comment;
it's saved as a `@slide-comment` marker in the source. Running `/apply-comments`
makes the agent apply every pending edit and clear the markers. [src:r1]
