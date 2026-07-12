import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { SpotLight as VolumetricSpot, Sparkles } from '@react-three/drei';
import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  Object3D,
  RepeatWrapping,
  SRGBColorSpace,
  type Group,
  type PointLight as ThreePointLight,
  type SpotLight as ThreeSpotLight,
} from 'three';

export type Quality = 'full' | 'lite';
export const QualityCtx = createContext<Quality>('full');
export const useQuality = () => useContext(QualityCtx);

/** Whether the set this component sits in is near enough to be rendered. */
export const SetActiveCtx = createContext(true);
export const useSetActive = () => useContext(SetActiveCtx);

/**
 * Every mounted SetGroup registers its cull rule here so the Stage's warm-up
 * can reproduce the exact visibility state of any camera position and
 * pre-compile the shader permutations culling will create. three.js bakes the
 * visible light counts into every program, so each cull boundary that changes
 * the count re-links shaders for the whole visible scene — unless that
 * permutation was already compiled behind the curtain (measured: 100ms–2.3s
 * first-ride hitches without the pre-warm).
 */
export const setCullRegistry: { x: number; radius: number; group: { current: Group | null } }[] = [];
if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__cullRegistry = setCullRegistry;

/**
 * Distance-culls a whole set. Sets sit 13 units apart on X and the stage fog
 * is fully opaque at 11.5, so any set whose centre is >10.5 units of dolly
 * travel away is already invisible — but without this it still costs full
 * price: its shadow-casting key light forces a shadow-map pass every frame,
 * its lights bloat every fragment shader's light loop (measured on Iris Xe:
 * 24 live lights ≈ +20ms/frame over the culled 6), and it re-renders again
 * inside the floor reflector. Toggling `visible` drops the set (and its
 * lights) out of every render list. The `active` flag is also published via
 * context so expensive per-frame effects inside (e.g. the gem's transmission
 * FBO) can pause with it.
 */
export function SetGroup({ x, radius = 9, children }: { x: number; radius?: number; children: ReactNode }) {
  const group = useRef<Group>(null);
  const [active, setActive] = useState(true);
  useEffect(() => {
    const entry = { x, radius, group };
    setCullRegistry.push(entry);
    return () => {
      const i = setCullRegistry.indexOf(entry);
      if (i !== -1) setCullRegistry.splice(i, 1);
    };
  }, [x, radius]);
  useFrame(({ camera }) => {
    const near = Math.abs(camera.position.x - x) < radius;
    if (group.current && group.current.visible !== near) group.current.visible = near;
    setActive((prev) => (prev === near ? prev : near)); // bails out when unchanged
  });
  return (
    <group ref={group}>
      <SetActiveCtx.Provider value={active}>{children}</SetActiveCtx.Provider>
    </group>
  );
}

/**
 * The one light plan every set hangs from, so the whole soundstage reads as a
 * single photographed space: a warm tungsten key high on stage right, a cool
 * bounce fill from the left, and a blue rim from upstage. Sets add only their
 * own practicals (screens, neon, gem glow) on top of this rig.
 */
export const KEY = '#ffd9ad'; // tungsten fresnel key
export const FILL = '#9db8e8'; // cool bounce fill
export const RIM = '#bfd8ff'; // upstage blue rim

/**
 * ── THE ONE LIGHT RIG ─────────────────────────────────────────────────────
 * All stage lighting comes from a single always-visible rig — one shadow-
 * casting key spot (with the volumetric cone), one secondary spot and five
 * point practicals — that follows the dolly and morphs into each set's light
 * plan. Sets REGISTER a spec instead of mounting their own lights.
 *
 * Why: three.js bakes the visible light COUNTS into every shader program.
 * With per-set lights, every cull boundary changed the counts and re-linked
 * the whole visible scene's programs mid-scroll — multi-second freezes on
 * Mesa/iGPU machines, unfixable by scheduling because link time explodes
 * under CPU load. With one constant rig the census never changes, every
 * material compiles exactly once behind the curtain, and scroll-time shader
 * work is ZERO by construction.
 *
 * Parked shots reproduce each set's original plan exactly (weight 1 on the
 * nearest spec). Transits cross-fade the two nearest specs — the old per-set
 * rigs popped on/off at the cull radius, deep in the fog; the fade happens in
 * the same place and reads smoother.
 */
export type RigPoint = {
  position: [number, number, number];
  color: string;
  intensity: number;
  distance: number;
  decay?: number;
};
export type RigSpot = {
  position: [number, number, number];
  target: [number, number, number];
  intensity: number;
  color?: string;
  angle?: number;
  /** cone opacity for the key beam (full tier); 0 = light only, no cone */
  volumetric?: number;
};
export type RigSpec = { key: RigSpot; spot2?: RigSpot; points: RigPoint[] };

