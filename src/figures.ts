/**
 * Chalk stick-figure system. Every figure is stroke-only SVG built from a Pose
 * (joint coordinates), so animation frames are data. Three fidelity tiers:
 *   tier 1 — flipbook: discrete frame swaps, steps(1), no easing (hero, SC.01)
 *   tier 2 — eased CSS motion + line-drawing trails (SC.02)
 *   tier 3 — choreographed Web Animations timeline (SC.03 finale)
 */

import rough from 'roughjs';

const generator = rough.generator();

/** Deterministic string → positive int, so a given figure/prop keeps the
 *  same "hand" across its own flipbook frames while differing scene to scene. */
export function seedFor(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 100000 + 1;
}

const LINE_OPT = { roughness: 1.5, bowing: 1.1 };
const SHAPE_OPT = { roughness: 1.8, bowing: 1.3 };

function toPathTags(drawable: ReturnType<typeof generator.line>, cls = ''): string {
  return generator
    .toPaths(drawable)
    .map((p) => `<path${cls ? ` class="${cls}"` : ''} d="${p.d}"/>`)
    .join('');
}

/** Single jittered stroke between two points. */
export function roughLine(a: Pt, b: Pt, seed: number, cls = ''): string {
  return toPathTags(generator.line(a[0], a[1], b[0], b[1], { ...LINE_OPT, seed }), cls);
}

/** Jittered multi-point stroke (elbow/knee joints), replaces the old `L()` helper. */
export function roughPath(points: Pt[], seed: number, cls = ''): string {
  return toPathTags(generator.linearPath(points, { ...LINE_OPT, seed }), cls);
}

/** Sketchy rectangle. `hachure` adds cross-hatch shading (spec's shading primitive);
 *  rough always emits the fill entry before the border entry when fill is set. */
export function roughRect(x: number, y: number, w: number, h: number, seed: number, hachure = true): string {
  const shape = generator.rectangle(x, y, w, h, {
    ...SHAPE_OPT,
    seed,
    ...(hachure ? { fill: '#000', fillStyle: 'cross-hatch', hachureGap: 5, hachureAngle: -41 } : {}),
  });
  return generator
    .toPaths(shape)
    .map((p, i) => `<path class="${i === 0 && hachure ? 'thin' : ''}" d="${p.d}"/>`)
    .join('');
}

/** Sketchy ellipse (figure heads, gem/engine icon). */
export function roughEllipse(cx: number, cy: number, w: number, h: number, seed: number, cls = ''): string {
  return toPathTags(generator.ellipse(cx, cy, w, h, { ...SHAPE_OPT, seed }), cls);
}

/** Single-pass (no doubled stroke) rectangle path — for shapes an animation
 *  drives via strokeDasharray/offset, where a doubled stroke would need two
 *  independently-animated paths. */
export function roughRectSinglePath(x: number, y: number, w: number, h: number, seed: number): string {
  const shape = generator.rectangle(x, y, w, h, { ...SHAPE_OPT, seed, disableMultiStroke: true });
  return generator.toPaths(shape)[0]!.d;
}

/** Rough figure: same five segments as `figure()`, jittered strokes instead of
 *  clean lines. `seed` keeps one figure's frames consistent; vary seed per
 *  figure/scene so not everything looks identically jittered. */
export function roughFigure(p: Pose, seed: number): string {
  return (
    roughEllipse(p.head[0], p.head[1], 18, 18, seed + 1) +
    roughLine(p.neck, p.hip, seed) +
    roughPath([p.neck, p.armL[0], p.armL[1]], seed + 2) +
    roughPath([p.neck, p.armR[0], p.armR[1]], seed + 3) +
    roughPath([p.hip, p.legL[0], p.legL[1]], seed + 4) +
    roughPath([p.hip, p.legR[0], p.legR[1]], seed + 5)
  );
}

export type Pt = [number, number];

export interface Pose {
  head: Pt;
  neck: Pt;
  hip: Pt;
  armL: [Pt, Pt]; // elbow, hand
  armR: [Pt, Pt];
  legL: [Pt, Pt]; // knee, foot
  legR: [Pt, Pt];
}

