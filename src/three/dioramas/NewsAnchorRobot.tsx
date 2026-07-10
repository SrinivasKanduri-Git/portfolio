import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { ContactShadows, RoundedBox } from '@react-three/drei';
import {
  CanvasTexture,
  ExtrudeGeometry,
  Quaternion,
  RepeatWrapping,
  Shape,
  SRGBColorSpace,
  Vector3,
  type Group,
  type Mesh,
  type MeshStandardMaterial,
} from 'three';
import { Dust, KeyBeam, makeBrushedMap } from '../cinema';

// AI Reporter — palette matched to the robot_reporter.png reference plate.
const GUNMETAL = '#5a5f67';
const EYE = '#ffd83d';
const ORANGE = '#ff5f00';

// desk top outline: wide slab with rounded front corners (shape −y = world front)
function deskOutline(w: number, back: number, front: number, r: number): Shape {
  const s = new Shape();
  s.moveTo(-w, back);
  s.lineTo(w, back);
  s.lineTo(w, front + r);
  s.quadraticCurveTo(w, front, w - r, front);
  s.lineTo(-w + r, front);
  s.quadraticCurveTo(-w, front, -w, front + r);
  s.closePath();
  return s;
}

/**
 * The newsroom mega-screen graphic — a dotted world map over a deep blue
 * broadcast gradient: soft centre glow, halftone continents, a few great-circle
 * routes, vignette and scanlines, with the SK NEWSROOM lower third burned in.
 */
