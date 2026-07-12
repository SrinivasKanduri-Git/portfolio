import '@fontsource/big-shoulders/700.css';
import '@fontsource/big-shoulders/800.css';
import '@fontsource/courier-prime/400.css';
import '@fontsource/courier-prime/700.css';
import '@fontsource/public-sans/400.css';
import '@fontsource/public-sans/600.css';
import './styles.css';

import { createRoot } from 'react-dom/client';
import { inject } from '@vercel/analytics';
import { injectSpeedInsights } from '@vercel/speed-insights';
import { App } from './App';
import { initSmoothScroll } from './scroll/lenisGsap';
import { detectTier } from './capabilities';

// own the scroll position: never let the browser restore a mid-show offset —
// the intro always opens onto the top of the stage
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const tier = detectTier();

// Vercel page-view analytics + real-user performance metrics (no-ops in dev;
// this is a plain Vite SPA, so the framework-agnostic inject() path is the one)
inject();
injectSpeedInsights();

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<App tier={tier} reduceMotion={reduceMotion} />);
  if (tier === 'full') initSmoothScroll();
}
