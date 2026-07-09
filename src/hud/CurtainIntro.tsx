import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { innerRingArcs, K_BODY, polySvgPath, RING_INNER, RING_OUTER, S_BOT, S_TOP } from '../brand/skMark';

const CX = 100;
const CY = 100;
const R = 86; // unit → viewBox scale, leaves margin for the glow

/** stroked arc along a ring's centreline between two unit-space angles (deg, y up) */
function arcPath(r: number, a0: number, a1: number): string {
  const p = (a: number) => [CX + r * R * Math.cos((a * Math.PI) / 180), CY - r * R * Math.sin((a * Math.PI) / 180)];
  const [x0, y0] = p(a0);
  const [x1, y1] = p(a1);
  const large = a1 - a0 > 180 ? 1 : 0;
  const rr = (r * R).toFixed(2);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)}A${rr} ${rr} 0 ${large} 0 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

/**
 * The SK monogram — the SVG twin of the 3D sign on stage, generated from the
 * same canonical geometry so the slate and the stage carry the exact mark.
 * Glossy like the source render: top-lit gradients, the inner ring cut where
 * the letters pass through it.
 */
function GlossMark({ gRing, gK, gS }: { gRing: React.Ref<SVGGElement>; gK: React.Ref<SVGGElement>; gS: React.Ref<SVGGElement> }) {
  const ringMid = (RING_OUTER.rOut + RING_OUTER.rIn) / 2;
  const ringW = (RING_OUTER.rOut - RING_OUTER.rIn) * R;
  const innerMid = (RING_INNER.rOut + RING_INNER.rIn) / 2;
  const innerW = (RING_INNER.rOut - RING_INNER.rIn) * R;
  const kFill = polySvgPath(K_BODY, CX, CY, R);
  const sFill = [S_TOP, S_BOT].map((p) => polySvgPath(p, CX, CY, R)).join('');

  return (
    <svg className="neon-mark" viewBox="0 0 200 200" aria-hidden="true">
      <defs>
        <linearGradient id="skBlue" x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stopColor="#8fdcff" />
          <stop offset="0.45" stopColor="#0aa2ff" />
          <stop offset="1" stopColor="#0058c8" />
        </linearGradient>
        <linearGradient id="skRed" x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stopColor="#ff8a97" />
          <stop offset="0.45" stopColor="#ff1236" />
          <stop offset="1" stopColor="#a4001d" />
        </linearGradient>
      </defs>
      {/* no SVG blur filter here — it forces a full repaint per animation frame
          and stutters the open; the gradients carry the gloss on their own */}
      <g>
        <g ref={gRing}>
          <circle cx={CX} cy={CY} r={ringMid * R} fill="none" stroke="url(#skBlue)" strokeWidth={ringW} />
          {/* inner ring: arcs between the letter cuts, like the source */}
          {innerRingArcs().map(([a0, a1]) => (
            <path key={a0} d={arcPath(innerMid, a0, a1)} fill="none" stroke="url(#skBlue)" strokeWidth={innerW} />
          ))}
        </g>
        <g ref={gK}>
          <path d={kFill} fill="url(#skBlue)" stroke="#052a66" strokeWidth="0.5" />
        </g>
        <g ref={gS}>
          <path d={sFill} fill="url(#skRed)" stroke="#4d0206" strokeWidth="0.5" />
        </g>
      </g>
    </svg>
  );
}

/**
 * The cold open: the SK mark assembles on a clapped slate (mark scales up,
 * ring and letters fade in), the clap snaps, then the stage curtains part onto
 * the already-lit 3D sign. Skippable; bypassed for reduced-motion.
 */
