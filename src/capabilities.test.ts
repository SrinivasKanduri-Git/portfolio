import { describe, it, expect } from 'vitest';
import { detectTier } from './capabilities';

const fakeWin = (over: Partial<any>) => ({
  matchMedia: (q: string) => ({
    matches: q.includes('reduced-motion') ? !!over.reduced : (over.mqMatches ?? false),
  }),
  innerWidth: over.width ?? 1440,
  __webgl: over.webgl ?? true,
  ...over,
}) as any;

describe('detectTier', () => {
  it('returns fallback when reduced-motion is set', () => {
    expect(detectTier(fakeWin({ reduced: true }))).toBe('fallback');
  });
  it('returns fallback when no WebGL', () => {
    expect(detectTier(fakeWin({ webgl: false }))).toBe('fallback');
  });
  it('returns lite on small viewport (mobile keeps the 3D stage)', () => {
    expect(detectTier(fakeWin({ width: 600 }))).toBe('lite');
  });
  it('returns full on a capable desktop', () => {
    expect(detectTier(fakeWin({}))).toBe('full');
  });
  it('returns lite on a wide desktop with a software rasteriser (no real GPU)', () => {
    expect(detectTier(fakeWin({ __weakGPU: true }))).toBe('lite');
  });
  it('returns full on a wide desktop with a real GPU', () => {
    expect(detectTier(fakeWin({ __weakGPU: false }))).toBe('full');
  });
  it('honours the ?tier= QA override', () => {
    expect(detectTier(fakeWin({ location: { search: '?tier=lite' } }))).toBe('lite');
    expect(detectTier(fakeWin({ location: { search: '?tier=full' }, reduced: true }))).toBe('full');
  });
});