export const rigRegistry: { x: number; spec: RigSpec }[] = [];

/**
 * Register this set's light plan (positions in set-local coordinates).
 * Returns the live spec object — mutate its fields from useFrame to animate
 * practicals (the rig reads it every frame).
 */
export function useSetLights(x: number, init: () => RigSpec): RigSpec {
  const spec = useRef<RigSpec | null>(null);
  if (!spec.current) spec.current = init();
  useEffect(() => {
    const entry = { x, spec: spec.current! };
    rigRegistry.push(entry);
    return () => {
      const i = rigRegistry.indexOf(entry);
      if (i !== -1) rigRegistry.splice(i, 1);
    };
  }, [x]);
  return spec.current;
}

const POINT_SLOTS = 5;
const colA = new Color();
const colB = new Color();
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Blend one spot slot between the two nearest sets' specs (world space). */
function blendSpot(
  light: ThreeSpotLight | null,
  tgt: Object3D | null,
  ax: number,
  a: RigSpot | undefined,
  bx: number,
  b: RigSpot | undefined,
  t: number,
) {
  if (!light || !tgt) return;
  const ia = a ? a.intensity : 0;
  const ib = b ? b.intensity : 0;
  light.intensity = lerp(ia, ib, t);
  const pa = a ?? b;
  const pb = b ?? a;
  if (!pa || !pb) return;
  light.position.set(
    lerp(ax + pa.position[0], bx + pb.position[0], t),
    lerp(pa.position[1], pb.position[1], t),
    lerp(pa.position[2], pb.position[2], t),
  );
  tgt.position.set(
    lerp(ax + pa.target[0], bx + pb.target[0], t),
    lerp(pa.target[1], pb.target[1], t),
    lerp(pa.target[2], pb.target[2], t),
  );
  light.angle = lerp(pa.angle ?? 0.5, pb.angle ?? 0.5, t);
  light.color.copy(colA.set(pa.color ?? KEY).lerp(colB.set(pb.color ?? KEY), t));
}

/** Blend one point slot; missing slots fade to zero intensity. */
function blendPoint(
  light: ThreePointLight | null,
  ax: number,
  a: RigPoint | undefined,
  bx: number,
  b: RigPoint | undefined,
  t: number,
) {
  if (!light) return;
  light.intensity = lerp(a ? a.intensity : 0, b ? b.intensity : 0, t);
  const pa = a ?? b;
  const pb = b ?? a;
  if (!pa || !pb) {
    light.intensity = 0;
    return;
  }
  light.position.set(
    lerp(ax + pa.position[0], bx + pb.position[0], t),
    lerp(pa.position[1], pb.position[1], t),
    lerp(pa.position[2], pb.position[2], t),
  );
  light.distance = lerp(pa.distance, pb.distance, t);
  light.decay = lerp(pa.decay ?? 2, pb.decay ?? 2, t);
  light.color.copy(colA.set(pa.color).lerp(colB.set(pb.color), t));
}