const L = (a: Pt, b: Pt, c: Pt) => `M${a[0]} ${a[1]} L${b[0]} ${b[1]} L${c[0]} ${c[1]}`;

/** Stroke-only figure markup for one pose. */
export function figure(p: Pose): string {
  return (
    `<circle cx="${p.head[0]}" cy="${p.head[1]}" r="9"/>` +
    `<path d="M${p.neck[0]} ${p.neck[1]} L${p.hip[0]} ${p.hip[1]}"/>` +
    `<path d="${L(p.neck, p.armL[0], p.armL[1])}"/>` +
    `<path d="${L(p.neck, p.armR[0], p.armR[1])}"/>` +
    `<path d="${L(p.hip, p.legL[0], p.legL[1])}"/>` +
    `<path d="${L(p.hip, p.legR[0], p.legR[1])}"/>`
  );
}

/* ---------------------------------------------------------------- poses -- */

/** Walk cycle, viewBox 0 0 80 120. Contact / passing / opposite contact. */
export const WALK: Pose[] = [
  {
    head: [40, 22], neck: [40, 31], hip: [40, 66],
    armL: [[31, 46], [25, 58]], armR: [[49, 46], [55, 58]],
    legL: [[30, 88], [23, 108]], legR: [[50, 88], [58, 108]],
  },
  {
    head: [40, 21], neck: [40, 30], hip: [40, 65],
    armL: [[35, 47], [33, 60]], armR: [[45, 47], [47, 60]],
    legL: [[39, 88], [37, 108]], legR: [[44, 87], [47, 106]],
  },
  {
    head: [40, 22], neck: [40, 31], hip: [40, 66],
    armL: [[49, 46], [55, 58]], armR: [[31, 46], [25, 58]],
    legL: [[50, 88], [58, 108]], legR: [[30, 88], [23, 108]],
  },
];

/** Standing idle, arms down (guide figure at rest). */
export const IDLE: Pose = {
  head: [40, 22], neck: [40, 31], hip: [40, 66],
  armL: [[33, 48], [31, 62]], armR: [[47, 48], [49, 62]],
  legL: [[36, 88], [33, 108]], legR: [[44, 88], [47, 108]],
};

/** Guide figure holding a placard up with one arm. */
export const PRESENT: Pose = {
  head: [40, 22], neck: [40, 31], hip: [40, 66],
  armL: [[33, 48], [31, 62]], armR: [[52, 38], [62, 26]],
  legL: [[36, 88], [33, 108]], legR: [[44, 88], [47, 108]],
};


/** SC.01 pipeline diagram: sources → score → publish, self-animating flow. */
export function pipeDiagram(): string {
  return (
    `<svg class="pipe" viewBox="0 0 220 130" aria-hidden="true">` +
    roughRect(8, 16, 58, 30, seedFor('pipe-sources'), false) + `<text x="37" y="35">sources</text>` +
    roughRect(84, 16, 54, 30, seedFor('pipe-score'), false) + `<text x="111" y="35">score</text>` +
    roughRect(160, 16, 54, 30, seedFor('pipe-publish'), false) + `<text x="187" y="35">publish</text>` +
    roughLine([66, 31], [84, 31], seedFor('pipe-flow-a'), 'pipe-flow') +
    roughLine([138, 31], [160, 31], seedFor('pipe-flow-b'), 'pipe-flow') +
    roughPath([[187, 46], [187, 70], [170, 84], [58, 84], [40, 98], [40, 112]], seedFor('pipe-flow-c'), 'pipe-flow') +
    `<text x="110" y="122">no humans in the loop</text>` +
    `</svg>`
  );
}

/** Per-scene structural border chrome, layered over a sketch frame as an
 *  absolutely-positioned overlay. Visibility is pure CSS (opacity, keyed off
 *  body[data-scene]) — this only builds the markup. */
