import { Canvas } from '@react-three/fiber';
import { AdaptiveDpr, Environment, Lightformer } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, DepthOfField } from '@react-three/postprocessing';
import { useEffect, useRef, type ReactNode } from 'react';
import { Object3D, SpotLight } from 'three';
import { Rig } from './useScrollCamera';

export const KEY = '#ffcf9e'; // warm amber key light — carries the old cream DNA

/** A warm stage key light aimed at a set, with a soft penumbra + contact shadow. */
export function KeyBeam({
  position,
  target = [position[0], 0, 0],
  intensity = 120,
  color = KEY,
  mapSize = 1024,
  radius = 3,
}: {
  position: [number, number, number];
  target?: [number, number, number];
  intensity?: number;
  color?: string;
  mapSize?: number;
  radius?: number;
}) {
  const light = useRef<SpotLight>(null);
  const targetRef = useRef<Object3D>(null);
  useEffect(() => {
    if (light.current && targetRef.current) light.current.target = targetRef.current;
  }, []);
  return (
    <>
      <spotLight
        ref={light}
        position={position}
        angle={0.5}
        penumbra={0.9}
        distance={40}
        decay={1.6}
        intensity={intensity}
        color={color}
        castShadow
        shadow-mapSize={[mapSize, mapSize]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-radius={radius}
      />
      <object3D ref={targetRef} position={target} />
    </>
  );
}

/** The stage floor — dark, slightly reflective so the beam pools on it. */
function StageFloor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
      <planeGeometry args={[80, 40]} />
      <meshStandardMaterial color="#0c0c12" roughness={0.85} metalness={0.15} />
    </mesh>
  );
}

/**
 * Local studio environment — soft overhead panels + cool side wash, built from
 * Lightformers (no network HDRI). This is what makes clearcoat and chrome read
 * as real: the glossy surfaces finally have something to reflect.
 */
function StudioEnv() {
  return (
    <Environment resolution={256} frames={1}>
      <color attach="background" args={['#05050a']} />
      <Lightformer form="rect" intensity={2.2} color="#fff4e4" position={[0, 6, 4]} rotation={[-Math.PI / 2.6, 0, 0]} scale={[9, 3, 1]} />
      <Lightformer form="rect" intensity={1} color="#bcd4ff" position={[-6, 3, -2]} rotation={[0, Math.PI / 2.4, 0]} scale={[6, 2.4, 1]} />
      <Lightformer form="rect" intensity={0.8} color="#9fc0ff" position={[6, 2.5, -1]} rotation={[0, -Math.PI / 2.4, 0]} scale={[5, 2, 1]} />
      <Lightformer form="circle" intensity={1.4} color="#ffffff" position={[1.5, 5, 2.5]} scale={2.2} />
    </Environment>
  );
}

export function Stage({ children, quality = 'full' }: { children?: ReactNode; quality?: 'full' | 'lite' }) {
  const lite = quality === 'lite';
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
      <Canvas
        shadows={!lite}
        dpr={lite ? [1, 1.5] : [1, 1.75]}
        camera={{ position: [6, 1.5, 12], fov: 42 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#0a0a0f']} />
        <fog attach="fog" args={['#0a0a0f', 6.8, 11.5]} />
        <ambientLight intensity={lite ? 0.14 : 0.08} />
        <StudioEnv />

        <StageFloor />
        {children}

        <Rig />
        <AdaptiveDpr pixelated />
        {!lite && (
          <EffectComposer>
            {/* subjects sit ~6.3–8 units from the dolly — focus there, gentle falloff */}
            <DepthOfField worldFocusDistance={6.6} worldFocusRange={5} bokehScale={1.3} />
            {/* gentle halo only — geometry must stay readable, never white out */}
            <Bloom intensity={0.42} luminanceThreshold={0.88} luminanceSmoothing={0.2} mipmapBlur />
            <Vignette eskil={false} offset={0.22} darkness={0.9} />
          </EffectComposer>
        )}
      </Canvas>
    </div>
  );
}
