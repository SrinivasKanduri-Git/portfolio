import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { ContactShadows, RoundedBox } from '@react-three/drei';
import {
  CanvasTexture,
  DoubleSide,
  ExtrudeGeometry,
  Matrix4,
  MeshStandardMaterial,
  RepeatWrapping,
  Shape,
  SRGBColorSpace,
  type Group,
  type InstancedMesh,
  type Mesh,
} from 'three';
import { useSetActive, useSetLights } from '../cinema';
import feLogoUrl from '../../assets/fe-logo.svg';

// FleetEnable brand tokens, taken from fleetenable-ror SVG assets.
// The lockup itself (amber ring mark + blue wordmark) is rendered from the
// real platform_logo.svg, not re-drawn by hand — see getLogo().
const FE_BLUE = '#3a55c8';
const FE_BLUE_DEEP = '#4b59c9';
const FE_WORDMARK = '#586FCC';
const FE_AMBER = '#FFBA07';
const FE_AMBER_DARK = '#E6A706';

// shared PBR material props — a cabover box truck: blue cab, matte white cargo box
// automotive paint: near-zero metalness under a strong clearcoat — metal-flake
// blue reads as painted steel, not blue plastic
const cabProps = { color: FE_BLUE, roughness: 0.34, metalness: 0.12, clearcoat: 0.9, clearcoatRoughness: 0.16 } as const;
const trimProps = { color: '#0d0f13', roughness: 0.6, metalness: 0.2 } as const;
const glassProps = { color: '#2a3442', roughness: 0.06, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.05, transparent: true, opacity: 0.62 } as const;
const silverProps = { color: '#c2c7ce', roughness: 0.34, metalness: 0.92, clearcoat: 0.4 } as const;
const chassisProps = { color: '#16181d', roughness: 0.72, metalness: 0.3 } as const;
const tireProps = { color: '#14161a', roughness: 0.82, metalness: 0.1 } as const;
const hubProps = { color: '#b8bec7', roughness: 0.3, metalness: 0.92 } as const;
const concreteProps = { color: '#565b64', roughness: 0.95, metalness: 0.05 } as const;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

// ── the real FleetEnable lockup, loaded once and shared by every texture ──
// platform_logo.svg viewBox is 385×49: the amber ring mark spans x 0–49,
// the blue "fleetenable" wordmark the rest.
const LOGO_AR = 385 / 49;
const MARK_FRAC = 50 / 385;
let logoPromise: Promise<HTMLImageElement> | null = null;
function getLogo(): Promise<HTMLImageElement> {
  if (!logoPromise) {
    logoPromise = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.src = feLogoUrl;
    });
  }
  return logoPromise;
}

/** The lockup with the wordmark recolored (mark keeps its two amber tones). */
function tintedLockup(img: HTMLImageElement, w: number, h: number, wordmarkColor: string): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const g = cv.getContext('2d')!;
  g.drawImage(img, 0, 0, w, h);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = wordmarkColor;
  g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = 'source-over';
  // restore the amber mark over the tinted copy
  const markW = Math.ceil(w * MARK_FRAC);
  g.drawImage(img, 0, 0, 385 * MARK_FRAC, 49, 0, 0, markW, h);
  return cv;
}

/**
 * Full cargo-box side panel: riveted vertical seams, bottom rub rail, thin
 * amber beltline — with the genuine FleetEnable lockup and tagline painted on.
 * Drawn immediately with livery only; the lockup lands when the SVG decodes.
 */
function makeBoxSideTexture(): CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = 1024;
  cv.height = 468;
  const g = cv.getContext('2d')!;
  // panel base
  g.fillStyle = '#f2f4f7';
  g.fillRect(0, 0, 1024, 468);
  // vertical panel seams with rivet dots
  for (let x = 93; x < 1024; x += 93) {
    g.fillStyle = 'rgba(148,156,170,0.35)';
    g.fillRect(x, 0, 2, 468);
    g.fillStyle = 'rgba(255,255,255,0.7)';
    g.fillRect(x + 2, 0, 1, 468);
    g.fillStyle = 'rgba(120,128,142,0.4)';
    for (let y = 18; y < 460; y += 34) {
      g.beginPath();
      g.arc(x + 1, y, 2.1, 0, Math.PI * 2);
      g.fill();
    }
  }
  // faint top shading + grime along the bottom edge
  const shade = g.createLinearGradient(0, 0, 0, 468);
  shade.addColorStop(0, 'rgba(255,255,255,0.16)');
  shade.addColorStop(0.25, 'rgba(0,0,0,0)');
  shade.addColorStop(0.9, 'rgba(70,76,88,0.08)');
  shade.addColorStop(1, 'rgba(52,58,70,0.2)');
  g.fillStyle = shade;
  g.fillRect(0, 0, 1024, 468);
  // amber beltline above the rub rail
  g.fillStyle = FE_AMBER;
  g.fillRect(0, 396, 1024, 9);
  g.fillStyle = FE_AMBER_DARK;
  g.fillRect(0, 405, 1024, 3);
  // aluminium rub rail
  g.fillStyle = '#d3d8de';
  g.fillRect(0, 420, 1024, 30);
  g.fillStyle = 'rgba(90,97,108,0.5)';
  g.fillRect(0, 448, 1024, 3);
  g.fillStyle = 'rgba(255,255,255,0.55)';
  g.fillRect(0, 421, 1024, 3);

  // road grime: wheel-spray arcs at both ends + dust rising from the sill
  const spray = (cx: number) => {
    const rg = g.createRadialGradient(cx, 470, 20, cx, 470, 170);
    rg.addColorStop(0, 'rgba(58,54,48,0.4)');
    rg.addColorStop(0.6, 'rgba(70,66,58,0.16)');
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rg;
    g.fillRect(cx - 180, 300, 360, 168);
  };
  spray(90);
  spray(934);
  const dust = g.createLinearGradient(0, 300, 0, 468);
  dust.addColorStop(0, 'rgba(0,0,0,0)');
  dust.addColorStop(1, 'rgba(96,88,74,0.22)');
  g.fillStyle = dust;
  g.fillRect(0, 300, 1024, 168);
  // AO under the roof line
  const roofAO = g.createLinearGradient(0, 0, 0, 40);
  roofAO.addColorStop(0, 'rgba(20,24,32,0.28)');
  roofAO.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = roofAO;
  g.fillRect(0, 0, 1024, 40);

  const tex = new CanvasTexture(cv);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 8;

  getLogo().then((img) => {
    // the real lockup, large on the panel
    const lw = 680;
    const lh = lw / LOGO_AR;
    g.drawImage(img, 118, 128, lw, lh);
    // tagline, straight off the brand PNG
    g.fillStyle = FE_WORDMARK;
    g.font = '600 34px "Poppins", "Lato", "Arial", sans-serif';
    g.textBaseline = 'alphabetic';
    g.fillText('The Most Advanced Final Mile Platform', 190, 286);
    tex.needsUpdate = true;
  });
  return tex;
}

