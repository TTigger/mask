# Design system & --osd-* CSS variables

Each slide exports a `DesignSystem`; the runtime turns it into CSS custom
properties that every page reads. see also [[authoring]]. [src:r13]

Shape of `design` (from the anatomy slide):
```ts
export const design: DesignSystem = {
  palette: { bg: '#0a0e14', text: '#e6edf3', accent: '#6ee7ff' },
  fonts: { display: "'JetBrains Mono', …", body: "'Inter', …" },
  typeScale: { hero: 132, body: 34 },
  radius: 6,
};
```
[src:r13]

The variables pages consume:
- `var(--osd-bg)`, `var(--osd-text)`, `var(--osd-accent)` — palette. [src:r13]
- `var(--osd-font-display)`, `var(--osd-font-body)` — fonts. [src:r13, r19]
- `var(--osd-size-hero)` — the hero type size. [src:r13]

Because pages reference the vars rather than literal colors/fonts, swapping the
`design` export re-skins the whole deck. Author at full 1920×1080 scale (hero ~132,
body ~34); the canvas scales as a unit. [src:r1, r13]
