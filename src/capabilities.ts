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

// Software rasterisers only (no GPU at all: VMs, headless, broken drivers) —
// they truly cannot sustain the full pipeline. Real integrated GPUs (Intel
// Iris/UHD, mobile) stay on the full tier: measured on Iris Xe, the full
// pipeline holds 60fps once shaders are pre-warmed, and demoting them visibly
// degrades the stage (no bloom, no shadows) for no felt smoothness win.
const SOFTWARE_GL = /(swiftshader|llvmpipe|softpipe|software)/i;

export function detectWeakGPU(win: Window = window): boolean {
  // test hook
  if (typeof (win as any).__weakGPU === 'boolean') return (win as any).__weakGPU;
  try {
    const c = win.document.createElement('canvas');
    const gl = (c.getContext('webgl2') || c.getContext('webgl')) as WebGLRenderingContext | null;
    if (!gl) return false;
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
    return SOFTWARE_GL.test(renderer);
  } catch {
    return false;
  }
}

export function detectTier(win: Window = window): Tier {
  // explicit override for testing/QA: ?tier=lite|full|fallback
  const forced = new URLSearchParams(win.location?.search).get('tier');
  if (forced === 'lite' || forced === 'full' || forced === 'fallback') return forced;
  if (prefersReducedMotion(win)) return 'fallback';
  if (!hasWebGL(win)) return 'fallback';
  // small viewports still get the 3D stage — just the lean version of it
  // (no post-processing, no shadow maps, capped DPR), so every device shares
  // the same soundstage look
  if ((win.innerWidth ?? 0) < 900) return 'lite';
  // only genuinely GPU-less environments (software rasterisers) get demoted —
  // real integrated GPUs keep the full look
  if (detectWeakGPU(win)) return 'lite';
  return 'full';
}