/** Backdrop signage: real lockup, wordmark tinted white for the blue wall. */
function makeSignTexture(): CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = 1024;
  cv.height = 256;
  const g = cv.getContext('2d')!;
  g.fillStyle = FE_BLUE_DEEP;
  g.fillRect(0, 0, 1024, 256);
  const tex = new CanvasTexture(cv);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 8;
  getLogo().then((img) => {
    const lw = 900;
    const lh = lw / LOGO_AR;
    g.drawImage(tintedLockup(img, lw, Math.round(lh), '#ffffff'), 62, (256 - lh) / 2, lw, lh);
    tex.needsUpdate = true;
  });
  return tex;
}

/**
 * The open rear door: a painted interior with depth — plank floor vanishing
 * inward, wall ribs, a dim dome light and a part-loaded wall of cartons.
 */
function makeCargoOpeningTexture(): CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = 256;
  cv.height = 256;
  const g = cv.getContext('2d')!;
  g.fillStyle = '#0a0c10';
  g.fillRect(0, 0, 256, 256);
  // side walls converging inward
  g.fillStyle = '#151920';
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(52, 42);
  g.lineTo(52, 196);
  g.lineTo(0, 256);
  g.closePath();
  g.fill();
  g.beginPath();
  g.moveTo(256, 0);
  g.lineTo(204, 42);
  g.lineTo(204, 196);
  g.lineTo(256, 256);
  g.closePath();
  g.fill();
  // floor: worn planks in perspective
  g.fillStyle = '#3a332a';
  g.beginPath();
  g.moveTo(0, 256);
  g.lineTo(52, 196);
  g.lineTo(204, 196);
  g.lineTo(256, 256);
  g.closePath();
  g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.45)';
  g.lineWidth = 2;
  for (let i = 1; i < 7; i++) {
    const bx = (256 / 7) * i;
    const tx = 52 + (152 / 7) * i;
    g.beginPath();
    g.moveTo(bx, 256);
    g.lineTo(tx, 196);
    g.stroke();
  }
  // dim dome light on the ceiling
  const glow = g.createRadialGradient(128, 44, 4, 128, 44, 60);
  glow.addColorStop(0, 'rgba(255,236,200,0.5)');
  glow.addColorStop(1, 'rgba(255,236,200,0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, 256, 120);
  // cartons already loaded against the far wall
  const carton = (x: number, y: number, w: number, h: number, c: string) => {
    g.fillStyle = c;
    g.fillRect(x, y, w, h);
    g.strokeStyle = 'rgba(0,0,0,0.5)';
    g.lineWidth = 1.5;
    g.strokeRect(x, y, w, h);
    g.fillStyle = 'rgba(0,0,0,0.28)';
    g.fillRect(x, y, w, 5);
  };
  carton(58, 146, 52, 50, '#6d5638');
  carton(112, 152, 46, 44, '#7a6142');
  carton(64, 100, 44, 44, '#66502f');
  carton(160, 148, 42, 48, '#71593a');
  const tex = new CanvasTexture(cv);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Subtle orange-peel paint noise; bumpMap only, so color stays the FE blue. */
function makePaintBump(): CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = 128;
  cv.height = 128;
  const g = cv.getContext('2d')!;
  g.fillStyle = '#808080';
  g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 1400; i++) {
    const v = 112 + Math.floor(Math.random() * 32);
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.fillRect(Math.random() * 128, Math.random() * 128, 1.5, 1.5);
  }
  const tex = new CanvasTexture(cv);
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.repeat.set(3, 3);
  return tex;
}

/** Tire tread + sidewall bump map: vertical lugs around the circumference,
 *  ring grooves on the shoulder. Used as bump+roughness so the tire catches
 *  light like rubber instead of smooth plastic. */
function makeTreadTexture(): CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = 512;
  cv.height = 128;
  const g = cv.getContext('2d')!;
  g.fillStyle = '#606060';
  g.fillRect(0, 0, 512, 128);
  // tread lugs down the contact band (canvas x wraps around the tire)
  for (let x = 0; x < 512; x += 16) {
    g.fillStyle = '#2e2e2e';
    g.fillRect(x, 34, 9, 60);
    g.fillStyle = '#7a7a7a';
    g.fillRect(x + 9, 34, 2, 60);
  }
  // shoulder grooves
  g.fillStyle = '#3a3a3a';
  g.fillRect(0, 24, 512, 5);
  g.fillRect(0, 99, 512, 5);
  const tex = new CanvasTexture(cv);
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.repeat.set(3, 1);
  return tex;
}

// ── cartons: kraft cardboard with real shipping cues ─────────────────────────

/** Kraft base wash + fine flute streaks, shared by every carton face. */
function kraftBase(g: CanvasRenderingContext2D, size: number, tone: string) {
  g.fillStyle = tone;
  g.fillRect(0, 0, size, size);
  for (let i = 0; i < 130; i++) {
    const y = Math.random() * size;
    const v = Math.random();
    g.strokeStyle = v > 0.5 ? `rgba(255,244,222,${0.05 + v * 0.06})` : `rgba(96,70,40,${0.05 + v * 0.07})`;
    g.lineWidth = 0.8 + Math.random() * 1.4;
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(size, y + (Math.random() - 0.5) * 3);
    g.stroke();
  }
  // darkened edges so every box corner reads
  const edge = g.createLinearGradient(0, 0, 0, size);
  edge.addColorStop(0, 'rgba(70,50,26,0.25)');
  edge.addColorStop(0.12, 'rgba(0,0,0,0)');
  edge.addColorStop(0.88, 'rgba(0,0,0,0)');
  edge.addColorStop(1, 'rgba(70,50,26,0.3)');
  g.fillStyle = edge;
  g.fillRect(0, 0, size, size);
}