export function motifChrome(kind: 'ticker' | 'terminal' | 'canvas', seed: number): string {
  if (kind === 'ticker') {
    const notches = Array.from({ length: 10 }, (_, i) =>
      roughLine([i * 10, 0], [i * 10, 4], seed + i, 'thin')).join('');
    return `<svg class="motif motif-ticker" aria-hidden="true">${notches}</svg>`;
  }
  if (kind === 'terminal') {
    return (
      `<svg class="motif motif-terminal" aria-hidden="true">` +
      roughRect(0, 0, 100, 18, seed, false) +
      `<circle class="dot" cx="10" cy="9" r="3"/><circle class="dot" cx="20" cy="9" r="3"/><circle class="dot" cx="30" cy="9" r="3"/>` +
      `</svg>`
    );
  }
  return (
    `<svg class="motif motif-canvas" aria-hidden="true">` +
    roughLine([0, 14], [0, 0], seed) + roughLine([0, 0], [14, 0], seed + 1) +
    roughLine([100, 0], [86, 0], seed + 2) + roughLine([100, 0], [100, 14], seed + 3) +
    `</svg>`
  );
}

/* ------------------------------------------------------------- builders -- */

/** Tier-1 flipbook: stacked frame groups, CSS steps() shows one at a time. */
export function flipbook(frames: string[], viewBox = '0 0 80 120', cls = ''): string {
  const groups = frames
    .map((f, i) => `<g class="fb-f" style="--i:${i}">${f}</g>`)
    .join('');
  return `<svg class="fb fb-${frames.length} ${cls}" viewBox="${viewBox}" style="--n:${frames.length}" aria-hidden="true">${groups}</svg>`;
}

/* --------------------------------------------------- clean-line primitives -- */
/* Crisp stick-figure vocabulary (no rough.js jitter) — circles + straight paths,
 * styled stroke-only by the shared .fb rules. Detail comes from more strokes,
 * not from texture. */

const cl = (pts: Pt[], cls = ''): string =>
  `<path${cls ? ` class="${cls}"` : ''} d="${pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]} ${p[1]}`).join(' ')}"/>`;
const cc = (cx: number, cy: number, r: number, cls = ''): string =>
  `<circle${cls ? ` class="${cls}"` : ''} cx="${cx}" cy="${cy}" r="${r}"/>`;
const cr = (x: number, y: number, w: number, h: number, cls = '', rx = 0): string =>
  `<rect${cls ? ` class="${cls}"` : ''} x="${x}" y="${y}" width="${w}" height="${h}"${rx ? ` rx="${rx}"` : ''}/>`;

/* -------------------------------------------------- cold open (day/night) -- */

/** Rising/​setting celestial body, pinned top-right. Same anchor for sun & moon
 *  so the two hero frames read as one place at two times of day. */
const SKY_ANCHOR: Pt = [172, 26];

function sun(): string {
  const [cx, cy] = SKY_ANCHOR;
  const rays = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2;
    return cl([[cx + Math.cos(a) * 14, cy + Math.sin(a) * 14], [cx + Math.cos(a) * 20, cy + Math.sin(a) * 20]], 'ray');
  }).join('');
  return `<g class="sky-body sun">${cc(cx, cy, 11)}${rays}</g>`;
}

function moon(): string {
  const [cx, cy] = SKY_ANCHOR;
  const R = 12;
  // clean crescent: outer arc down the right side, inner arc back up
  const crescent =
    `<path d="M${cx} ${cy - R} A ${R} ${R} 0 1 1 ${cx} ${cy + R} A ${R * 0.78} ${R * 0.78} 0 1 0 ${cx} ${cy - R} Z"/>`;
  return `<g class="sky-body moon">${crescent}</g>`;
}

function stars(): string {
  const pts: Pt[] = [[24, 20], [58, 34], [96, 16], [128, 40], [44, 50], [150, 60], [80, 26]];
  return pts
    .map((p, i) => `<g class="star" style="--i:${i}">${cl([[p[0] - 2, p[1]], [p[0] + 2, p[1]]], 'thin')}${cl([[p[0], p[1] - 2], [p[0], p[1] + 2]], 'thin')}</g>`)
    .join('');
}

/** Commuter: clean walk pose + a tie and a slung shoulder bag, so the figure
 *  reads as someone heading to a day job rather than a bare stick figure. */
