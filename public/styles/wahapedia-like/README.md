# Source-Like Style Assets

The source-like renderer no longer bundles copied fonts, CSS snapshots, profile
images, or decorative images from third-party sites.

The renderer uses implementation-owned React markup and CSS-only shapes in:

```text
src/cardStyles/WahapediaLikeWarscrollCard.tsx
src/cardStyles/wahapedia-like.css
```

Small SVG icons in `icons/` are project-owned placeholders for generic print UI
treatment. Runtime rendering must not hotlink external style assets.
