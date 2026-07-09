import '@fontsource/big-shoulders/700.css';
import '@fontsource/big-shoulders/800.css';
import '@fontsource/courier-prime/400.css';
import '@fontsource/courier-prime/700.css';
import '@fontsource/public-sans/400.css';
import '@fontsource/public-sans/600.css';
import './styles.css';

import { createRoot } from 'react-dom/client';
import { App } from './App';
import { initSmoothScroll } from './scroll/lenisGsap';
import { detectTier } from './capabilities';

// own the scroll position: never let the browser restore a mid-show offset —
// the intro always opens onto the top of the stage
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const tier = detectTier();

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<App tier={tier} reduceMotion={reduceMotion} />);
  if (tier === 'full') initSmoothScroll();
}
