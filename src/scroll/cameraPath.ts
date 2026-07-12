type Vec3 = [number, number, number];
type Frame = { pos: Vec3; target: Vec3 };

// Named waypoints. Stage-left dolly (X decreases through the sets),
// pushing inward toward the sets (Z decreases) after the curtain.
// Sets are spaced far apart (0, -13, -26, -39) so fog hides the neighbours and
// each scene owns the frame. `at` fractions are calibrated to the HUD:
// progress = scrollY / (cinematic-end − 100vh); hero is 100vh + three 128vh
// scenes → zone = 384vh, scene sections span p ≈ 0.26–0.59 / 0.59–0.93 / 0.93–1.
//
// Each set gets a DWELL — two waypoints sharing one frame — spanning most of
// the scroll range its HUD card is on screen, so the subject holds framed
// beside its copy instead of drifting past it. The monotone-cubic interpolant
// gives zero velocity across a flat pair, easing into and out of every hold.
const HERO: Frame = { pos: [  0,    1.8,  7.0], target: [  0,    1.78, 0] };
const WORK: Frame = { pos: [-13.25, 1.62, 6.7], target: [-13.25, 1.4, 0] };
const SC1:  Frame = { pos: [-26.25, 1.4,  5.9], target: [-26.25, 1.25, 0] };
const SC2:  Frame = { pos: [-39.25, 1.4,  5.2], target: [-39.25, 1.32, 0] };
const SC3:  Frame = { pos: [-52.35, 1.25, 5.4], target: [-52.35, 1.25, 0] };
// Zone recomputed for 4 scenes: sections start 100/228/356/484vh, cinematic-end
// 612vh, zone = 612−100 = 512vh. A 128vh section dominates the viewport (≥65%)
// over p ≈ [(S−35)/512, (S+63)/512]: work 0.13–0.32, sc1 0.38–0.57,
// sc2 0.63–0.82, sc3 0.88–1.0. Each set is parked (a flat dwell pair) across
// that span; transitions are squeezed into the gaps.
const WAYPOINTS: { at: number; frame: Frame }[] = [
  { at: 0.0,  frame: { pos: [0, 1.8, 8.4], target: [0, 1.78, 0] } }, // top — sign framed wide
  { at: 0.05, frame: HERO }, // hero hold
  { at: 0.10, frame: HERO },
  { at: 0.14, frame: WORK }, // FleetEnable parked
  { at: 0.32, frame: WORK },
  { at: 0.40, frame: SC1 },  // SC.01 parked
  { at: 0.57, frame: SC1 },
  { at: 0.65, frame: SC2 },  // SC.02 parked
  { at: 0.82, frame: SC2 },
  { at: 0.90, frame: SC3 },  // SC.03 parked to the end
  { at: 1.0,  frame: SC3 },
];

/**
 * Monotone cubic Hermite tangents (Fritsch–Carlson). Unlike per-segment
 * smoothstep, the dolly keeps velocity *through* each waypoint — no dead stop
 * at every set — and unlike Catmull-Rom it can never overshoot, so the
 * stage-left travel stays strictly monotonic.
 */
function monotoneTangents(xs: number[], ys: number[]): number[] {
  const n = xs.length;
  const d: number[] = [];
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  const m = new Array<number>(n);
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / d[i];
    const b = m[i + 1] / d[i];
    const s = a * a + b * b;
    if (s > 9) {
      const t = 3 / Math.sqrt(s);
      m[i] = t * a * d[i];
      m[i + 1] = t * b * d[i];
    }
  }
  return m;
}

const XS = WAYPOINTS.map((w) => w.at);
// six channels: pos xyz, target xyz — each gets its own monotone interpolant
const CHANNELS = [0, 1, 2, 3, 4, 5].map((c) => {
  const ys = WAYPOINTS.map((w) => (c < 3 ? w.frame.pos[c] : w.frame.target[c - 3]));
  return { ys, ms: monotoneTangents(XS, ys) };
});

function evalChannel(p: number, ys: number[], ms: number[]): number {
  let i = 0;
  while (i < XS.length - 2 && p > XS[i + 1]) i++;
  const h = XS[i + 1] - XS[i];
  const t = (p - XS[i]) / h;
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    (2 * t3 - 3 * t2 + 1) * ys[i] +
    (t3 - 2 * t2 + t) * h * ms[i] +
    (-2 * t3 + 3 * t2) * ys[i + 1] +
    (t3 - t2) * h * ms[i + 1]
  );
}

export function cameraPath(progress: number): Frame {
  const p = Math.min(1, Math.max(0, progress));
  const v = CHANNELS.map((ch) => evalChannel(p, ch.ys, ch.ms));
  return {
    pos: [v[0], v[1], v[2]],
    target: [v[3], v[4], v[5]],
  };
}
