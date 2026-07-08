# Portfolio · Srinivas Kanduri

Personal portfolio: cosmic dark design, interactive Three.js project orbit, scroll-driven sections, and Nova, a local rule-based chat guide.

## Stack

- Vite + TypeScript (vanilla, no framework)
- Three.js for the hero orbit
- Self-hosted fonts (Syne, DM Sans, JetBrains Mono via Fontsource)
- Zero backend: the chatbot answers from a local knowledge base, instantly

## Commands

```bash
npm install
npm run dev       # http://localhost:3200
npm run build     # type-check + production build → dist/
npm run preview   # serve the production build
```

## Deploy

`dist/` is fully static. Works as-is on GitHub Pages, Netlify, Vercel, or Cloudflare Pages.

## Content sources

- Screenshots in `public/assets/` are real captures of the live Docucaine app (docucaine.co.in), including all four UI themes.
- The RubySkope logo comes from the RubySkope repository.
- All copy is sourced from the resume; FleetEnable items mention only the work done, nothing from the product itself.
