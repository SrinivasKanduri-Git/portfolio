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
  it('frames the FleetEnable work set at its dwell (x ≈ -13.25)', () => {
    // work dwell spans p ≈ 0.14–0.32; sample the middle
    expect(cameraPath(0.23).pos[0]).toBeCloseTo(-13.25, 1);
  });
  it('frames each personal set at its dwell after the -13 shift', () => {
    expect(cameraPath(0.48).pos[0]).toBeCloseTo(-26.25, 1); // SC1 dwell 0.40–0.57
    expect(cameraPath(0.73).pos[0]).toBeCloseTo(-39.25, 1); // SC2 dwell 0.65–0.82
    expect(cameraPath(1.0).pos[0]).toBeCloseTo(-52.35, 1);  // SC3 dwell to end
  });
});
