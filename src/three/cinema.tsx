import { createContext, useContext, useEffect, useRef } from 'react';
import { SpotLight as VolumetricSpot, Sparkles } from '@react-three/drei';
import {
  AdditiveBlending,
  CanvasTexture,
  Object3D,
  RepeatWrapping,
  SRGBColorSpace,
  type SpotLight as ThreeSpotLight,
} from 'three';

export type Quality = 'full' | 'lite';
export const QualityCtx = createContext<Quality>('full');
export const useQuality = () => useContext(QualityCtx);

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
 * A cinema key light: a real shadow-casting spot whose beam is *visible* — a
 * volumetric cone falling through the stage haze (full tier only; lite renders
 * the same light without the cone). One KeyBeam per set, always from high
 * stage-right, keeps the shadows across the whole reel coherent.
 */
export function KeyBeam({
  position,
  target = [position[0], 0, 0],
  intensity = 120,
  color = KEY,
  mapSize = 1024,
  angle = 0.5,
  distance = 26,
  volumetric = 0.08,
}: {
  position: [number, number, number];
  target?: [number, number, number];
  intensity?: number;
  color?: string;
  mapSize?: number;
  angle?: number;
  distance?: number;
  volumetric?: number;
}) {
  const quality = useQuality();
  const light = useRef<ThreeSpotLight>(null);
  const tgt = useRef<Object3D>(null);
  useEffect(() => {
    if (light.current && tgt.current) light.current.target = tgt.current;
  }, [quality]);
  const shared = {
    position,
    angle,
    penumbra: 0.85,
    distance,
    decay: 1.6,
    intensity,
    color,
  } as const;
  return (
    <>
      {quality === 'full' ? (
        <VolumetricSpot
          ref={light}
          {...shared}
          castShadow
          shadow-mapSize={[mapSize, mapSize]}
          shadow-bias={-0.0004}
          shadow-normalBias={0.02}
          // the visible beam: soft-edged cone fading out well before the floor
          opacity={volumetric}
          attenuation={Math.max(4, distance * 0.42)}
          anglePower={4.5}
          radiusTop={0.35}
        />
      ) : (
        <spotLight ref={light} {...shared} />
      )}
      <object3D ref={tgt} position={target} />
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
