import { Canvas } from '@react-three/fiber';
import { AdaptiveDpr, Environment, Lightformer, MeshReflectorMaterial } from '@react-three/drei';
import { PCFSoftShadowMap } from 'three';
import { EffectComposer, Bloom, Vignette, DepthOfField, Noise } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { type ReactNode } from 'react';
import { QualityCtx, type Quality } from './cinema';
import { Rig } from './useScrollCamera';

/**
 * The stage floor — one continuous slab of polished black under every set, so
 * the whole reel shares the same ground and the same reflections. Full tier
 * gets a real planar reflector (screens, neon and beams mirror in it); lite
 * keeps a plain satin slab.
 */
function StageFloor({ lite }: { lite: boolean }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[90, 44]} />
      {lite ? (
        <meshStandardMaterial color="#0b0b11" roughness={0.7} metalness={0.3} />
      ) : (
        <MeshReflectorMaterial
          color="#0b0d14"
          roughness={0.55}
          metalness={0.45}
          resolution={1024}
          mirror={0.24}
          mixBlur={9}
          mixStrength={1.1}
          blur={[380, 120]}
          depthScale={0.9}
          minDepthThreshold={0.5}
          maxDepthThreshold={1.6}
        />
      )}
    </mesh>
  );
}

/**
 * Local studio environment — soft overhead panels + cool side wash, built from
 * Lightformers (no network HDRI). This is what makes clearcoat, chrome and the
 * gem read as real: glossy surfaces finally have something to reflect.
 */
function StudioEnv() {
  return (
    <Environment resolution={256} frames={1}>
      <color attach="background" args={['#05050a']} />
      {/* warm overhead softbox — matches the tungsten keys */}
      <Lightformer form="rect" intensity={1.7} color="#ffeedd" position={[0, 6, 4]} rotation={[-Math.PI / 2.6, 0, 0]} scale={[9, 3, 1]} />
      {/* cool side washes — match the fill/rim plan */}
      <Lightformer form="rect" intensity={1} color="#bcd4ff" position={[-6, 3, -2]} rotation={[0, Math.PI / 2.4, 0]} scale={[6, 2.4, 1]} />
      <Lightformer form="rect" intensity={0.8} color="#9fc0ff" position={[6, 2.5, -1]} rotation={[0, -Math.PI / 2.4, 0]} scale={[5, 2, 1]} />
      <Lightformer form="circle" intensity={1} color="#ffffff" position={[1.5, 5, 2.5]} scale={2.2} />
      {/* faint floor bounce so undersides never go dead black */}
      <Lightformer form="rect" intensity={0.35} color="#26314a" position={[0, -2, 2]} rotation={[Math.PI / 2.4, 0, 0]} scale={[10, 4, 1]} />
    </Environment>
  );
}

export function Stage({ children, quality = 'full' }: { children?: ReactNode; quality?: Quality }) {
  const lite = quality === 'lite';
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
      <Canvas
        shadows={!lite}
        dpr={lite ? [1, 1.5] : [1, 1.75]}
        camera={{ position: [6, 1.5, 12], fov: 42 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.toneMappingExposure = 0.95; // under neutral — subtle, professional
          gl.shadowMap.type = PCFSoftShadowMap;
        }}
      >
        <color attach="background" args={['#0a0a0f']} />
        <fog attach="fog" args={['#0a0a0f', 6.8, 11.5]} />
        <ambientLight intensity={lite ? 0.14 : 0.07} />
        <StudioEnv />

        <StageFloor lite={lite} />
        <QualityCtx.Provider value={quality}>{children}</QualityCtx.Provider>

        <Rig />
        <AdaptiveDpr pixelated />
        {!lite && (
          <EffectComposer>
            {/* subjects sit ~5.2–8 units from the dolly — focus there, gentle falloff */}
            <DepthOfField worldFocusDistance={6.4} worldFocusRange={6} bokehScale={1.35} />
            {/* gentle halo only — geometry must stay readable, never white out */}
            <Bloom intensity={0.24} luminanceThreshold={0.92} luminanceSmoothing={0.25} mipmapBlur />
            {/* fine film grain — the cheapest honest cinema signal */}
            <Noise premultiply blendFunction={BlendFunction.ADD} opacity={0.22} />
            <Vignette eskil={false} offset={0.22} darkness={0.92} />
          </EffectComposer>
        )}
      </Canvas>
    </div>
  );
}