function makeScreenTexture(): CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = 1280;
  cv.height = 640;
  const g = cv.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 0, 640);
  grad.addColorStop(0, '#071c47');
  grad.addColorStop(0.5, '#0d3380');
  grad.addColorStop(1, '#071838');
  g.fillStyle = grad;
  g.fillRect(0, 0, 1280, 640);
  // soft centre glow behind the map
  const spot = g.createRadialGradient(640, 300, 60, 640, 300, 620);
  spot.addColorStop(0, 'rgba(64,130,235,0.4)');
  spot.addColorStop(1, 'rgba(64,130,235,0)');
  g.fillStyle = spot;
  g.fillRect(0, 0, 1280, 640);
  // halftone world map — real coastline polygons (lat/lon, equirectangular)
  const LAND: [number, number][][] = [
    // North America
    [[-166, 66], [-150, 71], [-128, 71], [-105, 73], [-90, 74], [-75, 72], [-60, 60], [-55, 50], [-65, 45], [-70, 42], [-75, 36], [-80, 31], [-81, 26], [-84, 30], [-90, 29], [-96, 27], [-97, 21], [-92, 15], [-84, 10], [-78, 7], [-83, 9], [-88, 14], [-97, 16], [-106, 24], [-115, 30], [-122, 38], [-125, 45], [-135, 58], [-152, 58], [-160, 55], [-168, 60]],
    // Greenland
    [[-46, 60], [-30, 68], [-22, 72], [-25, 78], [-40, 80], [-58, 76], [-68, 72], [-55, 62]],
    // South America
    [[-78, 7], [-70, 10], [-61, 9], [-52, 4], [-42, -3], [-35, -8], [-38, -15], [-48, -25], [-53, -32], [-58, -38], [-65, -45], [-68, -52], [-72, -54], [-75, -45], [-72, -35], [-70, -25], [-70, -18], [-76, -10], [-80, -3]],
    // Eurasia (Europe + Asia + Arabia + India + SE Asia)
    [[-10, 36], [-9, 43], [-2, 48], [3, 52], [8, 56], [18, 56], [30, 60], [40, 67], [60, 69], [75, 72], [95, 76], [110, 74], [130, 72], [145, 68], [160, 66], [178, 65], [178, 62], [163, 60], [155, 55], [142, 50], [135, 44], [130, 42], [122, 38], [120, 30], [110, 20], [108, 12], [104, 8], [100, 8], [98, 12], [96, 16], [90, 21], [85, 20], [80, 14], [77, 8], [74, 12], [72, 20], [68, 23], [60, 25], [56, 26], [52, 25], [58, 22], [56, 17], [50, 13], [44, 12], [43, 16], [39, 21], [35, 28], [35, 36], [30, 36], [26, 40], [22, 38], [15, 38], [12, 44], [3, 43], [-6, 36]],
    // Africa
    [[-10, 32], [-6, 35], [3, 37], [10, 37], [20, 32], [30, 31], [33, 27], [35, 22], [37, 18], [40, 12], [43, 11], [48, 11], [51, 10], [46, 2], [41, -2], [40, -10], [36, -18], [33, -26], [27, -33], [20, -35], [17, -30], [14, -22], [12, -15], [9, -5], [9, 4], [5, 6], [-5, 5], [-13, 9], [-17, 15], [-17, 21], [-14, 27]],
    // Australia
    [[114, -22], [114, -34], [118, -35], [125, -32], [130, -32], [136, -35], [140, -38], [147, -38], [150, -37], [153, -30], [153, -25], [148, -20], [143, -14], [137, -12], [132, -11], [126, -14], [122, -18]],
    // Britain & Scandinavia hint
    [[-5, 50], [-2, 53], [-3, 58], [-6, 57], [-8, 52]],
    // Japan
    [[130, 31], [134, 34], [140, 36], [141, 42], [143, 44], [140, 40], [135, 34], [131, 31]],
    // Madagascar
    [[44, -12], [50, -16], [47, -25], [44, -20]],
    // Indonesia / New Guinea hint
    [[95, 5], [102, 2], [110, -2], [118, -3], [126, -2], [134, -3], [141, -5], [146, -7], [141, -9], [132, -7], [120, -9], [110, -7], [102, -3], [96, 2]],
  ];
  // lat/lon → canvas (equirect, framed on [-180,180]×[80,-60])
  const toXY = ([lon, lat]: [number, number]): [number, number] => [((lon + 180) / 360) * 1280, ((80 - lat) / 140) * 640];
  const POLY = LAND.map((p) => p.map(toXY));
  const inside = (x: number, y: number) =>
    POLY.some((poly) => {
      let inn = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const [xi, yi] = poly[i];
        const [xj, yj] = poly[j];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inn = !inn;
      }
      return inn;
    });
  for (let y = 20; y < 620; y += 10) {
    for (let x = 20; x < 1260; x += 10) {
      if (!inside(x, y)) continue;
      const h = Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
      g.fillStyle = h > 0.94 ? 'rgba(230,244,255,0.95)' : `rgba(140,195,255,${(0.42 + 0.42 * h).toFixed(2)})`;
      g.beginPath();
      g.arc(x + (h - 0.5) * 4, y + (h - 0.5) * 3, h > 0.94 ? 2.4 : 1.9, 0, Math.PI * 2);
      g.fill();
    }
  }
  // broadcast routes radiating from Visakhapatnam to world cities
  const VIZAG = toXY([83.3, 17.7]);
  const CITIES: [number, number][] = [
    toXY([-74, 41]), // New York
    toXY([0, 51]), // London
    toXY([140, 36]), // Tokyo
    toXY([151, -34]), // Sydney
    toXY([-46, -23]), // São Paulo
    toXY([3, 6]), // Lagos
  ];
  g.strokeStyle = 'rgba(160,210,255,0.32)';
  g.lineWidth = 2;
  CITIES.forEach(([x2, y2]) => {
    const [x1, y1] = VIZAG;
    g.beginPath();
    g.moveTo(x1, y1);
    g.quadraticCurveTo((x1 + x2) / 2, Math.min(y1, y2) - 80, x2, y2);
    g.stroke();
  });
  [VIZAG, ...CITIES].forEach(([x, y], i) => {
    const rr = i === 0 ? 16 : 10;
    const glow = g.createRadialGradient(x, y, 0, x, y, rr);
    glow.addColorStop(0, i === 0 ? 'rgba(255,170,90,0.95)' : 'rgba(255,255,255,0.9)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = glow;
    g.beginPath();
    g.arc(x, y, rr, 0, Math.PI * 2);
    g.fill();
  });
  // vignette so the panel reads as one lit surface, not a poster
  const vin = g.createRadialGradient(640, 320, 260, 640, 320, 760);
  vin.addColorStop(0, 'rgba(0,0,0,0)');
  vin.addColorStop(1, 'rgba(2,6,20,0.55)');
  g.fillStyle = vin;
  g.fillRect(0, 0, 1280, 640);
  // scanlines
  g.fillStyle = 'rgba(0,0,0,0.05)';
  for (let y = 0; y < 640; y += 4) g.fillRect(0, y, 1280, 1);
  // lower third
  g.fillStyle = 'rgba(4,10,26,0.82)';
  g.fillRect(0, 548, 1280, 92);
  g.fillStyle = ORANGE;
  g.fillRect(0, 548, 1280, 5);
  g.font = '900 50px "Archivo", "Arial Black", sans-serif';
  g.textAlign = 'left';
  g.fillStyle = '#e8f1ff';
  g.fillText('SK NEWSROOM', 46, 612);
  g.fillStyle = ORANGE;
  g.font = '900 32px "Archivo", "Arial Black", sans-serif';
  g.textAlign = 'right';
  g.fillText('● LIVE', 1234, 608);
  const tex = new CanvasTexture(cv);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** headline crawl — real newsroom ticker copy about Srinivas, on the orange band */
const HEADLINES =
  'SRINIVAS KANDURI SHIPS INDIA-FIRST AUTONOMOUS NEWS PLATFORM — ZERO HUMAN EDITORIAL  ✦  ' +
  'RUBYSKOPE: THE X-RAY PROFILER THAT TRACES RAILS APPS REQUEST BY REQUEST  ✦  ' +
  'DOCUCAINE TURNS DOCUMENT CHAOS INTO ANSWERS  ✦  ' +
  '1.5 YEARS OF RUBY ON RAILS · MONGODB · AWS IN PRODUCTION  ✦  ' +
  'THREE PLATFORMS SHIPPED AFTER HOURS — AI CODING AGENTS ON THE CREW  ✦  ' +
  'LIVE FROM VISAKHAPATNAM  ✦  ';

/** ticker strip proportions inside the mega-screen bezel */
const TICKER_W = 5.08;
const TICKER_H = 0.26;

function makeTickerTexture(): CanvasTexture {
  const probe = document.createElement('canvas').getContext('2d')!;
  const font = '900 92px "Archivo", "Arial Black", sans-serif';
  probe.font = font;
  const textW = Math.ceil(probe.measureText(HEADLINES).width);
  const cv = document.createElement('canvas');
  cv.width = textW;
  cv.height = 128;
  const g = cv.getContext('2d')!;
  g.fillStyle = ORANGE;
  g.fillRect(0, 0, cv.width, cv.height);
  g.fillStyle = '#190b01';
  g.font = font;
  g.textBaseline = 'middle';
  g.fillText(HEADLINES, 0, cv.height / 2 + 5);
  const tex = new CanvasTexture(cv);
  tex.colorSpace = SRGBColorSpace;
  tex.wrapS = RepeatWrapping;
  tex.anisotropy = 8;
  // show exactly the slice whose aspect matches the plane, so glyphs stay true
  tex.repeat.x = ((TICKER_W / TICKER_H) * cv.height) / cv.width;
  return tex;
}

/** the ON AIR sign face — neon letters in a dark box, glow burned in */
function makeOnAirTexture(): CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = 512;
  cv.height = 160;
  const g = cv.getContext('2d')!;
  g.fillStyle = '#140609';
  g.fillRect(0, 0, 512, 160);
  g.strokeStyle = 'rgba(255,80,80,0.55)';
  g.lineWidth = 5;
  g.strokeRect(12, 12, 488, 136);
  g.font = '900 88px "Archivo", "Arial Black", sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.shadowColor = '#ff2030';
  g.shadowBlur = 32;
  g.fillStyle = '#ff4b4b';
  g.fillText('ON AIR', 256, 86);
  g.shadowBlur = 10;
  g.fillStyle = '#ffe2e2';
  g.fillText('ON AIR', 256, 86);
  const tex = new CanvasTexture(cv);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** polished shell material props, shared by every body panel so the build reads as one */
// satin machine finish, not mirror chrome — the polished shell was blowing out
// under the key + environment reflections
const shellProps = { color: '#b4b9c1', roughness: 0.34, metalness: 0.75, clearcoat: 0.4, clearcoatRoughness: 0.3 } as const;
const jointProps = { color: GUNMETAL, roughness: 0.28, metalness: 0.95, clearcoat: 0.4 } as const;
const glassProps = { color: '#0b0e13', roughness: 0.09, metalness: 0.3, clearcoat: 1, clearcoatRoughness: 0.07 } as const;

/** a tapered limb segment between two anchor points, with seam rings at both ends */
function Limb({ from, to, r0, r1 }: { from: [number, number, number]; to: [number, number, number]; r0: number; r1: number }) {
  const { pos, quat, len } = useMemo(() => {
    const a = new Vector3(...from);
    const b = new Vector3(...to);
    const d = b.clone().sub(a);
    const len = d.length();
    const quat = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), d.clone().normalize());
    return { pos: a.clone().add(b).multiplyScalar(0.5), quat, len };
  }, [from, to]);
  return (
    <group position={pos} quaternion={quat}>
      <mesh castShadow>
        <cylinderGeometry args={[r1, r0, len, 24]} />
        <meshPhysicalMaterial {...shellProps} />
      </mesh>
      {/* seam rings where the segment meets its joints */}
      {[-1, 1].map((e) => (
        <mesh key={e} position={[0, (e * len) / 2 - e * 0.02, 0]}>
          <torusGeometry args={[(e > 0 ? r1 : r0) + 0.004, 0.008, 8, 28]} />
          <meshPhysicalMaterial color="#3f444b" roughness={0.3} metalness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

/** hinge joint: a gunmetal disc whose axis is perpendicular to the limb bend plane */
function Hinge({ at, prev, next, r }: { at: [number, number, number]; prev: [number, number, number]; next: [number, number, number]; r: number }) {
  const quat = useMemo(() => {
    const a = new Vector3(...at).sub(new Vector3(...prev));
    const b = new Vector3(...next).sub(new Vector3(...at));
    const axis = a.cross(b);
    if (axis.lengthSq() < 1e-6) axis.set(1, 0, 0);
    return new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), axis.normalize());
  }, [at, prev, next]);
  return (
    <group position={at} quaternion={quat}>
      <mesh castShadow>
        <cylinderGeometry args={[r, r, r * 1.5, 20]} />
        <meshPhysicalMaterial {...jointProps} />
      </mesh>
      {[-1, 1].map((e) => (
        <mesh key={e} position={[0, e * r * 0.75, 0]}>
          <cylinderGeometry args={[r * 0.45, r * 0.45, 0.014, 16]} />
          <meshPhysicalMaterial color="#3f444b" roughness={0.25} metalness={0.95} />
        </mesh>
      ))}
    </group>
  );
}

/** a plain matte boom pole between two points (no chrome, no seam rings) */
function BoomPole({ from, to, r0, r1 }: { from: [number, number, number]; to: [number, number, number]; r0: number; r1: number }) {
  const { pos, quat, len } = useMemo(() => {
    const a = new Vector3(...from);
    const b = new Vector3(...to);
    const d = b.clone().sub(a);
    const len = d.length();
    const quat = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), d.clone().normalize());
    return { pos: a.clone().add(b).multiplyScalar(0.5), quat, len };
  }, [from, to]);
  return (
    <group position={pos} quaternion={quat}>
      <mesh castShadow>
        <cylinderGeometry args={[r1, r0, len, 16]} />
        <meshStandardMaterial color="#23262c" roughness={0.45} metalness={0.85} />
      </mesh>
      {/* twist-lock collars along the pole, like a real telescopic boom */}
      {[-0.28, 0.06].map((f) => (
        <mesh key={f} position={[0, len * f, 0]}>
          <cylinderGeometry args={[r0 * 1.25, r0 * 1.25, 0.05, 14]} />
          <meshStandardMaterial color="#15181d" roughness={0.5} metalness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

/** shotgun mic in a shockmount, long axis aligned to `dir` (toward the head) */
function AimedMic({ dir }: { dir: [number, number, number] }) {
  const quat = useMemo(
    () => new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), new Vector3(...dir).normalize()),
    [dir],
  );
  return (
    <group quaternion={quat}>
      {/* shockmount cradle: two rings bridged by rails */}
      {[0.1, 0.3].map((y) => (
        <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.075, 0.011, 10, 28]} />
          <meshStandardMaterial color="#2a2e34" roughness={0.4} metalness={0.9} />
        </mesh>
      ))}
      {[0.9, 2.1, 3.3, 4.5].map((a) => (
        <mesh key={a} position={[Math.cos(a) * 0.075, 0.2, Math.sin(a) * 0.075]}>
          <cylinderGeometry args={[0.006, 0.006, 0.2, 8]} />
          <meshStandardMaterial color="#15181d" roughness={0.5} metalness={0.8} />
        </mesh>
      ))}
      {/* mic body + foam windscreen nose */}
      <mesh position={[0, 0.16, 0]} castShadow>
        <cylinderGeometry args={[0.032, 0.032, 0.34, 16]} />
        <meshStandardMaterial color="#1b1e23" roughness={0.35} metalness={0.85} />
      </mesh>
      <mesh position={[0, 0.42, 0]} castShadow>
        <capsuleGeometry args={[0.055, 0.16, 6, 16]} />
        <meshStandardMaterial color="#26292f" roughness={1} metalness={0} />
      </mesh>
      {/* cable tail looping off the back */}
      <mesh position={[0, -0.04, 0.02]} rotation={[0.5, 0, 0]}>
        <torusGeometry args={[0.05, 0.007, 8, 20, 4.2]} />
        <meshStandardMaterial color="#0f1114" roughness={0.7} metalness={0.2} />
      </mesh>
    </group>
  );
}

// arm anchors (mirrored by s): shoulder inside the pod → elbow low near the desk
// → wrist beside the held paper. Limbs/hinges are built point-to-point from
// these, so every joint lines up by construction.
const SHOULDER: [number, number, number] = [0.58, 1.2, 0.08];
const ELBOW: [number, number, number] = [0.54, 0.76, 0.42];
const WRIST: [number, number, number] = [0.32, 0.86, 0.64];
const mir = (p: [number, number, number], s: number): [number, number, number] => [p[0] * s, p[1], p[2]];

/**
 * SC.01 — The AI Reporter, built against robot_reporter.png: one machined
 * chrome anchor-bot reading a NEWS sheet it actually grips — squircle head with
 * glossy screen face and yellow disc eyes, matching chest with a lit core,
 * point-to-point arms resting toward the desk. Behind it, one continuous
 * newsroom console: mega-screen with the headline crawl inside its bezel and
 * angled monitor wings hinged straight off the bezel edges.
 */
export function NewsAnchorRobot({ position = [1, 0, 0] }: { position?: [number, number, number] }) {
  const body = useRef<Group>(null);
  const head = useRef<Group>(null);
  const antL = useRef<Group>(null);
  const antR = useRef<Group>(null);
  const eyeL = useRef<Mesh>(null);
  const eyeR = useRef<Mesh>(null);
  const core = useRef<MeshStandardMaterial>(null);
  const deskScreenMat = useRef<MeshStandardMaterial>(null);
  const fingers = useRef<(Group | null)[]>([]); // 0–3 left hand, 4–7 right hand
  const paper = useRef<Group>(null);
  const boom = useRef<Group>(null);
  const onAir = useRef<MeshStandardMaterial>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    // breathing — the whole upper body (arms, hands and paper included) rises
    // and settles together, with a slow idle sway
    if (body.current) {
      body.current.position.y = Math.sin(t * 1.05) * 0.012;
      body.current.rotation.x = Math.sin(t * 1.05) * 0.004;
      body.current.rotation.y = Math.sin(t * 0.23) * 0.015;
    }
    // layered head motion: reading the sheet — slow scan + micro-nods
    if (head.current) {
      head.current.rotation.x = 0.09 + Math.sin(t * 0.6) * 0.035 + Math.sin(t * 1.7 + 1) * 0.012;
      head.current.rotation.y = Math.sin(t * 0.33) * 0.07 + Math.sin(t * 0.9 + 2) * 0.02;
      head.current.rotation.z = Math.sin(t * 0.47) * 0.015;
    }
    if (antL.current) antL.current.rotation.z = 0.22 + Math.sin(t * 1.6) * 0.1;
    if (antR.current) antR.current.rotation.z = -0.22 - Math.sin(t * 1.6 + 0.5) * 0.1;
    // blink: one blink per cycle plus an occasional double-blink
    const cyc = t % 4.6;
    const blink = cyc < 0.09 || (cyc > 3.1 && cyc < 3.19) || (cyc > 3.3 && cyc < 3.39) ? 0.12 : 1;
    if (eyeL.current) eyeL.current.scale.y = blink;
    if (eyeR.current) eyeR.current.scale.y = blink;
    // chest core pulse — a slow heartbeat
    if (core.current) core.current.emissiveIntensity = 1.1 + Math.sin(t * 2.1) * 0.25;
    // grip: fingers tighten and ease on the sheet, staggered so it reads alive
    fingers.current.forEach((f, idx) => {
      if (!f) return;
      f.rotation.x = -0.92 + Math.sin(t * 1.05 + (idx % 4) * 0.6 + (idx > 3 ? 0.9 : 0)) * 0.035;
    });
    // the sheet answers the grip with a faint counter-sway
    if (paper.current) paper.current.rotation.z = Math.sin(t * 1.05 + 0.4) * 0.008;
    // headline crawl slides right-to-left inside the screen bezel
    tickerTex.offset.x = (t * 0.014) % 1;
    if (deskScreenMat.current) deskScreenMat.current.emissiveIntensity = 1.1 + Math.sin(t * 1.8) * 0.15;
    // boom mic drifts on its arm; the ON AIR sign hums with a faint mains flicker
    if (boom.current) boom.current.rotation.z = Math.sin(t * 0.4) * 0.02;
    if (onAir.current) onAir.current.emissiveIntensity = 1.05 + Math.sin(t * 2.7) * 0.08 + (Math.sin(t * 31) > 0.98 ? -0.2 : 0);
  });

  const screenTex = useMemo(makeScreenTexture, []);
  // wing monitors show the map only — the lower third stays unique to centre
  const wingTex = useMemo(() => {
    const t = screenTex.clone();
    t.repeat.set(1, 0.84);
    t.offset.set(0, 0.16);
    t.needsUpdate = true;
    return t;
  }, [screenTex]);
  const tickerTex = useMemo(makeTickerTexture, []);
  const onAirTex = useMemo(makeOnAirTexture, []);
  const brushed = useMemo(() => makeBrushedMap(3), []);

  // the sheet the robot reads — bold NEWS masthead over grey body copy
  const paperTex = useMemo(() => {
    const cv = document.createElement('canvas');
    cv.width = 512;
    cv.height = 440;
    const g = cv.getContext('2d')!;
    g.fillStyle = '#f7f5f0';
    g.fillRect(0, 0, 512, 440);
    g.fillStyle = '#b6b3aa';
    for (let r = 0; r < 2; r++) g.fillRect(56, 28 + r * 15, 400, 4);
    g.fillStyle = '#14171d';
    g.textAlign = 'center';
    g.font = '900 96px Georgia, serif';
    g.fillText('NEWS', 256, 158);
    g.fillRect(56, 182, 400, 5);
    g.fillStyle = '#b6b3aa';
    for (let r = 0; r < 10; r++) g.fillRect(56, 212 + r * 22, r % 4 === 3 ? 290 : 400, 5);
    const tex = new CanvasTexture(cv);
    tex.colorSpace = SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
  }, []);

  const { deskTopGeo, deskTrimGeo } = useMemo(() => {
    const deskTopGeo = new ExtrudeGeometry(deskOutline(1.4, 0.42, -0.52, 0.3), { depth: 0.075, bevelEnabled: true, bevelThickness: 0.014, bevelSize: 0.014, bevelSegments: 3, curveSegments: 32 });
    // glowing trim: thin frame following the top outline
    const trim = deskOutline(1.43, 0.435, -0.55, 0.315);
    trim.holes.push(deskOutline(1.36, 0.39, -0.48, 0.27));
    const deskTrimGeo = new ExtrudeGeometry(trim, { depth: 0.018, bevelEnabled: false, curveSegments: 32 });
    return { deskTopGeo, deskTrimGeo };
  }, []);

  return (
    <group position={position} scale={1.05}>
      {/* ── STUDIO LIGHTING — unified soundstage rig: one warm volumetric key
          from high stage-right (local coords!), gentle fills, no hot specular
          parked on the face ── */}
      <KeyBeam position={[2.6, 5.7, 3]} target={[0, 1.1, 0.4]} intensity={115} color="#ffe9d2" mapSize={1024} angle={0.46} volumetric={0.06} />
      {/* soft front fill (the "camera light") — low, wide, cool */}
      <pointLight position={[-0.4, 2.2, 4.2]} color="#e8f0ff" intensity={11} distance={12} />
      {/* cool rim for the shell and shoulders */}
      <pointLight position={[-2.4, 2.7, 1]} color="#8fb4ff" intensity={14} distance={10} />
      {/* studio blue bounce off the console */}
      <pointLight position={[0, 2.2, -0.6]} color="#3d7ae0" intensity={12} distance={8} />
      {/* orange desk-light bounce, like the plate */}
      <pointLight position={[0, 0.9, 1.4]} color={ORANGE} intensity={5} distance={3.5} />

      {/* studio haze — dust motes hanging in the key and over the console */}
      <Dust position={[0.8, 2.4, 1.4]} scale={[5.5, 3.6, 3.6]} count={50} opacity={0.18} />

      {/* ── STUDIO SET ── */}
      {/* grounding shadow under the whole set */}
      <ContactShadows position={[0, 0.012, 0.7]} scale={7} far={2.4} blur={2.6} opacity={0.62} frames={1} />

      {/* ── NEWSROOM CONSOLE — one continuous unit: centre mega-screen with the
          crawl inside its bezel, monitor wings hinged off the bezel edges ── */}
      {/* deep studio void behind everything */}
      <mesh position={[0, 2.1, -1.66]}>
        <planeGeometry args={[11, 4.6]} />
        <meshStandardMaterial color="#050a16" roughness={0.92} metalness={0.05} />
      </mesh>
      {/* centre bezel */}
      <RoundedBox args={[5.5, 3.06, 0.12]} radius={0.045} smoothness={4} position={[0, 1.62, -1.52]}>
        <meshStandardMaterial color="#0a0e18" roughness={0.42} metalness={0.7} />
      </RoundedBox>
      {/* headline crawl — inside the bezel, the screen's top strip */}
      <mesh position={[0, 2.72, -1.455]}>
        <planeGeometry args={[TICKER_W, TICKER_H]} />
        <meshStandardMaterial map={tickerTex} emissive="#ffffff" emissiveMap={tickerTex} emissiveIntensity={0.9} toneMapped={false} roughness={0.5} />
      </mesh>
      {/* slim mullion between crawl and picture, same metal as the bezel */}
      <mesh position={[0, 2.575, -1.452]}>
        <planeGeometry args={[TICKER_W, 0.028]} />
        <meshStandardMaterial color="#0a0e18" roughness={0.42} metalness={0.7} />
      </mesh>
      {/* main picture */}
      <mesh position={[0, 1.44, -1.455]}>
        <planeGeometry args={[TICKER_W, 2.22]} />
        <meshStandardMaterial map={screenTex} roughness={0.4} metalness={0.05} emissive="#ffffff" emissiveMap={screenTex} emissiveIntensity={0.85} toneMapped={false} />
      </mesh>
      {/* monitor wings — hinged directly off the centre bezel edges, same bezel
          metal, same screens, same orange base rail: one console */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 2.75, 1.62, -1.52]} rotation={[0, -s * 0.44, 0]}>
          <RoundedBox args={[1.8, 3.06, 0.12]} radius={0.045} smoothness={3} position={[s * 0.9, 0, 0]}>
            <meshStandardMaterial color="#0a0e18" roughness={0.42} metalness={0.7} />
          </RoundedBox>
          {[0.78, -0.62].map((y, i) => (
            <mesh key={y} position={[s * 0.9, y, 0.065]}>
              <planeGeometry args={[1.56, 1.24]} />
              <meshStandardMaterial
                map={wingTex}
                emissive="#ffffff"
                emissiveMap={wingTex}
                emissiveIntensity={i === 0 ? 0.55 : 0.4}
                roughness={0.45}
                toneMapped={false}
              />
            </mesh>
          ))}
          {/* orange base rail continuing across the wing */}
          <mesh position={[s * 0.9, -1.36, 0.064]}>
            <planeGeometry args={[1.8, 0.05]} />
            <meshStandardMaterial color={ORANGE} emissive={ORANGE} emissiveIntensity={1.2} toneMapped={false} />
          </mesh>
        </group>
      ))}
      {/* orange base rail across the centre bezel, level with the wing rails */}
      <mesh position={[0, 0.26, -1.454]}>
        <planeGeometry args={[5.5, 0.05]} />
        <meshStandardMaterial color={ORANGE} emissive={ORANGE} emissiveIntensity={1.2} toneMapped={false} />
      </mesh>
      {/* cool vertical light tubes in the far corners, studio depth cue —
          tone-mapped and dim so they never bloom into a bright stream as the
          dolly sweeps past between sets */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 4.7, 1.7, -1.4]}>
          <boxGeometry args={[0.05, 3.2, 0.05]} />
          <meshStandardMaterial color="#cfe2ff" emissive="#bcd8ff" emissiveIntensity={0.5} />
        </mesh>
      ))}
      {/* white ceiling ring — the curved studio halo */}
      <mesh position={[0, 3.3, 0.3]} rotation={[Math.PI / 2 - 0.18, 0, 0]}>
        <torusGeometry args={[2.7, 0.07, 12, 64, Math.PI]} />
        <meshStandardMaterial color="#e8ecf2" emissive="#dfe7f2" emissiveIntensity={1.1} roughness={0.4} toneMapped={false} />
      </mesh>

      {/* ── STUDIO PROPS — the apparatus of a real broadcast floor ── */}
      {/* ON AIR sign hung over the console on two rods */}
      <group position={[0, 3.42, -1.05]}>
        {[-0.42, 0.42].map((x) => (
          <mesh key={x} position={[x, 0.34, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.5, 8]} />
            <meshStandardMaterial color="#3c4046" roughness={0.45} metalness={0.9} />
          </mesh>
        ))}
        <RoundedBox args={[1.14, 0.38, 0.1]} radius={0.02} smoothness={3} castShadow>
          <meshPhysicalMaterial color="#15171d" roughness={0.4} metalness={0.85} />
        </RoundedBox>
        <mesh position={[0, 0, 0.052]}>
          <planeGeometry args={[1.06, 0.32]} />
          <meshStandardMaterial ref={onAir} map={onAirTex} emissive="#ffffff" emissiveMap={onAirTex} emissiveIntensity={1.25} toneMapped={false} roughness={0.5} />
        </mesh>
        {/* the sign's red spill on the console below */}
        <pointLight position={[0, -0.3, 0.3]} color="#ff3040" intensity={3.5} distance={2.6} decay={1.8} />
      </group>

      {/* boom mic reaching in from upper stage-left — pole, shockmount and a
          foam-screened shotgun mic aimed square at the anchor's head. Built
          point-to-point (like the arms) so the rig can't float apart. */}
      <group ref={boom} position={[-3.6, 3.6, 1.4]}>
        <BoomPole from={[0, 0, 0]} to={[3.05, -0.85, -0.9]} r0={0.03} r1={0.021} />
        {/* pole coupler at the tip */}
        <group position={[3.05, -0.85, -0.9]}>
          <mesh>
            <sphereGeometry args={[0.045, 16, 16]} />
            <meshStandardMaterial color="#2a2e34" roughness={0.35} metalness={0.9} />
          </mesh>
          <AimedMic dir={[0.55, -0.93, -0.45]} />
        </group>
      </group>

      {/* ── ANCHOR DESK — glossy grey slab, hot-orange edge, blue inset screen ── */}
      <group position={[0, 0, 0.62]}>
        {/* main top (extruded flat, rounded front corners) */}
        <mesh geometry={deskTopGeo} position={[0, 0.545, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
          <meshPhysicalMaterial color="#b9bec6" roughness={0.24} roughnessMap={brushed} metalness={0.35} clearcoat={0.9} clearcoatRoughness={0.18} />
        </mesh>
        {/* neon trim framing the top edge */}
        <mesh geometry={deskTrimGeo} position={[0, 0.625, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <meshStandardMaterial color={ORANGE} emissive={ORANGE} emissiveIntensity={1.6} toneMapped={false} />
        </mesh>
        {/* blue inset screen, tilted up toward the camera like a prompter */}
        <group position={[0, 0.635, 0.0]} rotation={[-Math.PI / 2 + 0.24, 0, 0]}>
          <mesh>
            <planeGeometry args={[0.78, 0.34]} />
            <meshStandardMaterial ref={deskScreenMat} color="#0f2a4d" emissive="#2f7fe8" emissiveIntensity={1.1} toneMapped={false} />
          </mesh>
          {[0.08, 0, -0.08].map((y, i) => (
            <mesh key={i} position={[-0.05 + i * 0.03, y, 0.002]}>
              <planeGeometry args={[0.56 - i * 0.08, 0.03]} />
              <meshBasicMaterial color="#bcdcff" transparent opacity={0.7} />
            </mesh>
          ))}
        </group>
        {/* a spare sheet resting by the prompter */}
        <mesh position={[0.34, 0.6365, 0.24]} rotation={[-Math.PI / 2, 0, 0.14]} receiveShadow>
          <planeGeometry args={[0.42, 0.34]} />
          <meshStandardMaterial color="#e9e6de" roughness={0.95} />
        </mesh>
        {/* recessed screw bolts on the desktop, one per side */}
        {[-1.15, 1.15].map((x) => (
          <group key={x} position={[x, 0.615, -0.02]}>
            <mesh>
              <cylinderGeometry args={[0.055, 0.055, 0.015, 24]} />
              <meshPhysicalMaterial color="#9aa0a8" roughness={0.18} metalness={0.95} clearcoat={0.5} />
            </mesh>
            <mesh position={[0, 0.009, 0]}>
              <cylinderGeometry args={[0.02, 0.02, 0.008, 12]} />
              <meshStandardMaterial color="#5f646c" roughness={0.3} metalness={0.9} />
            </mesh>
          </group>
        ))}
        {/* front fascia: grey band, dark base, two glowing orange rails */}
        <mesh position={[0, 0.46, 0.1]} castShadow>
          <boxGeometry args={[2.86, 0.16, 0.72]} />
          <meshPhysicalMaterial color="#aab0b9" roughness={0.24} metalness={0.5} clearcoat={0.6} clearcoatRoughness={0.25} />
        </mesh>
        <mesh position={[0, 0.2, 0.08]}>
          <boxGeometry args={[2.7, 0.4, 0.66]} />
          <meshStandardMaterial color="#1d232c" roughness={0.45} metalness={0.5} />
        </mesh>
        <mesh position={[0, 0.365, 0.445]}>
          <planeGeometry args={[2.8, 0.035]} />
          <meshStandardMaterial color={ORANGE} emissive={ORANGE} emissiveIntensity={1.6} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0.06, 0.42]}>
          <planeGeometry args={[2.6, 0.045]} />
          <meshStandardMaterial color={ORANGE} emissive={ORANGE} emissiveIntensity={1.6} toneMapped={false} />
        </mesh>
      </group>

      {/* ── THE ROBOT — one machined build: torso column → yoke → pods → arms,
          every joint placed point-to-point so nothing floats ── */}
      <group ref={body}>
        {/* pelvis block and waist ring rising from behind the desk */}
        <RoundedBox args={[0.66, 0.42, 0.46]} radius={0.13} smoothness={5} position={[0, 0.34, 0.03]} castShadow>
          <meshPhysicalMaterial color="#8b9099" roughness={0.24} metalness={0.9} clearcoat={0.5} clearcoatRoughness={0.2} />
        </RoundedBox>
        <mesh position={[0, 0.6, 0.03]}>
          <cylinderGeometry args={[0.3, 0.34, 0.12, 32]} />
          <meshPhysicalMaterial {...jointProps} />
        </mesh>
        {/* chest: broad squircle shell matching the head */}
        <RoundedBox args={[1.04, 0.78, 0.6]} radius={0.18} smoothness={6} position={[0, 1.02, 0.05]} castShadow>
          <meshPhysicalMaterial {...shellProps} />
        </RoundedBox>
        {/* shoulders: soft pods nested straight into the chest shell — narrow,
            sloped down and slightly forward, like relaxed shoulders */}
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.56, 1.24, 0.06]} rotation={[0, 0, -s * 0.22]}>
            <RoundedBox args={[0.26, 0.32, 0.42]} radius={0.11} smoothness={5} castShadow>
              <meshPhysicalMaterial {...shellProps} />
            </RoundedBox>
            {/* bolt ring + orange pinstripe, echoing the desk trim */}
            <mesh position={[s * 0.132, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <torusGeometry args={[0.08, 0.01, 8, 28]} />
              <meshPhysicalMaterial {...jointProps} />
            </mesh>
            <mesh position={[0, -0.115, 0.13]}>
              <planeGeometry args={[0.16, 0.016]} />
              <meshStandardMaterial color={ORANGE} emissive={ORANGE} emissiveIntensity={0.9} toneMapped={false} />
            </mesh>
          </group>
        ))}
        {/* chest face panel — glossy black, like the head's screen */}
        <RoundedBox args={[0.56, 0.4, 0.05]} radius={0.08} smoothness={5} position={[0, 1.04, 0.34]}>
          <meshPhysicalMaterial {...glassProps} />
        </RoundedBox>
        {/* glowing power core + status dots on the chest panel */}
        <mesh position={[0, 1.08, 0.375]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.07, 0.07, 0.02, 32]} />
          <meshStandardMaterial ref={core} color={EYE} emissive={EYE} emissiveIntensity={1.1} toneMapped={false} />
        </mesh>
        <mesh position={[0, 1.08, 0.372]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.095, 0.012, 10, 40]} />
          <meshPhysicalMaterial {...jointProps} />
        </mesh>
        {[-0.14, 0.14].map((x) => (
          <mesh key={x} position={[x, 0.92, 0.372]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.015, 16]} />
            <meshStandardMaterial color={x < 0 ? '#52d273' : '#2f7fe8'} emissive={x < 0 ? '#52d273' : '#2f7fe8'} emissiveIntensity={0.9} toneMapped={false} />
          </mesh>
        ))}
        {/* speaker slits under the core */}
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[0, 0.985 - i * 0.028, 0.373]}>
            <planeGeometry args={[0.16, 0.012]} />
            <meshStandardMaterial color="#20252c" roughness={0.5} metalness={0.6} />
          </mesh>
        ))}
        {/* panel seam across the chest shell */}
        <mesh position={[0, 1.26, 0.05]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.42, 0.006, 8, 48]} />
          <meshPhysicalMaterial {...jointProps} />
        </mesh>
        {/* side vents on the chest */}
        {[-1, 1].map((s) =>
          [0, 1, 2].map((i) => (
            <mesh key={s + '-' + i} position={[s * 0.525, 1.12 - i * 0.07, 0.14]} rotation={[0, s * 0.12, 0]}>
              <boxGeometry args={[0.012, 0.035, 0.22]} />
              <meshStandardMaterial color="#3a3f47" roughness={0.4} metalness={0.8} />
            </mesh>
          )),
        )}

        {/* ── ARMS — point-to-point: shoulder → elbow low toward the desk →
            wrist at the sheet. Hinge discs sit on the true bend axes. ── */}
        {[-1, 1].map((s) => (
          <group key={s}>
            <Hinge at={mir(SHOULDER, s)} prev={[s * 0.56, 1.36, 0.06]} next={mir(ELBOW, s)} r={0.085} />
            <Limb from={mir(SHOULDER, s)} to={mir(ELBOW, s)} r0={0.092} r1={0.078} />
            <Hinge at={mir(ELBOW, s)} prev={mir(SHOULDER, s)} next={mir(WRIST, s)} r={0.082} />
            <Limb from={mir(ELBOW, s)} to={mir(WRIST, s)} r0={0.075} r1={0.06} />
            {/* orange wrist pinstripe tying the arm to the set */}
            <group position={mir(WRIST, s)}>
              <mesh>
                <sphereGeometry args={[0.055, 18, 18]} />
                <meshPhysicalMaterial {...jointProps} />
              </mesh>
            </group>
          </group>
        ))}

        {/* ── THE SHEET + GRIPPING HANDS — the plate's pose: both hands hold the
            NEWS page upright; fingers wrap its face, thumbs brace the back ── */}
        <group ref={paper} position={[0, 0.95, 0.7]} rotation={[-0.3, 0, 0]}>
          <mesh castShadow>
            <planeGeometry args={[0.52, 0.42]} />
            <meshStandardMaterial map={paperTex} color="#c4bfb2" roughness={0.95} side={2} />
          </mesh>
          {/* faint second sheet behind, slightly fanned */}
          <mesh position={[0.015, -0.008, -0.004]} rotation={[0, 0, 0.05]}>
            <planeGeometry args={[0.52, 0.42]} />
            <meshStandardMaterial color="#cfccc2" roughness={0.95} side={2} />
          </mesh>
        </group>
        {[-1, 1].map((s, hi) => (
          // hand at the wrist anchor: palm slab vertical against the sheet edge,
          // fingers curling over its face — grip, not rest
          <group key={s} position={mir(WRIST, s)} rotation={[-0.3, s * 0.35, s * (Math.PI / 2 - 0.18)]}>
            {/* wrist collar bridging limb → palm */}
            <mesh position={[0, 0.015, -0.1]} rotation={[1.4, 0, 0]}>
              <cylinderGeometry args={[0.052, 0.062, 0.08, 20]} />
              <meshPhysicalMaterial {...jointProps} />
            </mesh>
            {/* palm slab — polished shell, matching the body panels */}
            <RoundedBox args={[0.17, 0.07, 0.15]} radius={0.026} smoothness={4} castShadow>
              <meshPhysicalMaterial {...shellProps} />
            </RoundedBox>
            {/* gunmetal inlay on the back of the hand */}
            <RoundedBox args={[0.1, 0.016, 0.084]} radius={0.007} smoothness={3} position={[0, 0.033, -0.01]}>
              <meshPhysicalMaterial {...jointProps} />
            </RoundedBox>
            {/* knuckle hinge bar spanning the palm front */}
            <mesh position={[0, -0.002, 0.078]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.021, 0.021, 0.166, 16]} />
              <meshPhysicalMaterial {...jointProps} />
            </mesh>
            {/* fingers: plated segments with hinge pins, curled around the sheet */}
            {[-0.058, -0.019, 0.019, 0.058].map((x, fi) => {
              const len = [0.075, 0.084, 0.078, 0.062][fi];
              const dlen = [0.052, 0.058, 0.054, 0.044][fi];
              return (
                <group key={x} ref={(el) => (fingers.current[hi * 4 + fi] = el)} position={[x, -0.002, 0.078]} rotation={[-0.92, 0, 0]}>
                  <RoundedBox args={[0.035, 0.04, len]} radius={0.013} smoothness={4} position={[0, 0, len / 2 + 0.01]} castShadow>
                    <meshPhysicalMaterial {...shellProps} />
                  </RoundedBox>
                  <mesh position={[0, -0.004, len + 0.014]} rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[0.015, 0.015, 0.04, 12]} />
                    <meshPhysicalMaterial {...jointProps} />
                  </mesh>
                  <group position={[0, -0.004, len + 0.014]} rotation={[-0.55, 0, 0]}>
                    <RoundedBox args={[0.031, 0.034, dlen]} radius={0.014} smoothness={4} position={[0, 0, dlen / 2]} castShadow>
                      <meshPhysicalMaterial color="#c6cbd3" roughness={0.2} metalness={0.85} clearcoat={0.6} clearcoatRoughness={0.2} />
                    </RoundedBox>
                  </group>
                </group>
              );
            })}
            {/* thumb bracing the back of the sheet */}
            <group position={[0, 0.01, 0.02]} rotation={[0.6, 0, 0]}>
              <mesh position={[0, 0, 0.008]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.017, 0.017, 0.038, 12]} />
                <meshPhysicalMaterial {...jointProps} />
              </mesh>
              <RoundedBox args={[0.034, 0.038, 0.062]} radius={0.013} smoothness={4} position={[0, 0, 0.042]} castShadow>
                <meshPhysicalMaterial {...shellProps} />
              </RoundedBox>
            </group>
          </group>
        ))}

        {/* neck — ribbed chrome stack rising from a collar recessed in the yoke */}
        <mesh position={[0, 1.44, 0.05]}>
          <cylinderGeometry args={[0.15, 0.17, 0.05, 24]} />
          <meshPhysicalMaterial {...shellProps} />
        </mesh>
        <mesh position={[0, 1.52, 0.05]} castShadow>
          <cylinderGeometry args={[0.11, 0.13, 0.2, 24]} />
          <meshPhysicalMaterial {...jointProps} />
        </mesh>
        {[1.47, 1.52, 1.57].map((y) => (
          <mesh key={y} position={[0, y, 0.05]}>
            <torusGeometry args={[0.121, 0.008, 8, 32]} />
            <meshPhysicalMaterial color="#3f444b" roughness={0.3} metalness={0.9} />
          </mesh>
        ))}

        {/* HEAD group */}
        <group ref={head} position={[0, 1.82, 0.05]}>
          {/* polished shell */}
          <RoundedBox args={[0.74, 0.64, 0.6]} radius={0.17} smoothness={6} castShadow>
            <meshPhysicalMaterial {...shellProps} />
          </RoundedBox>
          {/* chrome bezel step into the glossy black screen face */}
          <RoundedBox args={[0.6, 0.46, 0.05]} radius={0.09} smoothness={5} position={[0, 0, 0.29]}>
            <meshPhysicalMaterial color="#aeb4bd" roughness={0.2} metalness={0.9} clearcoat={0.8} clearcoatRoughness={0.15} />
          </RoundedBox>
          <RoundedBox args={[0.55, 0.41, 0.05]} radius={0.08} smoothness={5} position={[0, 0, 0.305]}>
            <meshPhysicalMaterial {...glassProps} />
          </RoundedBox>
          {/* glowing yellow disc eyes */}
          <mesh ref={eyeL} position={[-0.14, 0.035, 0.34]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.092, 0.092, 0.03, 32]} />
            <meshStandardMaterial color={EYE} emissive={EYE} emissiveIntensity={1.25} toneMapped={false} />
          </mesh>
          <mesh ref={eyeR} position={[0.14, 0.035, 0.34]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.092, 0.092, 0.03, 32]} />
            <meshStandardMaterial color={EYE} emissive={EYE} emissiveIntensity={1.25} toneMapped={false} />
          </mesh>
          {/* thin mouth slit at the bottom of the screen */}
          <mesh position={[0, -0.155, 0.335]}>
            <planeGeometry args={[0.17, 0.018]} />
            <meshStandardMaterial color="#e8c86a" emissive="#e8c86a" emissiveIntensity={0.7} toneMapped={false} />
          </mesh>
          {/* flat chrome ear fins, like the plate */}
          {[-1, 1].map((s) => (
            <RoundedBox key={s} args={[0.16, 0.05, 0.14]} radius={0.02} smoothness={4} position={[s * 0.43, 0.02, 0.02]}>
              <meshPhysicalMaterial color="#8d939c" roughness={0.24} metalness={0.9} clearcoat={0.5} />
            </RoundedBox>
          ))}
          {/* antennae angled out from the top corners, glowing yellow ball tips */}
          {[
            { r: antL, x: -0.24 },
            { r: antR, x: 0.24 },
          ].map(({ r, x }) => (
            <group key={x} ref={r} position={[x, 0.3, 0]}>
              <mesh position={[0, 0.15, 0]}>
                <cylinderGeometry args={[0.011, 0.011, 0.3, 8]} />
                <meshPhysicalMaterial color="#a8adb5" metalness={0.9} roughness={0.3} />
              </mesh>
              <mesh position={[0, 0.32, 0]}>
                <sphereGeometry args={[0.045, 16, 16]} />
                <meshStandardMaterial color={EYE} emissive={EYE} emissiveIntensity={1.8} toneMapped={false} />
              </mesh>
            </group>
          ))}
        </group>
      </group>
    </group>
  );
}
