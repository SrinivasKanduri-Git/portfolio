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
  it('returns fallback on small viewport', () => {
    expect(detectTier(fakeWin({ width: 600 }))).toBe('fallback');
  });
  it('returns full on a capable desktop', () => {
    expect(detectTier(fakeWin({}))).toBe('full');
  });
});