function commuter(p: Pose, _i: number): string {
  const nx = p.neck[0], ny = p.neck[1];
  const knot = cl([[nx - 2, ny + 1], [nx + 2, ny + 1], [nx, ny + 4], [nx - 2, ny + 1]], 'tie');
  const tie = cl([[nx, ny + 4], [nx - 3, ny + 16], [nx, ny + 21], [nx + 3, ny + 16], [nx, ny + 4]], 'tie');
  const strap = cl([[nx - 7, ny + 1], [p.hip[0] + 12, p.hip[1] - 2]], 'thin');
  const bag = cr(p.hip[0] + 6, p.hip[1] - 5, 14, 15, '', 2);
  return figure(p) + strap + bag + knot + tie;
}

const commuterFrames = () => WALK.map((p, i) => commuter(p, i));

/** Cold-open frame 1 — daytime: a suited commuter with a bag paces in, sun rising
 *  at top-right. (No laptop prop — the walk-in itself carries "off to the day job".) */
export function heroDay(): string {
  return (
    `<div class="hero-scene hero-day">` +
    `<svg class="hero-sky" viewBox="0 0 200 120" aria-hidden="true">` +
    sun() +
    cl([[0, 112], [200, 112]], 'ground') +
    `</svg>` +
    `<div class="walk-mover">${flipbook(commuterFrames(), '0 0 80 120')}</div>` +
    `</div>`
  );
}

/** Seated worker hunched over a laptop at a desk. Static base; hands typing is a
 *  small overlaid flipbook so the figure looks like it's working, not posing. */
function deskWorker(): string {
  const desk = cl([[14, 96], [106, 96]], 'ground');
  const laptopBase = cl([[48, 91], [92, 91], [96, 96], [44, 96], [48, 91]]);
  const screen = `<g transform="rotate(-9 70 75)">${cr(50, 61, 40, 28, '', 1)}</g>`;
  const glow = `<g transform="rotate(-9 70 75)">${cr(54, 65, 32, 20, 'screen-glow', 1)}</g>`;
  const body =
    cc(30, 46, 8) +
    cl([[30, 54], [34, 84]]) +          // torso lean toward the laptop
    cl([[34, 84], [56, 84]]) +          // thigh under the desk
    cl([[56, 84], [56, 96]]);           // shin to the floor
  const backArm = cl([[31, 57], [42, 70], [54, 78]]);
  const hands = [0, 1].map((f) =>
    `<g class="type-hand" style="--i:${f}">${cl([[31, 57], [46, 69 - f * 2], [58, 77 + f * 2]])}</g>`,
  ).join('');
  return desk + screen + glow + laptopBase + body + backArm + hands;
}

/** Cold-open frame 2 — night: same person now at the desk working on a laptop,
 *  moon at top-right (same anchor as the sun), faint stars. */
export function heroNight(): string {
  return (
    `<div class="hero-scene hero-night">` +
    `<svg class="hero-sky" viewBox="0 0 200 120" aria-hidden="true">` +
    stars() +
    moon() +
    `<g transform="translate(20 0)">${deskWorker()}</g>` +
    `</svg>` +
    `</div>`
  );
}

/** SC.01 — a robot sits at a desk and writes an article: article lines ink
 *  themselves in one after another while the pen hand nudges down the page. */
export function robotWriter(): string {
  const desk = cl([[6, 104], [114, 104]], 'ground');
  const paperG =
    `<g transform="rotate(-3 78 78)">` +
    cr(58, 58, 40, 44, '', 1) +
    [0, 1, 2, 3, 4].map((i) =>
      `<path class="writeline" style="--i:${i}" d="M64 ${68 + i * 7} L${94 - (i % 2) * 8} ${68 + i * 7}"/>`).join('') +
    `</g>`;
  const antenna = cl([[27, 30], [27, 21]], 'thin') + cc(27, 19, 3);
  const head = cr(16, 30, 22, 18, '', 3) +
    cc(23, 39, 2.4) + cc(31, 39, 2.4) +                 // eyes
    cl([[21, 44], [33, 44]], 'thin');                   // mouth grille
  const torso = cr(18, 50, 20, 26, '', 2) + cl([[22, 58], [34, 58]], 'thin') + cc(28, 66, 2, 'thin');
  const legs = cl([[24, 76], [24, 88], [40, 88]]) + cl([[32, 76], [34, 90], [50, 90]]);
  const backArm = cl([[38, 56], [48, 64], [52, 74]]);
  // writing arm + pen, a 2-frame flipbook so the hand travels down the page
  const writeArm = [0, 1].map((f) =>
    `<g class="robot-hand" style="--i:${f}">` +
    cl([[38, 54], [54, 60 + f * 3], [66, 70 + f * 4]]) +
    cl([[66, 70 + f * 4], [72, 78 + f * 4]], 'pen') +
    `</g>`).join('');
  return (
    `<svg class="robot-writer fb" viewBox="0 0 120 116" aria-hidden="true">` +
    desk + paperG + antenna + head + torso + legs + backArm + writeArm +
    `</svg>`
  );
}

