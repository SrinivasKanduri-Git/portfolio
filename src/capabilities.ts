export type Tier = 'full' | 'lite' | 'fallback';

export function prefersReducedMotion(win: Window = window): boolean {
  return win.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

export function hasWebGL(win: Window = window): boolean {
  // test hook for unit tests
  if (typeof (win as any).__webgl === 'boolean') return (win as any).__webgl;
  try {
    const c = win.document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

export function detectTier(win: Window = window): Tier {
  if (prefersReducedMotion(win)) return 'fallback';
  if (!hasWebGL(win)) return 'fallback';
  // small viewports still get the 3D stage — just the lean version of it
  // (no post-processing, no shadow maps, capped DPR), so every device shares
  // the same soundstage look
  if ((win.innerWidth ?? 0) < 900) return 'lite';
  return 'full';
}