export function CurtainIntro({ onDone, skip }: { onDone: () => void; skip: boolean }) {
  const [gone, setGone] = useState(skip);
  const root = useRef<HTMLDivElement>(null);
  const left = useRef<HTMLDivElement>(null);
  const right = useRef<HTMLDivElement>(null);
  const clap = useRef<HTMLDivElement>(null);
  const slate = useRef<HTMLDivElement>(null);
  const markWrap = useRef<HTMLDivElement>(null);
  const gRing = useRef<SVGGElement>(null);
  const gK = useRef<SVGGElement>(null);
  const gS = useRef<SVGGElement>(null);
  const tl = useRef<gsap.core.Timeline>(null);

  useEffect(() => {
    if (skip) {
      onDone();
      return;
    }
    if (!slate.current) return; // already gone (e.g. HMR remount after finish)
    const finish = () => {
      // the intro is over — always land the viewer at the very top of the show,
      // whatever the browser tried to restore
      window.scrollTo(0, 0);
      setGone(true);
      onDone();
    };
    // paused: the 3D stage compiles its shaders during the first frames — start
    // the choreography two RAFs later so it never animates through that hitch
    const t = gsap.timeline({ onComplete: finish, paused: true });
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => t.play());
    });
    tl.current = t;
    // the mark assembles: the wrapper (a composited HTML div, not the SVG) scales
    // up so vector geometry is never re-rasterised per frame; the ring and letters
    // fade in on staggered opacity only — one smooth build, no stutter, no glow
    t.set([gRing.current, gK.current, gS.current], { opacity: 0 })
      .set(markWrap.current, { scale: 0.9, transformOrigin: '50% 50%' })
      .from(slate.current, { opacity: 0, y: 18, duration: 0.55, ease: 'power3.out' })
      .to(markWrap.current, { scale: 1, duration: 0.9, ease: 'power3.out' }, 0.35)
      .to(gRing.current, { opacity: 1, duration: 0.7, ease: 'power2.out' }, 0.4)
      .to(gK.current, { opacity: 1, duration: 0.6, ease: 'power2.out' }, 0.68)
      .to(gS.current, { opacity: 1, duration: 0.6, ease: 'power2.out' }, 0.82)
      .to(clap.current, { rotate: -22, duration: 0.14, ease: 'power3.in' }, '+=0.2')
      .to(clap.current, { rotate: 0, duration: 0.09, ease: 'power4.out' })
      .to(slate.current, { scale: 1.03, duration: 0.07, yoyo: true, repeat: 1, ease: 'power1.inOut' }, '<')
      .to(slate.current, { opacity: 0, scale: 0.985, duration: 0.45, ease: 'power2.inOut' }, '+=0.3')
      .to(left.current, { xPercent: -100, duration: 1.15, ease: 'power3.inOut' }, '-=0.15')
      .to(right.current, { xPercent: 100, duration: 1.15, ease: 'power3.inOut' }, '<')
      .to(root.current, { opacity: 0, duration: 0.45, ease: 'power1.out' }, '-=0.4');
    return () => {
      cancelAnimationFrame(raf);
      t.kill();
    };
  }, [skip, onDone]);

  if (gone) return null;

  const skipNow = () => {
    tl.current?.kill();
    window.scrollTo(0, 0);
    setGone(true);
    onDone();
  };

  return (
    <div ref={root} className="curtain" aria-hidden="true">
      <div ref={left} className="curtain-panel curtain-left" />
      <div ref={right} className="curtain-panel curtain-right" />
      <div className="curtain-bar curtain-bar-top" />
      <div className="curtain-bar curtain-bar-bottom" />
      <div ref={slate} className="curtain-slate">
        <div ref={markWrap} className="neon-mark-wrap"><GlossMark gRing={gRing} gK={gK} gS={gS} /></div>
        <div ref={clap} className="clap-bar" />
        <span className="clap-prod">PROD. 001</span>
        <span className="clap-name">S. KANDURI</span>
        <span className="clap-scene">SOUNDSTAGE · SC.01–03 · TAKE 1</span>
      </div>
      <button className="curtain-skip" onClick={skipNow}>skip intro →</button>
    </div>
  );
}
