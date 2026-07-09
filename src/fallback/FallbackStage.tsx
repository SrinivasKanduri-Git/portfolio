import { useEffect, useRef } from 'react';

/**
 * The no-WebGL stage: a lit soundstage rendered in pure CSS (warm key glow,
 * grain) with light scroll parallax. Ships to reduced-motion / small-viewport /
 * no-WebGL clients so the three.js bundle never loads. The DOM HUD carries all
 * the real content on top.
 */
export function FallbackStage() {
  const glow = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (glow.current) glow.current.style.transform = `translateY(${window.scrollY * 0.12}px)`;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="fallback-stage" aria-hidden="true">
      <div ref={glow} className="fallback-glow" />
      <div className="fallback-grain" />
    </div>
  );
}
