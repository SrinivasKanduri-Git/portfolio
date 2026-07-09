import { useEffect, useRef, useState } from 'react';

const THEMES = [
  { id: 'starry', label: 'Starry Night' },
  { id: 'matrix', label: 'Neon Matrix' },
  { id: 'francis', label: 'Francis' },
  { id: 'neonarc', label: 'Neon Arc' },
] as const;

type ThemeId = (typeof THEMES)[number]['id'];

/** The finale's live embed: the real Docucaine hero, one recorded clip per theme. */
export function Docucaine({ reduceMotion }: { reduceMotion: boolean }) {
  const [theme, setTheme] = useState<ThemeId>('starry');
  const video = useRef<HTMLVideoElement>(null);
  const label = THEMES.find((t) => t.id === theme)!.label;

  useEffect(() => {
    const v = video.current;
    if (v && !reduceMotion) v.play().catch(() => {});
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
          <video
            ref={video}
            key={theme}
            autoPlay={!reduceMotion}
            muted
            loop
            playsInline
            poster={`/assets/docucaine/${theme}.jpg`}
            src={`/assets/docucaine/${theme}.mp4`}
          />
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