/** Carton top: closed flaps with a tan tape strip down the centre seam. */
function makeCartonTopTexture(tone: string): CanvasTexture {
  const s = 256;
  const cv = document.createElement('canvas');
  cv.width = s;
  cv.height = s;
  const g = cv.getContext('2d')!;
  kraftBase(g, s, tone);
  // flap seam
  g.strokeStyle = 'rgba(60,42,20,0.55)';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(s / 2, 0);
  g.lineTo(s / 2, s);
  g.stroke();
  g.strokeStyle = 'rgba(255,240,214,0.35)';
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(s / 2 + 3, 0);
  g.lineTo(s / 2 + 3, s);
  g.stroke();
  // packing tape across the seam
  g.fillStyle = 'rgba(196,168,124,0.92)';
  g.fillRect(s / 2 - 26, 0, 52, s);
  g.fillStyle = 'rgba(255,255,255,0.16)';
  g.fillRect(s / 2 - 26, 0, 8, s);
  g.fillRect(s / 2 + 12, 0, 5, s);
  g.strokeStyle = 'rgba(120,96,58,0.5)';
  g.lineWidth = 1;
  g.strokeRect(s / 2 - 26, 0, 52, s);
  const tex = new CanvasTexture(cv);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Carton side: flap fold line, optional shipping label + fragile print. */
function makeCartonSideTexture(tone: string, label: boolean): CanvasTexture {
  const s = 256;
  const cv = document.createElement('canvas');
  cv.width = s;
  cv.height = s;
  const g = cv.getContext('2d')!;
  kraftBase(g, s, tone);
  // top flap fold line
  g.strokeStyle = 'rgba(60,42,20,0.4)';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(0, 30);
  g.lineTo(s, 30);
  g.stroke();
  if (label) {
    // white shipping label, slightly askew, with address bars + barcode
    g.save();
    g.translate(150, 120);
    g.rotate(-0.035);
    g.fillStyle = '#f4f2ec';
    g.fillRect(-52, -38, 104, 76);
    g.strokeStyle = 'rgba(0,0,0,0.25)';
    g.lineWidth = 1;
    g.strokeRect(-52, -38, 104, 76);
    g.fillStyle = '#3c4048';
    for (let i = 0; i < 4; i++) g.fillRect(-42, -26 + i * 11, 60 - i * 12, 4);
    for (let x = -42; x < 44; x += 3) {
      if (Math.random() > 0.4) g.fillRect(x, 22, 2, 12);
    }
    g.restore();
  } else {
    // stencil print: FE amber ring hint + weight
    g.strokeStyle = 'rgba(160,116,32,0.55)';
    g.lineWidth = 7;
    g.beginPath();
    g.arc(70, 130, 26, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = 'rgba(96,70,40,0.6)';
    g.font = '700 22px "Arial", sans-serif';
    g.fillText('THIS SIDE UP', 116, 122);
    g.fillText('▲ ▲', 128, 152);
  }
  const tex = new CanvasTexture(cv);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** One shared 6-face material set per carton variant (all cartons reuse). */
function makeCartonMaterials(tone: string, label: boolean): MeshStandardMaterial[] {
  const side = new MeshStandardMaterial({ map: makeCartonSideTexture(tone, label), roughness: 0.94, metalness: 0 });
  const side2 = new MeshStandardMaterial({ map: makeCartonSideTexture(tone, false), roughness: 0.94, metalness: 0 });
  const top = new MeshStandardMaterial({ map: makeCartonTopTexture(tone), roughness: 0.94, metalness: 0 });
  const bottom = new MeshStandardMaterial({ color: tone, roughness: 0.96, metalness: 0 });
  // boxGeometry face order: +x, −x, +y (top), −y, +z, −z
  return [side2, side2, top, bottom, side, side2];
}

// Parcel resting positions, in set-local coordinates.
// Dock stack (stage-right) → arc across the gap → land on the rear sill →
// slide INSIDE the cargo box (the truck body occludes them — really loaded),
// then back out on the return leg.
const N = 4;
// varied carton dims [w, h, d] — real freight is never uniform.
// i2/i3 form the bottom course of a tidy 2×2 pile; i0/i1 sit on top of them.
const PARCEL_DIMS: [number, number, number][] = [
  [0.44, 0.34, 0.4], // top of i2
  [0.42, 0.3, 0.4], // top of i3
  [0.55, 0.42, 0.48], // bottom course
  [0.5, 0.4, 0.46], // bottom course
];
const DOCK_TOP = 1.0;
const REAR_SILL = 1.12;
const SILL_X = 2.5; // landing spot on the sill, just outside the opening
const IN_X = 1.9; // parked depth inside the box, fully hidden by the body
// stacked pile, clear of the backstock pallet (x ≥ 3.93). Fly order keeps the
// pile physical: tops (i0/i1) leave first, bottoms (i2/i3) land back first.
const DOCK_SLOTS: [number, number, number][] = [
  [3.64, DOCK_TOP + PARCEL_DIMS[2][1] + PARCEL_DIMS[0][1] / 2, -0.28],
  [3.68, DOCK_TOP + PARCEL_DIMS[3][1] + PARCEL_DIMS[1][1] / 2, 0.35],
  [3.62, DOCK_TOP + PARCEL_DIMS[2][1] / 2, -0.3],
  [3.66, DOCK_TOP + PARCEL_DIMS[3][1] / 2, 0.34],
];
const SILL_SLOTS: [number, number, number][] = [
  [SILL_X, 0, -0.28], [SILL_X, 0, 0.34], [SILL_X + 0.04, 0, -0.28], [SILL_X + 0.04, 0, 0.34],
].map((p, i) => [p[0], REAR_SILL + PARCEL_DIMS[i][1] / 2, p[2]]);
// near-zero yaw at rest so the pile reads deliberately stacked, not dumped
const PARCEL_YAW = [0.06, -0.08, 0.02, 0.05];
const CYCLE = 13; // seconds for a full load→dwell→unload→dwell loop
const PUSH = 0.06; // cycle fraction spent sliding across the sill into the box

/** Shared tread map — one canvas for every tire. */
let treadTex: CanvasTexture | null = null;
const getTread = () => (treadTex ??= makeTreadTexture());

const LUGS = 8;

/** A commercial-truck wheel: treaded tire, brake disc behind a silver dished
 *  hub, lug nuts as ONE InstancedMesh (was 6 separate meshes per wheel).
 *  Axis along Z; `dual` adds the inner twin tire of a rear dually axle. */
function Wheel({ x, z, dual = false }: { x: number; z: number; dual?: boolean }) {
  const inner = z > 0 ? -0.27 : 0.27;
  const lugs = useRef<InstancedMesh>(null);
  useEffect(() => {
    if (!lugs.current) return;
    const m = new Matrix4();
    for (let i = 0; i < LUGS; i++) {
      const a = (i / LUGS) * Math.PI * 2;
      m.setPosition(Math.cos(a) * 0.115, 0.152, Math.sin(a) * 0.115);
      lugs.current.setMatrixAt(i, m);
    }
    lugs.current.instanceMatrix.needsUpdate = true;
  }, []);
  return (
    <group position={[x, 0.42, z]} rotation={[Math.PI / 2, 0, 0]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.42, 0.42, 0.26, 36]} />
        <meshStandardMaterial {...tireProps} bumpMap={getTread()} bumpScale={0.9} roughnessMap={getTread()} />
      </mesh>
      {/* sidewall ring detail */}
      <mesh position={[0, 0.132, 0]}>
        <cylinderGeometry args={[0.34, 0.34, 0.006, 36]} />
        <meshStandardMaterial color="#22252b" roughness={0.7} metalness={0.15} />
      </mesh>
      {dual && (
        <mesh position={[0, inner, 0]} castShadow>
          <cylinderGeometry args={[0.42, 0.42, 0.26, 36]} />
          <meshStandardMaterial {...tireProps} bumpMap={getTread()} bumpScale={0.9} roughnessMap={getTread()} />
        </mesh>
      )}
      {/* brake disc + caliper glimpsed behind the hub */}
      <mesh position={[0, 0.11, 0]}>
        <cylinderGeometry args={[0.26, 0.26, 0.012, 28]} />
        <meshStandardMaterial color="#6f7076" roughness={0.35} metalness={0.9} />
      </mesh>
      <mesh position={[0.18, 0.115, 0.1]}>
        <boxGeometry args={[0.12, 0.02, 0.09]} />
        <meshStandardMaterial color="#8a2f2f" roughness={0.55} metalness={0.4} />
      </mesh>
      {/* dished hub face + centre cap */}
      <mesh position={[0, 0.135, 0]}>
        <cylinderGeometry args={[0.2, 0.17, 0.025, 28]} />
        <meshStandardMaterial {...hubProps} />
      </mesh>
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.03, 12]} />
        <meshStandardMaterial {...hubProps} />
      </mesh>
      {/* 8 lug nuts, one instanced draw call */}
      <instancedMesh ref={lugs} args={[undefined, undefined, LUGS]}>
        <cylinderGeometry args={[0.02, 0.02, 0.02, 6]} />
        <meshStandardMaterial color="#9aa0a9" roughness={0.35} metalness={0.9} />
      </instancedMesh>
    </group>
  );
}

