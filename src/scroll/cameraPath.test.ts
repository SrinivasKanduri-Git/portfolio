import { describe, it, expect } from 'vitest';
import { cameraPath } from './cameraPath';

describe('cameraPath', () => {
  it('pushes inward (z decreases) from curtain to mid', () => {
    expect(cameraPath(0).pos[2]).toBeGreaterThan(cameraPath(0.5).pos[2]);
  });
  it('is monotonic on X (dolly stage-left) across sets', () => {
    const xs = [0, 0.25, 0.5, 0.75, 1].map((p) => cameraPath(p).pos[0]);
    for (let i = 1; i < xs.length; i++) expect(xs[i]).toBeLessThanOrEqual(xs[i - 1] + 1e-6);
  });
  it('clamps out-of-range progress', () => {
    expect(cameraPath(-1)).toEqual(cameraPath(0));
    expect(cameraPath(2)).toEqual(cameraPath(1));
  });
});
