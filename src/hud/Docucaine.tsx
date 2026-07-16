import { useEffect, useRef, useState } from 'react';

const THEMES = [
  { id: 'starry', label: 'Starry Night' },
  { id: 'matrix', label: 'Neon Matrix' },
  { id: 'francis', label: 'Francis' },
  { id: 'neonarc', label: 'Neon Arc' },
] as const;

type ThemeId = (typeof THEMES)[number]['id'];

/** The finale's live embed: the real Docucaine hero, one recorded clip per theme.
 *  All four clips mount at once and cross-fade. The active clip is already
 *  buffered and decoded, so switching themes plays instantly with no reload
 *  stall — the previous build remounted a single <video> (key={theme}) which
 *  refetched from scratch on every switch. */
export function Docucaine({ reduceMotion }: { reduceMotion: boolean }) {
  const [theme, setTheme] = useState<ThemeId>('starry');
  const videos = useRef<Record<ThemeId, HTMLVideoElement | null>>({
    starry: null,
    matrix: null,
    francis: null,
    neonarc: null,
  });
  const onScreen = useRef(false);
  const label = THEMES.find((t) => t.id === theme)!.label;

  // Drive only the active clip; keep the rest paused (a paused video decodes no
  // frames). An always-playing offscreen video was the single biggest scroll
  // stall on the page (worst frame 1.4s → 145ms with videos parked), so pause
  // everything while the stage is off screen.
  useEffect(() => {
    const stage = videos.current[theme]?.closest('.doc-view');
    const target = videos.current[theme];
    if (!stage || !target) return;

    const sync = () => {
      for (const t of THEMES) {
        const v = videos.current[t.id];
        if (!v) continue;
        if (t.id === theme && onScreen.current && !reduceMotion) {
          v.play().catch(() => {});
        } else {
          v.pause();
        }
      }
    };

    const io = new IntersectionObserver(
      ([e]) => {
        onScreen.current = e.isIntersecting;
        sync();
      },
      { rootMargin: '160px' },
    );
    io.observe(stage);
    sync();
    return () => io.disconnect();
  }, [theme, reduceMotion]);

  return (
    <div className="doc">
      <div className="doc-stage reveal">
        <div className="ui-bar chrome">
          <i></i><i></i><i></i>
          <span className="chrome-url">docucaine.co.in — {label}</span>
          <a className="chrome-open" href="https://www.docucaine.co.in" target="_blank" rel="noopener">
            open <svg className="ic"><use href="#i-arrow" /></svg>
          </a>
        </div>
        <div className="doc-view">
          {THEMES.map((t) => (
            <video
              key={t.id}
              ref={(el) => {
                videos.current[t.id] = el;
              }}
              className={t.id === theme ? 'is-on' : ''}
              muted
              loop
              playsInline
              preload="auto"
              poster={`/assets/docucaine/${t.id}.jpg`}
              src={`/assets/docucaine/${t.id}.mp4`}
            />
          ))}
        </div>
      </div>

      <div className="doc-themes reveal" role="group" aria-label="Docucaine themes">
        {THEMES.map((t) => (
          <button
            key={t.id}
            className={`doc-theme${t.id === theme ? ' is-on' : ''}`}
            onClick={() => setTheme(t.id)}
          >
            <img src={`/assets/docucaine/${t.id}.jpg`} alt="" loading="lazy" />
            <span>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