/**
 * The cab body as ONE extruded side-profile silhouette instead of stacked
 * boxes: curved forward-leaning nose, raked windshield line, rounded roof,
 * and a real front wheel-arch cutout. The profile is what the camera reads
 * broadside — this is what stops the cab looking like a cube.
 */
function makeCabGeometry(): ExtrudeGeometry {
  // wound counter-clockwise so the extrude's swept walls face outward
  const s = new Shape();
  s.moveTo(-2.25, 0.62); // rocker ahead of the front arch
  s.lineTo(-1.98, 0.66);
  // front wheel-arch cutout (wheel at x=-1.5, r=0.42 — 0.54 leaves a tire gap)
  s.absarc(-1.5, 0.42, 0.54, Math.PI - Math.atan2(0.24, 0.48), Math.atan2(0.24, 0.48), true);
  s.lineTo(-0.97, 0.66); // rear bottom, tucked behind the box
  s.lineTo(-0.97, 2.12); // rear edge
  s.quadraticCurveTo(-0.97, 2.2, -1.05, 2.2); // rear top corner
  s.lineTo(-1.85, 2.18); // roof, rising a touch toward the box
  s.quadraticCurveTo(-1.98, 2.16, -2.02, 2.06); // roof front radius
  s.lineTo(-2.28, 1.34); // raked windshield line down to the cowl
  s.lineTo(-2.33, 1.28);
  s.quadraticCurveTo(-2.39, 1.0, -2.33, 0.72); // curved flat nose, slight bulge
  const geo = new ExtrudeGeometry(s, {
    depth: 1.68,
    bevelEnabled: true,
    bevelThickness: 0.035,
    bevelSize: 0.03,
    bevelSegments: 3,
    curveSegments: 32,
  });
  geo.translate(0, 0, -0.84); // centre on the chassis
  return geo;
}

/**
 * Door glass: rounded-corner trapezoid whose front edge follows the A-pillar
 * rake and whose top follows the roofline — a window that belongs to the
 * cab, not a black sticker on a slab. Centred on the origin so one geometry
 * serves both sides (and, scaled up a hair, the rubber gasket behind it).
 */
function makeDoorWindowGeometry(): ExtrudeGeometry {
  const w = new Shape();
  w.moveTo(-1.92, 1.58);
  w.lineTo(-1.18, 1.58);
  w.quadraticCurveTo(-1.12, 1.58, -1.12, 1.64);
  w.lineTo(-1.12, 1.96);
  w.quadraticCurveTo(-1.12, 2.02, -1.18, 2.02);
  w.lineTo(-1.78, 2.02);
  w.quadraticCurveTo(-1.85, 2.02, -1.87, 1.97); // front-top corner into the rake
  w.lineTo(-1.99, 1.66); // raked leading edge, parallel to the windshield
  w.quadraticCurveTo(-2.01, 1.58, -1.94, 1.58);
  const geo = new ExtrudeGeometry(w, { depth: 0.012, bevelEnabled: false, curveSegments: 12 });
  geo.translate(1.556, -1.8, -0.006); // centroid → origin
  return geo;
}

/** Semicircular fender arch hugging a wheel. */
function Fender({ x, z, r = 0.5 }: { x: number; z: number; r?: number }) {
  return (
    <mesh position={[x, 0.42, z]} rotation={[0, 0, 0]}>
      <torusGeometry args={[r, 0.055, 8, 20, Math.PI]} />
      <meshStandardMaterial color="#101318" roughness={0.6} metalness={0.4} />
    </mesh>
  );
}

