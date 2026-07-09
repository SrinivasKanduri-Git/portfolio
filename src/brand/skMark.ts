/**
 * Canonical SK monogram geometry, machine-measured from public/assets/sk-logo.png
 * (288px source; unit = outer ring's outer edge, +y up, horns dropped by design).
 *
 * Method: pixel classification into saturated "tube body" masks (blue: G>120,
 * B>180 · red: R>160, B<150), least-squares circle fit for the rings, total-
 * least-squares line fits per stroke edge, corners reconstructed as exact line
 * intersections. Verified by overlaying the polygons on the source at 4x.
 *
 * Single source of truth: SKLogo.tsx extrudes these polygons in 3D and
 * CurtainIntro.tsx renders the same data as its SVG twin.
 */

export type P2 = [number, number];

/** Neon palette sampled from the source tubes. */
export const SK = {
  blue: '#31aefc', // saturated tube body
  blueHot: '#dffaff', // white-hot inline
  blueRim: '#000d55', // dark navy tube edge
  red: '#de0402',
  redHot: '#ffd9d4',
  redRim: '#38020a',
  ink: '#04040a',
} as const;

/** Double ring — two concentric tubes with a dark gap between (measured radii).
 *  The inner tube is deliberately thicker than the outer one, like the source. */
export const RING_OUTER = { rOut: 1.0, rIn: 0.9649 } as const;
export const RING_INNER = { rOut: 0.9017, rIn: 0.85 } as const;

/**
 * The inner circle is CUT where the letters pass through it (visible in the
 * source): the K stem top/bottom, both K arms and the S's bottom stroke break
 * the ring, their tips ending inside the cleared gap. Angles in degrees,
 * measured at the ring's centreline; `half` is the angular half-width of each cut.
 */
export const INNER_RING_CUTS: { a: number; half: number }[] = [
  { a: 89.8, half: 5.9 }, // K stem, top
  { a: -90.2, half: 5.9 }, // K stem, bottom
  { a: 34.0, half: 5.8 }, // K upper arm
  { a: -33.7, half: 5.8 }, // K lower arm
  { a: -145.5, half: 5.7 }, // S bottom stroke
];

/** the visible arcs of the inner ring: [startDeg, endDeg] sweeps between cuts */
export function innerRingArcs(): [number, number][] {
  const cuts = [...INNER_RING_CUTS].sort((p, q) => p.a - q.a);
  const arcs: [number, number][] = [];
  for (let i = 0; i < cuts.length; i++) {
    const from = cuts[i].a + cuts[i].half;
    const next = cuts[(i + 1) % cuts.length];
    const to = i === cuts.length - 1 ? next.a - next.half + 360 : next.a - next.half;
    if (to > from) arcs.push([from, to]);
  }
  return arcs;
}

/**
 * The K as one welded polygon: stem + two arms (union computed offline).
 * Stem x ∈ [-0.065, 0.058]; upper arm rises at +37.0°, lower falls at -34.3°
 * (the source is asymmetric on purpose). Stem and arm tips run to r = 0.90,
 * ending inside the inner ring's cleared cuts exactly like the source.
 */
export const K_BODY: P2[] = [
  [+0.1501, -0.0192],
  [+0.7774, +0.4536],
  [+0.7098, +0.5533],
  [+0.058, +0.0619],
  [+0.058, +0.9],
  [-0.065, +0.9],
  [-0.065, -0.9],
  [+0.058, -0.9],
  [+0.058, -0.0986],
  [+0.7144, -0.5473],
  [+0.7797, -0.4495],
];

/**
 * The angular S — two interleaved chevron strokes (a folded ribbon), not one
 * blob: the spine is double-railed with a dark slot between the rails.
 * S_TOP: top bar → left fold → down-right rail, dagger-cut tail.
 * S_BOT: pointed head rail → right fold → bottom bar, dagger-cut tip.
 * All rails share slope -1.4443; bars run at ~0.57/0.53; stroke width ≈ 0.10.
 */
export const S_TOP: P2[] = [
  [-0.1701, +0.7006], // top tip, upper corner
  [-0.6749, +0.4128], // fold outer, top
  [-0.7017, +0.2833], // fold outer, bottom
  [-0.3612, -0.2084], // tail tip, left
  [-0.3105, -0.1039], // tail tip, right
  [-0.6131, +0.3331], // fold inner
  [-0.1739, +0.5834], // top tip, lower corner
];

export const S_BOT: P2[] = [
  [-0.4627, +0.3782], // head tip, top
  [-0.1335, -0.0973], // right fold outer, top
  [-0.157, -0.2523], // right fold outer, bottom
  [-0.697, -0.5388], // bottom tip, lower
  [-0.6689, -0.4127], // bottom tip, upper
  [-0.2124, -0.1705], // fold inner
  [-0.4935, +0.2355], // head tip, bottom
];

/** polygon inset (positive d = inward) with clamped miter joins */
export function insetPoly(pts: P2[], d: number): P2[] {
  const n = pts.length;
  let area = 0;
  for (let i = 0; i < n; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % n];
    area += x1 * y2 - x2 * y1;
  }
  const sign = area > 0 ? 1 : -1;
  return pts.map((p, i) => {
    const prev = pts[(i - 1 + n) % n];
    const next = pts[(i + 1) % n];
    const norm = ([ax, ay]: P2): P2 => {
      const l = Math.hypot(ax, ay) || 1;
      return [ax / l, ay / l];
    };
    const e1 = norm([p[0] - prev[0], p[1] - prev[1]]);
    const e2 = norm([next[0] - p[0], next[1] - p[1]]);
    const n1: P2 = [-e1[1] * sign, e1[0] * sign];
    const n2: P2 = [-e2[1] * sign, e2[0] * sign];
    const bis = norm([n1[0] + n2[0], n1[1] + n2[1]]);
    const cosHalf = Math.max(0.35, Math.sqrt(Math.max(0, (1 + (n1[0] * n2[0] + n1[1] * n2[1])) / 2)));
    return [p[0] + (bis[0] * d) / cosHalf, p[1] + (bis[1] * d) / cosHalf];
  });
}

/** SVG path for a polygon, mapped into a viewBox (unit → cx/cy ± scale, y flipped). */
export function polySvgPath(pts: P2[], cx: number, cy: number, scale: number): string {
  return (
    pts
      .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${(cx + x * scale).toFixed(2)} ${(cy - y * scale).toFixed(2)}`)
      .join('') + 'Z'
  );
}
