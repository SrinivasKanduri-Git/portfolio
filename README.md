# Portfolio · Srinivas Kanduri

A 3D neon **soundstage** portfolio. The site opens on a clapperboard cold-open,
parts its curtains onto a lit stage, and scroll dollies a camera across three
dioramas — each a real project rebuilt as a set:

- **SC.01 — News Anchor Robot** · the AI Reporter concept
- **SC.02 — BugScope** · the RubySkope concept (bugs, brass magnifier, ruby)
- **SC.03 — Spatial Canvas** · Docucaine's mixed-format documents flowing into a framed grid

Behind the stage stands the extruded, glossy **SK** monogram hero sign.

## Stack

- Vite + React 19 + TypeScript
- Three.js via `@react-three/fiber` + `@react-three/drei` + `@react-three/postprocessing`
- GSAP for the cold-open choreography; Lenis for smooth scroll-driven camera
- Self-hosted fonts (Big Shoulders, Courier Prime, Public Sans via Fontsource)
- Zero backend — fully static

## Commands

```bash
npm install
npm run dev       # http://localhost:3200
npm run build     # type-check + production build → dist/
npm run preview   # serve the production build
npm test          # vitest
```

## Rendering tiers

`src/capabilities.ts` detects the device and picks a tier: `full` (3D stage +
smooth scroll) or a `fallback` static stage for no-WebGL / reduced-motion. The
cold-open intro is skipped for the fallback tier and for `prefers-reduced-motion`.

## Structure

- `src/three/` — the stage, camera path, and per-scene dioramas
- `src/brand/skMark.ts` — the canonical measured SK geometry, shared by the 3D sign and the SVG slate
- `src/hud/` — curtain intro + on-stage HUD
- `src/scroll/` — Lenis + GSAP ScrollTrigger wiring

## Deploy

`dist/` is fully static. Works as-is on GitHub Pages, Netlify, Vercel, or Cloudflare Pages.

## Content sources

- Screenshots in `public/assets/` are real captures of the live Docucaine app (docucaine.co.in).
- The RubySkope logo comes from the RubySkope repository.
- All copy is sourced from the resume; project sets depict only the work done.