/**
 * SC.WORK — FleetEnable. A cabover delivery box truck broadside to the camera:
 * an FE-blue flat-nose cab up front (stage-left) and a tall matte-white cargo
 * box carrying the genuine FleetEnable lockup, backed to a warehouse dock.
 * Kraft cartons cycle off the dock stack to the truck's open rear door and
 * back on a continuous eased loop. Lit with soft, even, product-shot fills.
 */
export function FleetEnableDock({ position = [0, 0, 0] }: { position?: [number, number, number] }) {
  const truck = useRef<Group>(null);
  const parcels = useRef<(Mesh | null)[]>([]);
  const hazards = useRef<(MeshStandardMaterial | null)[]>([]);

  const sideTex = useMemo(makeBoxSideTexture, []);
  const signTex = useMemo(makeSignTexture, []);
  const openingTex = useMemo(makeCargoOpeningTexture, []);
  const paintBump = useMemo(makePaintBump, []);
  const cabGeo = useMemo(makeCabGeometry, []);
  const doorWinGeo = useMemo(makeDoorWindowGeometry, []);
  const cartonMats = useMemo(
    () => [
      makeCartonMaterials('#c89b64', true),
      makeCartonMaterials('#b98c55', false),
      makeCartonMaterials('#cea16b', true),
      makeCartonMaterials('#bf915b', false),
    ],
    [],
  );

  // even, soft product lighting on the shared stage rig — no hard top key
  // (removed per direction); the key here is a wide, beam-less grounding spot
  // that anchors the truck with a real shadow
  useSetLights(position[0], () => ({
    key: { position: [-3.5, 5.5, 3], target: [0, 0.9, 0], intensity: 60, color: '#f3ede2', angle: 0.62, volumetric: 0 },
    points: [
      { position: [0, 2.4, 4.8], color: '#ffffff', intensity: 9, distance: 15 },
      { position: [-3.2, 1.9, 2.4], color: '#dce6ff', intensity: 7, distance: 13 },
      { position: [3.4, 1.9, 2.4], color: '#fff3e2', intensity: 6.5, distance: 13 },
      // low fill washing the running gear — wheels/chassis go dead black without
      { position: [0, 0.5, 3.2], color: '#c9d4e6', intensity: 2.6, distance: 8 },
      // cabin glow so the interior reads through the tinted door glass
      { position: [-1.53, 1.82, 0], color: '#cfe0ff', intensity: 1.6, distance: 2.2 },
    ],
  }));
  const setActive = useSetActive();
  useFrame((state) => {
    if (!setActive) return;
    const t = state.clock.elapsedTime;
    const cyc = (t % CYCLE) / CYCLE;
    let loaded = 0;
    parcels.current.forEach((m, i) => {
      if (!m) return;
      const d = DOCK_SLOTS[i];
      const b = SILL_SLOTS[i];
      const ls = 0.05 + i * 0.085; // fly: dock → sill (arc)
      const le = ls + 0.13;
      const pe = le + PUSH; // push: sill → inside the box
      const us = 0.55 + (N - 1 - i) * 0.082; // pull starts (inside → sill)
      const ue = us + PUSH + 0.13; // fly back lands
      let px = d[0];
      let py = d[1];
      let pz = d[2];
      let yaw = PARCEL_YAW[i];
      let inTruck = false;
      if (cyc >= ls && cyc < le) {
        const s = easeInOut((cyc - ls) / (le - ls));
        px = lerp(d[0], b[0], s);
        pz = lerp(d[2], b[2], s);
        py = lerp(d[1], b[1], s) + Math.sin(Math.PI * s) * 0.5;
        yaw = PARCEL_YAW[i] + Math.sin(Math.PI * s) * 0.2;
      } else if (cyc >= le && cyc < pe) {
        // shoved across the sill into the dark of the box
        const s = easeInOut((cyc - le) / PUSH);
        px = lerp(b[0], IN_X, s);
        py = b[1];
        pz = b[2];
      } else if (cyc >= pe && cyc < us) {
        px = IN_X;
        py = b[1];
        pz = b[2];
        inTruck = true;
      } else if (cyc >= us && cyc < us + PUSH) {
        const s = easeInOut((cyc - us) / PUSH);
        px = lerp(IN_X, b[0], s);
        py = b[1];
        pz = b[2];
      } else if (cyc >= us + PUSH && cyc < ue) {
        const s = easeInOut((cyc - us - PUSH) / (ue - us - PUSH));
        px = lerp(b[0], d[0], s);
        pz = lerp(b[2], d[2], s);
        py = lerp(b[1], d[1], s) + Math.sin(Math.PI * s) * 0.5;
        yaw = PARCEL_YAW[i] - Math.sin(Math.PI * s) * 0.2;
      }
      m.position.set(px, py, pz);
      m.rotation.y = yaw;
      if (inTruck) loaded++;
    });
    // truck settles under load + a slow idle sway so the held frame stays alive
    if (truck.current) {
      truck.current.position.y = -0.02 * (loaded / N) + Math.sin(t * 0.9) * 0.005;
      truck.current.rotation.z = Math.sin(t * 0.7) * 0.0025;
    }
    // amber hazards blink
    const blink = Math.sin(t * 6) > 0 ? 1.7 : 0.12;
    hazards.current.forEach((mm) => {
      if (mm) mm.emissiveIntensity = blink;
    });
  });

  return (
    <group position={position}>
      <ContactShadows position={[0, 0.012, 0.3]} scale={10} far={2.8} blur={2.8} opacity={0.55} frames={1} />

      {/* ── DOCK SET ── */}
      {/* FE-blue backdrop wall with signage */}
      <mesh position={[0.5, 2.3, -1.85]}>
        <planeGeometry args={[13, 5.0]} />
        <meshStandardMaterial color={FE_BLUE_DEEP} roughness={0.9} metalness={0.05} />
      </mesh>
      <mesh position={[-1.2, 3.2, -1.8]}>
        <planeGeometry args={[4.4, 1.1]} />
        <meshStandardMaterial map={signTex} emissive="#ffffff" emissiveMap={signTex} emissiveIntensity={0.3} toneMapped={false} roughness={0.6} />
      </mesh>
      {/* roll-up dock door behind the dock platform */}
      <mesh position={[3.9, 1.8, -1.7]}>
        <boxGeometry args={[2.4, 3.2, 0.1]} />
        <meshStandardMaterial color={FE_BLUE} roughness={0.55} metalness={0.4} />
      </mesh>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <mesh key={i} position={[3.9, 0.6 + i * 0.48, -1.64]}>
          <boxGeometry args={[2.36, 0.06, 0.04]} />
          <meshStandardMaterial color={FE_BLUE_DEEP} roughness={0.6} metalness={0.3} />
        </mesh>
      ))}
      {/* raised concrete dock platform (parcels stage on top, y≈1.0) */}
      <mesh position={[3.85, 0.5, -0.1]} castShadow receiveShadow>
        <boxGeometry args={[1.9, 1.0, 2.3]} />
        <meshStandardMaterial {...concreteProps} />
      </mesh>
      {/* black rubber dock bumpers on the dock face */}
      {[-0.72, 0.55].map((z) => (
        <mesh key={z} position={[2.87, 0.78, z]}>
          <boxGeometry args={[0.1, 0.3, 0.26]} />
          <meshStandardMaterial color="#0e0f12" roughness={0.92} metalness={0.05} />
        </mesh>
      ))}
      {/* amber dock-edge safety stripe */}
      <mesh position={[2.9, 1.005, -0.1]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.14, 2.3]} />
        <meshStandardMaterial color={FE_AMBER} emissive={FE_AMBER} emissiveIntensity={0.4} toneMapped={false} />
      </mesh>
      {/* dock leveller plate bridging the dock to the truck's rear sill */}
      <mesh position={[2.62, 1.16, 0.05]} rotation={[0, 0, 0.12]} receiveShadow>
        <boxGeometry args={[0.7, 0.05, 1.5]} />
        <meshStandardMaterial color="#6b7079" roughness={0.6} metalness={0.5} />
      </mesh>
      {/* wooden pallet of backstock cartons waiting by the roll-up door */}
      <group position={[4.32, DOCK_TOP, -0.62]}>
        {[-0.28, 0, 0.28].map((z) => (
          <mesh key={z} position={[0, 0.03, z]} castShadow>
            <boxGeometry args={[0.78, 0.05, 0.1]} />
            <meshStandardMaterial color="#8a6a42" roughness={0.9} metalness={0} />
          </mesh>
        ))}
        <mesh position={[0, 0.075, 0]}>
          <boxGeometry args={[0.78, 0.03, 0.68]} />
          <meshStandardMaterial color="#96754b" roughness={0.9} metalness={0} />
        </mesh>
        <mesh position={[-0.16, 0.3, -0.12]} castShadow material={cartonMats[1]}>
          <boxGeometry args={[0.42, 0.4, 0.4]} />
        </mesh>
        <mesh position={[0.26, 0.26, 0.16]} rotation={[0, 0.2, 0]} castShadow material={cartonMats[0]}>
          <boxGeometry args={[0.36, 0.34, 0.36]} />
        </mesh>
        <mesh position={[-0.1, 0.64, -0.06]} rotation={[0, -0.25, 0]} castShadow material={cartonMats[2]}>
          <boxGeometry args={[0.38, 0.28, 0.34]} />
        </mesh>
      </group>

      {/* ── PARCELS (animated) ── */}
      {Array.from({ length: N }).map((_, i) => (
        <mesh key={i} ref={(el) => (parcels.current[i] = el)} position={DOCK_SLOTS[i]} castShadow material={cartonMats[i]}>
          <boxGeometry args={PARCEL_DIMS[i]} />
        </mesh>
      ))}

      {/* ── THE BOX TRUCK — cabover: blue flat-nose cab (stage-left) + tall
          white cargo box (stage-right, rear at the dock) ── */}
      <group ref={truck}>
        {/* wheels: front singles under the cab, rear duallies under the box */}
        <Wheel x={-1.5} z={0.92} />
        <Wheel x={-1.5} z={-0.92} />
        <Wheel x={1.75} z={0.92} dual />
        <Wheel x={1.75} z={-0.92} dual />
        {/* front arches are cut into the cab silhouette itself */}
        <Fender x={1.75} z={0.96} r={0.52} />
        <Fender x={1.75} z={-0.96} r={0.52} />

        {/* black chassis frame skirt under the body */}
        <mesh position={[0.4, 0.66, 0]} castShadow>
          <boxGeometry args={[4.5, 0.26, 1.4]} />
          <meshStandardMaterial {...chassisProps} />
        </mesh>
        {/* fuel tank (camera side) + battery box (far side) between the axles */}
        <mesh position={[0.1, 0.44, 0.62]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.15, 0.15, 0.72, 18]} />
          <meshStandardMaterial {...silverProps} />
        </mesh>
        {[0.62].map((z) => (
          <mesh key={z} position={[0.62, 0.44, z]}>
            <boxGeometry args={[0.24, 0.2, 0.14]} />
            <meshStandardMaterial color="#22252c" roughness={0.7} metalness={0.3} />
          </mesh>
        ))}
        <mesh position={[0.1, 0.44, -0.62]}>
          <boxGeometry args={[0.7, 0.24, 0.16]} />
          <meshStandardMaterial color="#1d2026" roughness={0.7} metalness={0.35} />
        </mesh>
        {/* exhaust stub behind the fuel tank */}
        <mesh position={[0.85, 0.36, 0.55]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.045, 0.045, 0.4, 10]} />
          <meshStandardMaterial color="#4a4e56" roughness={0.5} metalness={0.8} />
        </mesh>
        {/* DOT underride guard below the rear sill */}
        <mesh position={[2.36, 0.42, 0]}>
          <boxGeometry args={[0.06, 0.07, 1.5]} />
          <meshStandardMaterial {...chassisProps} />
        </mesh>
        {[0.5, -0.5].map((z) => (
          <mesh key={z} position={[2.36, 0.6, z]}>
            <boxGeometry args={[0.05, 0.3, 0.06]} />
            <meshStandardMaterial {...chassisProps} />
          </mesh>
        ))}
        {/* mudflap behind the rear wheels */}
        {[0.92, -0.92].map((z) => (
          <mesh key={z} position={[2.2, 0.28, z]}>
            <boxGeometry args={[0.04, 0.3, 0.34]} />
            <meshStandardMaterial color="#0d0e11" roughness={0.9} metalness={0.1} />
          </mesh>
        ))}

        {/* ── CAB — one pressed-steel silhouette: curved flat nose, raked
            windshield line, rounded roof and a real front wheel-arch cutout
            (makeCabGeometry). The profile is what the camera reads. ── */}
        <mesh geometry={cabGeo} castShadow>
          <meshPhysicalMaterial {...cabProps} bumpMap={paintBump} bumpScale={0.35} envMapIntensity={1.15} />
        </mesh>
        {/* dark arch liner inside the cutout + painted fender lips */}
        <mesh position={[-1.5, 0.42, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.5, 0.5, 1.64, 24, 1, true]} />
          <meshStandardMaterial color="#0a0c10" roughness={0.9} metalness={0.05} side={DoubleSide} />
        </mesh>
        {[0.878, -0.878].map((z) => (
          <mesh key={z} position={[-1.5, 0.42, z]}>
            <torusGeometry args={[0.54, 0.032, 10, 24, Math.PI]} />
            <meshPhysicalMaterial {...cabProps} />
          </mesh>
        ))}
        {/* cab interior — dashboard, seats, wheel; what turns the glass from a
            black sticker into a window */}
        <group position={[-1.53, 1.52, 0]}>
          {/* dash top spanning the windshield base */}
          <mesh position={[-0.42, 0.06, 0]}>
            <boxGeometry args={[0.3, 0.14, 1.5]} />
            <meshStandardMaterial color="#14171c" roughness={0.85} metalness={0.05} />
          </mesh>
          {/* two seats */}
          {[0.42, -0.42].map((z) => (
            <group key={z} position={[-0.1, 0.02, z]}>
              <mesh>
                <boxGeometry args={[0.34, 0.1, 0.4]} />
                <meshStandardMaterial color="#23272e" roughness={0.9} />
              </mesh>
              <mesh position={[0.16, 0.26, 0]} rotation={[0, 0, 0.12]}>
                <boxGeometry args={[0.08, 0.46, 0.4]} />
                <meshStandardMaterial color="#262b33" roughness={0.9} />
              </mesh>
            </group>
          ))}
          {/* steering wheel, driver side toward camera */}
          <mesh position={[-0.32, 0.16, 0.42]} rotation={[0.35, 0, 0]}>
            <torusGeometry args={[0.11, 0.016, 8, 24]} />
            <meshStandardMaterial color="#111318" roughness={0.6} />
          </mesh>
        </group>
        {/* windshield lying on the raked nose line: gasket, then glass */}
        <RoundedBox args={[0.05, 0.84, 1.56]} radius={0.02} smoothness={4} position={[-2.16, 1.7, 0]} rotation={[0, 0, -0.34]}>
          <meshStandardMaterial {...trimProps} />
        </RoundedBox>
        <RoundedBox args={[0.06, 0.74, 1.44]} radius={0.04} smoothness={4} position={[-2.185, 1.7, 0]} rotation={[0, 0, -0.34]}>
          <meshPhysicalMaterial {...glassProps} />
        </RoundedBox>
        {/* wiper blades parked at the windshield base */}
        {[0.34, -0.14].map((z) => (
          <mesh key={z} position={[-2.22, 1.44, z]} rotation={[z > 0 ? 0.55 : 0.45, 0, -0.34]}>
            <boxGeometry args={[0.016, 0.3, 0.035]} />
            <meshStandardMaterial color="#0a0b0e" roughness={0.5} metalness={0.4} />
          </mesh>
        ))}
        {/* roof fairing — wind deflector bridging the cab roof to the box */}
        <RoundedBox args={[0.56, 0.05, 1.56]} radius={0.025} smoothness={4} position={[-1.06, 2.27, 0]} rotation={[0, 0, 0.3]} castShadow>
          <meshPhysicalMaterial {...cabProps} />
        </RoundedBox>
        {/* sun visor above the glass */}
        <mesh position={[-2.07, 2.12, 0]} rotation={[0, 0, -0.42]}>
          <boxGeometry args={[0.16, 0.03, 1.48]} />
          <meshStandardMaterial color={FE_BLUE} roughness={0.4} metalness={0.4} />
        </mesh>
        {/* amber cab-roof marker lights on the roof's front lip */}
        {[-0.34, 0, 0.34].map((z) => (
          <mesh key={z} position={[-1.9, 2.22, z]}>
            <boxGeometry args={[0.07, 0.045, 0.12]} />
            <meshStandardMaterial color={FE_AMBER} emissive={FE_AMBER} emissiveIntensity={0.5} toneMapped={false} />
          </mesh>
        ))}
        {/* door glass following the pillar rake — rubber gasket surround
            first, glass proud of it, vent-window divider up front */}
        {[0.895, -0.895].map((z) => (
          <group key={z} position={[-1.556, 1.8, z]}>
            <mesh geometry={doorWinGeo} scale={[1.06, 1.16, 1]}>
              <meshStandardMaterial {...trimProps} />
            </mesh>
            <mesh geometry={doorWinGeo} position={[0, 0, z > 0 ? 0.008 : -0.008]}>
              <meshPhysicalMaterial {...glassProps} />
            </mesh>
            <mesh position={[-0.24, 0, z > 0 ? 0.012 : -0.012]} rotation={[0, 0, -0.34]}>
              <boxGeometry args={[0.024, 0.42, 0.014]} />
              <meshStandardMaterial {...trimProps} />
            </mesh>
          </group>
        ))}
        {/* door cutline, recessed panel, handle and entry step */}
        {[0.879, -0.879].map((z) => (
          <group key={z}>
            {[-2.01, -1.1].map((x) => (
              <mesh key={x} position={[x, 1.1, z]}>
                <boxGeometry args={[0.015, 0.84, 0.012]} />
                <meshStandardMaterial color="#26347e" roughness={0.5} metalness={0.4} />
              </mesh>
            ))}
            {/* recessed door panel under the window — breaks the flat slab */}
            <mesh position={[-1.56, 1.1, z * 1.008]}>
              <boxGeometry args={[0.82, 0.42, 0.015]} />
              <meshPhysicalMaterial color="#3049b4" roughness={0.38} metalness={0.35} clearcoat={0.5} />
            </mesh>
            <mesh position={[-1.22, 1.36, z * 1.014]}>
              <boxGeometry args={[0.14, 0.035, 0.03]} />
              <meshStandardMaterial {...silverProps} />
            </mesh>
            {/* entry step under the door */}
            <mesh position={[-1.56, 0.6, z * 1.02]}>
              <boxGeometry args={[0.5, 0.05, 0.1]} />
              <meshStandardMaterial color="#101318" roughness={0.7} metalness={0.4} />
            </mesh>
          </group>
        ))}
        {/* grille: dark recessed cavity with three bright slats, low on the nose */}
        <mesh position={[-2.33, 1.02, 0]}>
          <boxGeometry args={[0.06, 0.32, 1.4]} />
          <meshStandardMaterial color="#101318" roughness={0.7} metalness={0.3} />
        </mesh>
        {[0.93, 1.02, 1.11].map((y) => (
          <mesh key={y} position={[-2.365, y, 0]}>
            <boxGeometry args={[0.02, 0.05, 1.36]} />
            <meshStandardMaterial {...silverProps} roughness={0.45} />
          </mesh>
        ))}
        {/* chrome bumper + license plate + chassis lip */}
        <mesh position={[-2.34, 0.72, 0]} castShadow>
          <boxGeometry args={[0.14, 0.22, 1.72]} />
          <meshStandardMaterial {...silverProps} />
        </mesh>
        <mesh position={[-2.42, 0.72, 0]}>
          <boxGeometry args={[0.02, 0.14, 0.3]} />
          <meshStandardMaterial color="#e6e9ee" roughness={0.5} metalness={0.1} />
        </mesh>
        <mesh position={[-2.31, 0.52, 0]}>
          <boxGeometry args={[0.1, 0.2, 1.6]} />
          <meshStandardMaterial {...chassisProps} />
        </mesh>
        {/* round headlights in silver bezels */}
        {[0.62, -0.62].map((z) => (
          <group key={z}>
            <mesh position={[-2.36, 0.94, z]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.115, 0.115, 0.03, 20]} />
              <meshStandardMaterial {...silverProps} />
            </mesh>
            <mesh position={[-2.375, 0.94, z]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.095, 0.095, 0.03, 20]} />
              <meshStandardMaterial color="#eef4ff" emissive="#dce8ff" emissiveIntensity={0.6} toneMapped={false} />
            </mesh>
          </group>
        ))}
        {/* amber turn signals / hazards — front + rear corners */}
        {[
          [-2.32, 0.68, 0.66],
          [-2.32, 0.68, -0.66],
          [2.42, 1.0, 0.7],
          [2.42, 1.0, -0.7],
        ].map((p, i) => (
          <mesh key={i} position={p as [number, number, number]}>
            <boxGeometry args={[0.06, 0.14, 0.16]} />
            <meshStandardMaterial ref={(el) => (hazards.current[i] = el)} color={FE_AMBER} emissive={FE_AMBER} emissiveIntensity={0.12} toneMapped={false} />
          </mesh>
        ))}
        {/* wing mirror on a stalk, hung off the A-pillar */}
        {[0.94, -0.94].map((z) => (
          <group key={z} position={[-2.06, 1.9, z]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.02, 0.02, 0.16, 8]} />
              <meshStandardMaterial color="#1b1e24" roughness={0.5} metalness={0.6} />
            </mesh>
            <mesh position={[-0.04, 0.02, z > 0 ? 0.11 : -0.11]}>
              <boxGeometry args={[0.05, 0.2, 0.1]} />
              <meshStandardMaterial color="#1b1e24" roughness={0.4} metalness={0.6} />
            </mesh>
          </group>
        ))}

        {/* ── CARGO BOX (white, taller than the cab) ── */}
        <RoundedBox args={[3.4, 1.56, 1.8]} radius={0.045} smoothness={4} position={[0.72, 1.55, 0]} castShadow receiveShadow>
          <meshPhysicalMaterial color="#f2f4f7" roughness={0.5} metalness={0.1} clearcoat={0.18} clearcoatRoughness={0.4} />
        </RoundedBox>
        {/* silver roof rail + front/rear corner posts */}
        <mesh position={[0.72, 2.34, 0]}>
          <boxGeometry args={[3.42, 0.08, 1.82]} />
          <meshStandardMaterial {...silverProps} />
        </mesh>
        {[-0.98, 2.42].map((x) => (
          <mesh key={x} position={[x, 1.55, 0]}>
            <boxGeometry args={[0.06, 1.56, 1.82]} />
            <meshStandardMaterial {...silverProps} />
          </mesh>
        ))}
        {/* red rear clearance markers on the top corners */}
        {[0.8, -0.8].map((z) => (
          <mesh key={z} position={[2.44, 2.28, z]}>
            <boxGeometry args={[0.04, 0.05, 0.1]} />
            <meshStandardMaterial color="#d02832" emissive="#d02832" emissiveIntensity={0.5} toneMapped={false} />
          </mesh>
        ))}
        {/* full livery side panels — seams, rub rail and the real FE lockup */}
        {[0.905, -0.905].map((z) => (
          <mesh key={z} position={[0.72, 1.56, z]} rotation={[0, z > 0 ? 0 : Math.PI, 0]}>
            <planeGeometry args={[3.34, 1.5]} />
            <meshStandardMaterial map={sideTex} roughness={0.5} metalness={0.06} />
          </mesh>
        ))}
        {/* amber side marker lights along the box bottom edge */}
        {[0.912, -0.912].map((z) =>
          [-0.6, 0.7, 1.9].map((x) => (
            <mesh key={`${z}${x}`} position={[x, 0.84, z]}>
              <boxGeometry args={[0.1, 0.04, 0.03]} />
              <meshStandardMaterial color={FE_AMBER} emissive={FE_AMBER} emissiveIntensity={0.45} toneMapped={false} />
            </mesh>
          )),
        )}
        {/* open rear door — painted interior with real depth (loading side) */}
        <mesh position={[2.415, 1.5, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[1.5, 1.4]} />
          <meshBasicMaterial map={openingTex} toneMapped={false} />
        </mesh>
        {/* raised roll-up door slats above the opening + side rails */}
        <mesh position={[2.44, 2.18, 0]}>
          <boxGeometry args={[0.05, 0.24, 1.6]} />
          <meshStandardMaterial color="#d7dbe1" roughness={0.5} metalness={0.4} />
        </mesh>
        {[0.78, -0.78].map((z) => (
          <mesh key={z} position={[2.44, 1.5, z]}>
            <boxGeometry args={[0.04, 1.4, 0.05]} />
            <meshStandardMaterial {...silverProps} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