/** Detective in a top hat and trench coat, magnifier held out front — the SC.02
 *  lead who follows the activity trail. Pose is a mid-stride walk-in. */
function detective(): string {
  const p: Pose = {
    head: [40, 30], neck: [40, 39], hip: [40, 70],
    armL: [[33, 54], [31, 66]], armR: [[54, 48], [66, 56]],
    legL: [[34, 92], [28, 112]], legR: [[46, 92], [52, 110]],
  };
  const base = figure(p);
  // top hat: brim across the head, crown above
  const hat = cl([[26, 23], [54, 23]]) + cr(31, 7, 18, 16, '', 1);
  // trench coat: shoulder-to-hem side lines with a flared skirt, belt, centre opening
  const coat =
    cl([[33, 42], [30, 74], [27, 96]]) +          // left side + flare
    cl([[47, 42], [50, 74], [53, 96]]) +          // right side + flare
    cl([[27, 96], [53, 96]], 'thin') +            // hem
    cl([[32, 60], [48, 60]], 'thin') +            // belt
    cl([[40, 42], [40, 92]], 'thin');             // centre seam
  // magnifier in the front hand
  const glass = cc(72, 51, 9, 'lens') + cl([[65, 58], [61, 62]], 'thin');
  return base + coat + hat + glass;
}

/** SC.02 scene: an engine mounts into a Rails app, the app's user-activity trail
 *  ignites request → job → diff → exception, and the detective walks in and
 *  inspects the exception with a magnifier. The trail self-draws (dashoffset). */
export function trailScene(): string {
  const flags = [
    { x: 70, label: 'request' },
    { x: 175, label: 'job' },
    { x: 285, label: 'diff' },
    { x: 395, label: 'exception' },
  ]
    .map(
      (f, i) =>
        `<g class="trail-flag${f.label === 'exception' ? ' trail-flag-exc' : ''}" style="--i:${i}" transform="translate(${f.x} 128)">` +
        `${cl([[0, 0], [0, -16]])}<text x="4" y="-18">${f.label}</text></g>`,
    )
    .join('');

  // opening beat, now meaningful: a labelled Rails app that the engine mounts into.
  // A `mount RubySkope::Engine` block docks onto the app window, after which the
  // trail lights up — the actual USP (drop the engine in, every action traceable).
  const mount =
    `<g class="mount-anim">` +
    cr(6, 4, 150, 40, '', 2) +
    `<text class="mount-app" x="14" y="18">any Rails app</text>` +
    `<g class="mount-engine">${cr(20, 24, 122, 14, '', 2)}` +
    `<text class="mount-code" x="26" y="34">mount RubySkope::Engine</text></g>` +
    `</g>`;

  return (
    `<div class="trail-stage">` +
    `<svg viewBox="0 0 480 150" aria-hidden="true" preserveAspectRatio="xMidYMax meet">` +
    mount +
    cl([[8, 132], [90, 132], [90, 110], [170, 118], [250, 128], [300, 138], [330, 124], [390, 118], [440, 118], [472, 128]], 'trail-line') +
    flags +
    `</svg>` +
    `<svg class="trail-figure" viewBox="0 0 90 120" aria-hidden="true">${detective()}</svg>` +
    `</div>`
  );
}

/** SC.03 stage markup: scattered documents, a canvas frame that draws itself,
 *  and a presenting figure. Choreographed by playFinale(). */