/** The rig itself — mounted once at Stage level, never culled. */
export function StageRig() {
  const quality = useQuality();
  const key = useRef<ThreeSpotLight>(null);
  const keyTgt = useRef<Object3D>(null);
  const spot2 = useRef<ThreeSpotLight>(null);
  const spot2Tgt = useRef<Object3D>(null);
  const points = useRef<(ThreePointLight | null)[]>([]);
  // the cone's LOOK (opacity) comes from the dominant set and snaps at the
  // transit midpoint, where the fog has both sets fully hidden; everything
  // that lights geometry (position/intensity/color/angle) blends per frame
  const [coneOpacity, setConeOpacity] = useState(0);
  const dominantX = useRef<number | null>(null);
  useEffect(() => {
    if (key.current && keyTgt.current) key.current.target = keyTgt.current;
    if (spot2.current && spot2Tgt.current) spot2.current.target = spot2Tgt.current;
  }, [quality, coneOpacity]);
  useFrame(({ camera }) => {
    if (!rigRegistry.length) return;
    const cx = camera.position.x;
    let A = rigRegistry[0];
    let B: { x: number; spec: RigSpec } | undefined;
    for (const r of rigRegistry) {
      if (Math.abs(cx - r.x) < Math.abs(cx - A.x)) A = r;
    }
    for (const r of rigRegistry) {
      if (r === A) continue;
      if (!B || Math.abs(cx - r.x) < Math.abs(cx - B.x)) B = r;
    }
    // 0 parked on A → 0.5 at the transit midpoint (never crosses 0.5: the
    // nearest set flips at the midpoint, so t folds back down on the far side)
    const t = B ? Math.min(Math.abs(cx - A.x) / Math.abs(B.x - A.x), 1) : 0;
    if (dominantX.current !== A.x) {
      dominantX.current = A.x;
      setConeOpacity(A.spec.key.volumetric ?? 0);
    }
    blendSpot(key.current, keyTgt.current, A.x, A.spec.key, B?.x ?? 0, B?.spec.key, t);
    blendSpot(spot2.current, spot2Tgt.current, A.x, A.spec.spot2, B?.x ?? 0, B?.spec.spot2, t);
    for (let i = 0; i < POINT_SLOTS; i++) {
      blendPoint(points.current[i] ?? null, A.x, A.spec.points[i], B?.x ?? 0, B?.spec.points[i], t);
    }
  });
  const shared = { penumbra: 0.85, distance: 26, decay: 1.6, intensity: 0 } as const;
  return (
    <>
      {quality === 'full' ? (
        <VolumetricSpot
          ref={key}
          {...shared}
          castShadow
          shadow-mapSize={[512, 512]}
          shadow-bias={-0.0004}
          shadow-normalBias={0.02}
          // the visible beam: soft-edged cone fading out well before the floor
          opacity={coneOpacity}
          attenuation={10.9}
          anglePower={4.5}
          radiusTop={0.35}
        />
      ) : (
        <spotLight ref={key} {...shared} />
      )}
      <object3D ref={keyTgt} />
      <spotLight ref={spot2} penumbra={0.9} distance={26} decay={1.6} intensity={0} />
      <object3D ref={spot2Tgt} />
      {Array.from({ length: POINT_SLOTS }, (_, i) => (
        <pointLight key={i} ref={(el) => (points.current[i] = el)} intensity={0} />
      ))}
    </>
  );
}

/** Dust motes drifting through a set's air — sells the volumetric beams. */
export function Dust({
  position = [0, 1.6, 0.6] as [number, number, number],
  scale = [6, 3.4, 4] as [number, number, number],
  count = 70,
  color = '#ffe9cf',
  size = 1.5,
  opacity = 0.2,
}: {
  position?: [number, number, number];
  scale?: [number, number, number];
  count?: number;
  color?: string;
  size?: number;
  opacity?: number;
}) {
  const quality = useQuality();
  if (quality === 'lite') return null;
  return <Sparkles position={position} scale={scale} count={count} color={color} size={size} speed={0.16} opacity={opacity} noise={0.8} />;
}

/**
 * Procedural brushed-metal roughness/bump map: fine directional streaks, like
 * a machined panel. Mid-grey base so material.roughness stays the master dial.
 */
export function makeBrushedMap(repeat = 2): CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = 256;
  cv.height = 256;
  const g = cv.getContext('2d')!;
  g.fillStyle = '#8a8a8a';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) {
    const y = Math.random() * 256;
    const len = 30 + Math.random() * 200;
    const x = Math.random() * 256 - len / 2;
    const v = 110 + Math.floor(Math.random() * 70);
    g.strokeStyle = `rgba(${v},${v},${v},${(0.2 + Math.random() * 0.5).toFixed(2)})`;
    g.lineWidth = 0.6 + Math.random() * 0.9;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + len, y + (Math.random() - 0.5) * 1.5);
    g.stroke();
  }
  const tex = new CanvasTexture(cv);
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  return tex;
}

/** Soft radial glow sprite texture for light halos and pooled glows. */
export function makeRadialGlow(color: string): CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = 256;
  cv.height = 256;
  const g = cv.getContext('2d')!;
  const grad = g.createRadialGradient(128, 128, 6, 128, 128, 128);
  grad.addColorStop(0, color);
  grad.addColorStop(0.35, color.length === 7 ? color + '66' : color);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const tex = new CanvasTexture(cv);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

/** Additive glow plane — a halo behind a sign, a pool under a gem. */
export function GlowPlane({
  color,
  position,
  rotation = [0, 0, 0] as [number, number, number],
  size = 2,
  opacity = 0.5,
}: {
  color: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  size?: number;
  opacity?: number;
}) {
  const tex = useRefTexture(color);
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial map={tex} transparent opacity={opacity} depthWrite={false} blending={AdditiveBlending} />
    </mesh>
  );
}

// one glow texture per colour, shared across every GlowPlane using it
const glowCache = new Map<string, CanvasTexture>();
function useRefTexture(color: string): CanvasTexture {
  let tex = glowCache.get(color);
  if (!tex) {
    tex = makeRadialGlow(color);
    glowCache.set(color, tex);
  }
  return tex;
}
