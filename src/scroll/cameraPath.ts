type Vec3 = [number, number, number];
type Frame = { pos: Vec3; target: Vec3 };

// Named waypoints. Stage-left dolly (X decreases through the sets),
// pushing inward toward the sets (Z decreases) after the curtain.
// Sets are spaced far apart (0, -12, -24) so fog hides the neighbours and each
// scene owns the frame. Camera dollies stage-left, straight-on, close in.
// `at` fractions are calibrated to the HUD: progress = scrollY / (cinematic-end
// − 100vh); hero is 100vh + three 128vh scenes, so scene centres land at
// p ≈ 0.297 / 0.63 / 0.964. sc1/sc2 camera sits ~0.45 left of the set so the
// subject lands centre-right of frame, clear of the copy rail on the left.
const WAYPOINTS: { at: number; frame: Frame }[] = [
  { at: 0.0,  frame: { pos: [  0, 1.45, 8.4], target: [  0, 1.42, 0] } }, // top — SK logo framed
  { at: 0.12, frame: { pos: [  0, 1.45, 7.0], target: [  0, 1.42, 0] } }, // hero — SK logo
  { at: 0.30, frame: { pos: [-13.25, 1.4, 5.9], target: [-13.25, 1.25, 0] } }, // robot  (SC.01)
  { at: 0.63, frame: { pos: [-26.25, 1.15, 5.2], target: [-26.25, 0.98, 0] } }, // bugscope (SC.02)
  { at: 0.94, frame: { pos: [-39.35, 1.25, 5.4], target: [-39.35, 1.25, 0] } }, // canvas (SC.03)
  { at: 1.0,  frame: { pos: [-39.35, 1.25, 6.6], target: [-39.35, 1.25, 0] } }, // exit
];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => [
  lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t),
];
const smoothstep = (t: number) => t * t * (3 - 2 * t);

export function cameraPath(progress: number): Frame {
  const p = Math.min(1, Math.max(0, progress));
  let i = 0;
  while (i < WAYPOINTS.length - 1 && p > WAYPOINTS[i + 1].at) i++;
  const a = WAYPOINTS[i];
  const b = WAYPOINTS[Math.min(i + 1, WAYPOINTS.length - 1)];
  const span = b.at - a.at || 1;
  const t = smoothstep((p - a.at) / span);
  return {
    pos: lerp3(a.frame.pos, b.frame.pos, t),
    target: lerp3(a.frame.target, b.frame.target, t),
  };
}