export function finaleStage(): string {
  const docs = ['PDF', 'DOCX', 'XLSX', 'PPTX']
    .map(
      (t, i) =>
        `<g class="doc doc-${i}">${roughRect(0, 0, 46, 58, seedFor(`doc-${i}`), false)}` +
        `${roughLine([8, 14], [38, 14], seedFor(`doc-${i}-l0`), 'thin')}` +
        `${roughLine([8, 24], [30, 24], seedFor(`doc-${i}-l1`), 'thin')}` +
        `${roughLine([8, 34], [36, 34], seedFor(`doc-${i}-l2`), 'thin')}` +
        `<text x="23" y="52">${t}</text></g>`,
    )
    .join('');

  const presenter = roughFigure({
    head: [40, 22], neck: [40, 31], hip: [40, 66],
    armL: [[33, 48], [31, 62]], armR: [[53, 40], [64, 30]],
    legL: [[36, 88], [33, 108]], legR: [[44, 88], [47, 108]],
  }, seedFor('presenter'));

  const canvasPath = roughRectSinglePath(150, 24, 510, 190, seedFor('finale-canvas'));

  const slotX = [170, 272, 374, 476];
  const slots = slotX.map((x) => `<rect x="${x}" y="48" width="92" height="64" rx="2" class="slot"/>`).join('');
  const handle = `<g class="finale-handle"><rect x="${slotX[3]! + 78}" y="102" width="10" height="10" rx="1"/></g>`;

  return (
    `<div class="finale-stage">` +
    `<svg viewBox="0 0 680 240" aria-hidden="true">` +
    `<path class="finale-canvas" d="${canvasPath}"/>` +
    `<g class="finale-grid">${slots}</g>` +
    `<g class="finale-docs">${docs}</g>` +
    `<g class="finale-figure">${presenter}</g>` +
    handle +
    `</svg></div>`
  );
}

/** Run the finale choreography once when the stage enters view. */
export function playFinale(stage: HTMLElement, reduceMotion: boolean): void {
  const canvas = stage.querySelector<SVGPathElement>('.finale-canvas')!;
  const docs = stage.querySelectorAll<SVGGElement>('.doc');
  const fig = stage.querySelector<SVGGElement>('.finale-figure')!;
  const slots = stage.querySelectorAll<SVGRectElement>('.slot');
  const handle = stage.querySelector<SVGGElement>('.finale-handle');

  if (reduceMotion) {
    stage.classList.add('done');
    return;
  }

  const ease = 'cubic-bezier(.22,.9,.3,1)';
  const len = 1400;
  canvas.style.strokeDasharray = `${len}`;
  canvas.animate(
    [{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
    { duration: 900, easing: ease, fill: 'forwards' },
  );

  const targets = [[170, 51], [272, 51], [374, 51], [476, 51]];
  const starts = [[10, 150, -14], [40, 40, 9], [70, 178, -6], [110, 60, 12]];
  docs.forEach((doc, i) => {
    const [sx, sy, rot] = starts[i]!;
    const [tx, ty] = targets[i]!;
    doc.animate(
      [
        { transform: `translate(${sx}px,${sy}px) rotate(${rot}deg)`, opacity: 0.9 },
        { transform: `translate(${tx + 23}px,${ty + 3}px) rotate(0deg) scale(.98)`, opacity: 1 },
      ],
      { duration: 1100, delay: 450 + i * 260, easing: ease, fill: 'forwards' },
    );
  });

  slots.forEach((s, i) => {
    s.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 400, delay: 1500 + i * 260, easing: 'ease-out', fill: 'forwards',
    });
  });

  fig.animate(
    [
      { transform: 'translate(-70px,118px)', opacity: 0 },
      { transform: 'translate(28px,118px)', opacity: 1 },
    ],
    { duration: 1300, delay: 1900, easing: ease, fill: 'forwards' },
  );

  // resize-handle nudge, after every slot has landed — "drag-and-resize spatial canvas"
  handle?.animate(
    [
      { transform: 'translate(0,0) scale(1)', opacity: 0 },
      { transform: 'translate(0,0) scale(1)', opacity: 1, offset: 0.15 },
      { transform: 'translate(6px,4px) scale(1.08)' },
      { transform: 'translate(0,0) scale(1)' },
    ],
    { duration: 900, delay: 2900, easing: 'ease-in-out', fill: 'forwards' },
  );

  window.setTimeout(() => stage.classList.add('done'), 3800);
}
