import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Start Lenis smooth scroll and make GSAP ScrollTrigger read from it as the
 * single source of truth (native scroll is too brittle for tightly-coupled
 * camera/HUD animations). Returns a destroy handle.
 */
export function initSmoothScroll() {
  const lenis = new Lenis({ smoothWheel: true, lerp: 0.085, wheelMultiplier: 0.9 });

  const onScroll = () => ScrollTrigger.update();
  lenis.on('scroll', onScroll);

  const raf = (time: number) => lenis.raf(time * 1000);
  gsap.ticker.add(raf);
  gsap.ticker.lagSmoothing(0);

  // route in-page anchor clicks (nav, spine, CTAs) through Lenis so they
  // dolly smoothly instead of a native jump that desyncs the camera.
  const onClick = (e: MouseEvent) => {
    const a = (e.target as HTMLElement).closest?.('a[href^="#"]') as HTMLAnchorElement | null;
    const id = a?.getAttribute('href');
    if (id && id.length > 1 && document.querySelector(id)) {
      e.preventDefault();
      lenis.scrollTo(id, { offset: -64, duration: 1.2 });
    }
  };
  document.addEventListener('click', onClick);

  return {
    lenis,
    destroy() {
      lenis.off('scroll', onScroll);
      document.removeEventListener('click', onClick);
      gsap.ticker.remove(raf);
      lenis.destroy();
    },
  };
}
