import '@fontsource/big-shoulders/700.css';
import '@fontsource/big-shoulders/800.css';
import '@fontsource/courier-prime/400.css';
import '@fontsource/courier-prime/700.css';
import '@fontsource/public-sans/400.css';
import '@fontsource/public-sans/600.css';
import './styles.css';
import './islands/tailwind.css';
import './islands/vendor/rubyskope/tokens.css';
import './islands/vendor/rubyskope/timeline.css';

import { trailScene, finaleStage, playFinale, heroDay, heroNight, robotWriter, pipeDiagram, motifChrome } from './figures';
import { initGuide } from './guide';
import { mountRubyskopeIsland } from './islands/RubyskopeIsland';
import { mountAiReporterIsland } from './islands/AiReporterIsland';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* stage injection — figures are data, markup is generated */
document.getElementById('hero-f1')!.innerHTML = heroDay();
document.getElementById('hero-f2')!.innerHTML = heroNight();
document.getElementById('stage-sc1-pipe')!.innerHTML = pipeDiagram();
document.getElementById('stage-sc1')!.innerHTML = robotWriter();
document.getElementById('stage-sc2')!.innerHTML = trailScene();
document.getElementById('stage-sc3')!.innerHTML = finaleStage();

mountRubyskopeIsland(document.getElementById('island-rubyskope')!);
mountAiReporterIsland(document.getElementById('island-ai-reporter')!);

/* per-scene structural border motifs */
const MOTIFS: Array<[string, 'ticker' | 'terminal' | 'canvas']> = [
  ['#sc1 .frame-rough .frame-art', 'ticker'],
  ['#sc2 .frame-clean .frame-art', 'terminal'],
  ['#sc3 .frame-final .frame-art', 'canvas'],
];
MOTIFS.forEach(([selector, kind]) => {
  document.querySelectorAll<HTMLElement>(selector).forEach((el, i) => {
    el.insertAdjacentHTML('beforeend', motifChrome(kind, 200 + i));
  });
});

/* the crew */
initGuide(reduceMotion);

/* mobile nav */
{
  const burger = document.getElementById('nav-burger')!;
  const links = document.getElementById('nav-links')!;
  burger.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    burger.setAttribute('aria-expanded', String(open));
    burger.classList.toggle('is-open', open);
  });
  links.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => {
    links.classList.remove('open');
    burger.setAttribute('aria-expanded', 'false');
    burger.classList.remove('is-open');
  }));
}

/* nav backdrop after scrolling past the top */
const nav = document.getElementById('nav')!;
const topSentinel = document.createElement('div');
topSentinel.style.cssText = 'position:absolute;top:0;height:80px;width:1px;pointer-events:none;';
document.body.prepend(topSentinel);
new IntersectionObserver(([entry]) => {
  nav.classList.toggle('scrolled', !entry!.isIntersecting);
}).observe(topSentinel);

/* scroll reveals */
const revealables = document.querySelectorAll<HTMLElement>('.reveal');
if (reduceMotion) {
  revealables.forEach((el) => el.classList.add('in'));
} else {
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          (e.target as HTMLElement).classList.add('in');
          io.unobserve(e.target);
        }
      }
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' },
  );
  revealables.forEach((el) => io.observe(el));
}

/* ── scene takeover: the board re-themes to the project on screen ── */
const body = document.body;
{
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const id = (e.target as HTMLElement).id;
        if (e.isIntersecting) {
          body.dataset.scene = id;
        } else if (body.dataset.scene === id) {
          delete body.dataset.scene;
        }
      }
    },
    { rootMargin: '-34% 0px -34% 0px' },
  );
  ['sc1', 'sc2', 'sc3'].forEach((id) => io.observe(document.getElementById(id)!));
}

/* SC.02 trail plays when the scene enters view */
const sc2 = document.getElementById('sc2')!;
new IntersectionObserver(
  (entries, obs) => {
    if (entries.some((e) => e.isIntersecting)) {
      sc2.classList.add('play');
      obs.disconnect();
    }
  },
  { threshold: 0.25 },
).observe(sc2);

/* SC.03 finale choreography plays once when its stage enters view */
const sc3Stage = document.querySelector<HTMLElement>('#stage-sc3 .finale-stage')!;
new IntersectionObserver(
  (entries, obs) => {
    if (entries.some((e) => e.isIntersecting)) {
      playFinale(sc3Stage, reduceMotion);
      obs.disconnect();
    }
  },
  { threshold: 0.4 },
).observe(sc3Stage);

/* ── docucaine stage: pre-recorded hero video per theme ── */
{
  const video = document.getElementById('doc-video') as HTMLVideoElement;
  const chromeUrl = document.getElementById('chrome-url')!;
  const buttons = document.querySelectorAll<HTMLButtonElement>('.doc-theme');

  const THEME_LABELS: Record<string, string> = {
    starry: 'Starry Night',
    matrix: 'Neon Matrix',
    francis: 'Francis',
    neonarc: 'Neon Arc',
  };

  buttons.forEach((b) =>
    b.addEventListener('click', () => {
      const theme = b.dataset.theme!;
      chromeUrl.textContent = `docucaine.co.in — ${THEME_LABELS[theme]}`;
      buttons.forEach((btn) => btn.classList.toggle('is-on', btn === b));
      video.poster = `/assets/docucaine/${theme}.jpg`;
      video.src = `/assets/docucaine/${theme}.mp4`;
      if (!reduceMotion) video.play().catch(() => {});
    }),
  );

  new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting && !reduceMotion) video.play().catch(() => {});
        else if (!e.isIntersecting) video.pause();
      }
    },
    { rootMargin: '400px 0px 400px 0px' },
  ).observe(document.getElementById('doc-stage')!);
}

/* film spine — highlight the current scene */
const spineLinks = new Map<string, HTMLAnchorElement>();
document.querySelectorAll<HTMLAnchorElement>('.spine a').forEach((a) => {
  spineLinks.set(a.dataset.spine!, a);
});
const spineTargets = ['top', 'sc1', 'sc2', 'sc3', 'credits', 'equipment', 'papers', 'wrap'];
const spineIO = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const id = (e.target as HTMLElement).id || 'top';
      spineLinks.forEach((a, key) => a.classList.toggle('active', key === id));
    }
  },
  { rootMargin: '-30% 0px -60% 0px' },
);
spineTargets.forEach((id) => {
  const el = id === 'top' ? document.querySelector<HTMLElement>('.cold-open') : document.getElementById(id);
  if (el) spineIO.observe(el);
});
