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

const D2R = Math.PI / 180;
const INNER_MID = (RING_INNER.rOut + RING_INNER.rIn) / 2;

/**
 * The inner circle is CUT only where the K arms and the S's bottom stroke pass
 * through it (visible in the source). The K stem does NOT cut the ring — the
 * middle line merges straight into the circle with no gap. Every cut is ANGULAR:
 * the ring's end faces run PARALLEL to the crossing stroke's edges, leaving a
 * uniform dark slot beside the letter — never a blunt radial chop.
 *
 * a   = ring angle (deg) where the stroke crosses the centreline,
 * phi = the stroke's direction (deg), so the faces slant to match it,
 * w   = half-slot: half the stroke width plus the visible dark gap.
 */
export type RingCrossing = { a: number; phi: number; w: number };
export const RING_CROSSINGS: RingCrossing[] = [
  { a: 34.0, phi: 37.0, w: 0.09 }, // K upper arm
  { a: -33.7, phi: -34.3, w: 0.09 }, // K lower arm
  { a: -145.5, phi: -152.0, w: 0.082 }, // S bottom stroke
];

/** intersection of the line (p + t·d) with the circle r=r, root nearest angle a (deg) */
function lineCircle(p: P2, d: P2, r: number, aDeg: number): P2 {
  const A = d[0] * d[0] + d[1] * d[1];
  const B = 2 * (p[0] * d[0] + p[1] * d[1]);
  const C = p[0] * p[0] + p[1] * p[1] - r * r;
  const s = Math.sqrt(Math.max(0, B * B - 4 * A * C));
  const cand: P2[] = [
    [p[0] + ((-B + s) / (2 * A)) * d[0], p[1] + ((-B + s) / (2 * A)) * d[1]],
    [p[0] + ((-B - s) / (2 * A)) * d[0], p[1] + ((-B - s) / (2 * A)) * d[1]],
  ];
  const target = ((aDeg % 360) + 360) % 360;
  const off = (q: P2) => {
    const a = ((Math.atan2(q[1], q[0]) / D2R) % 360 + 360) % 360;
    const dd = Math.abs(a - target);
    return Math.min(dd, 360 - dd);
  };
  return off(cand[0]) <= off(cand[1]) ? cand[0] : cand[1];
}

type Face = { a: number; outer: P2; inner: P2 };

/** the two angular ring-end faces one crossing carves, ordered low→high angle */
function crossingFaces(c: RingCrossing): [Face, Face] {
  const cc: P2 = [INNER_MID * Math.cos(c.a * D2R), INNER_MID * Math.sin(c.a * D2R)];
  const dir: P2 = [Math.cos(c.phi * D2R), Math.sin(c.phi * D2R)];
  const nrm: P2 = [-Math.sin(c.phi * D2R), Math.cos(c.phi * D2R)];
  const faces = [1, -1].map((sgn): Face => {
    const p: P2 = [cc[0] + nrm[0] * c.w * sgn, cc[1] + nrm[1] * c.w * sgn];
    const outer = lineCircle(p, dir, RING_INNER.rOut, c.a);
    const inner = lineCircle(p, dir, RING_INNER.rIn, c.a);
    const a = Math.atan2((outer[1] + inner[1]) / 2, (outer[0] + inner[0]) / 2) / D2R;
    return { a, outer, inner };
  });
  return faces[0].a <= faces[1].a ? [faces[0], faces[1]] : [faces[1], faces[0]];
}

/** points of an arc r=r from a0→a1 (deg, CCW if a1>a0), ~2° tessellation */
function arcPts(r: number, a0: number, a1: number): P2[] {
  const n = Math.max(2, Math.ceil(Math.abs(a1 - a0) / 2));
  const out: P2[] = [];
  for (let i = 0; i <= n; i++) {
    const a = (a0 + ((a1 - a0) * i) / n) * D2R;
    out.push([r * Math.cos(a), r * Math.sin(a)]);
  }
  return out;
}

/**
 * The visible inner-ring arcs as filled polygons. Each segment runs from one
 * crossing's trailing (high-angle) face to the next crossing's leading
 * (low-angle) face; the two straight end faces are the angular cuts.
 */
export function innerRingSegments(): P2[][] {
  const bounds: Face[] = [];
  for (const c of RING_CROSSINGS) bounds.push(...crossingFaces(c));
  bounds.sort((p, q) => p.a - q.a); // → lo,hi, lo,hi, lo,hi
  const segs: P2[][] = [];
  for (let i = 1; i < bounds.length; i += 2) {
    const start = bounds[i]; // a trailing (high) face
    const end = bounds[(i + 1) % bounds.length]; // next leading (low) face
    const ang = (q: P2) => Math.atan2(q[1], q[0]) / D2R;
    const a0o = ang(start.outer);
    let a1o = ang(end.outer);
    while (a1o <= a0o) a1o += 360;
    const a0i = ang(start.inner);
    let a1i = ang(end.inner);
    while (a1i <= a0i) a1i += 360;
    const poly: P2[] = [
      ...arcPts(RING_INNER.rOut, a0o, a1o), // outer edge, CCW: start.outer → end.outer
      ...arcPts(RING_INNER.rIn, a1i, a0i), // straight face → then inner edge CW back to start.inner
    ];
    segs.push(poly);
  }
  return segs;
}

/**
 * The K as one welded polygon: stem + two arms (union computed offline).
 * Stem x ∈ [-0.065, 0.058]; upper arm rises at +37.0°, lower falls at -34.3°
 * (the source is asymmetric on purpose). Stem and arm tips run to r = 0.90,
 * ending inside the inner ring's cleared cuts exactly like the source.
 */
export const K_BODY: P2[] = [
  [+0.1501, -0.0192],
  [+0.7788, +0.4544], // upper arm tip — flush on the inner ring (r=rOut), completes the circle
  [+0.7111, +0.5543], // upper arm tip, inner side
  [+0.058, +0.0619],
  [+0.058, +0.9],
  [-0.065, +0.9],
  [-0.065, -0.9],
  [+0.058, -0.9],
  [+0.058, -0.0986],
  [+0.7157, -0.5483], // lower arm tip, inner side
  [+0.7811, -0.4503], // lower arm tip — flush on the inner ring (r=rOut), completes the circle
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
  [-0.7501, -0.5668], // bottom tip, lower — pokes through the ring (dagger cut)
  [-0.7189, -0.4407], // bottom tip, upper
  [-0.2124, -0.1705], // fold inner
  [-0.4935, +0.2355], // head tip, bottom
];

/** polygon inset (positive d = inward) with clamped miter joins.
 *  `miterFloor` caps the spike at sharp corners: offset ≤ d / miterFloor —
 *  raise it toward 1 for thin strokes with dagger tips so the inset can never
 *  cross the opposite edge and fold the polygon into a bowtie. */
export function insetPoly(pts: P2[], d: number, miterFloor = 0.35): P2[] {
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
    const cosHalf = Math.max(miterFloor, Math.sqrt(Math.max(0, (1 + (n1[0] * n2[0] + n1[1] * n2[1])) / 2)));
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
