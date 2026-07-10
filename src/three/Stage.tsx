import { Canvas } from '@react-three/fiber';
import { AdaptiveDpr, Environment, Lightformer, MeshReflectorMaterial } from '@react-three/drei';
import { PCFSoftShadowMap } from 'three';
import { EffectComposer, Bloom, Vignette, DepthOfField, Noise } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { type ReactNode, useEffect, useState } from 'react';
import { QualityCtx, type Quality } from './cinema';
import { Rig } from './useScrollCamera';

/**
 * Pause the render loop when the fixed WebGL canvas is fully covered by the
 * opaque flat content below `#cinematic-end` (credits, equipment, papers, …).
 * Below the cinematic zone the scene is invisible AND the camera can't move
 * (scroll progress is clamped to 1), so every rendered frame there is pure
 * waste — shadow maps, reflector, DoF and bloom for pixels nobody sees.
 * Returns 'always' while any cinematic content is on screen, 'never' otherwise.
 */
function useRenderVisible(): 'always' | 'never' {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const end = document.getElementById('cinematic-end');
    if (!end) return; // marker not mounted yet — stay always-on (safe default)
    const io = new IntersectionObserver(
      ([e]) => setVisible(e.isIntersecting || e.boundingClientRect.top > 0),
      { rootMargin: '240px 0px 0px 0px' }, // resume a touch before it re-enters
    );
    io.observe(end);
    return () => io.disconnect();
  }, []);
  return visible ? 'always' : 'never';
}

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
          // the planar reflector re-renders the scene into an off-screen target
          // every frame — 512 is half the memory/fill of 1024 and, this blurred,
          // visually indistinguishable in the pooled floor reflection
          resolution={512}
          mirror={0.24}
          mixBlur={6}
          mixStrength={1.1}
          blur={[256, 96]}
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
  const frameloop = useRenderVisible();
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
      <Canvas
        frameloop={frameloop}
        shadows={!lite}
        // keep full device resolution for crisp edges on retina/zoom — the
        // render-gate + smaller shadow maps + lighter reflector already bought
        // back the frame budget, so we don't need to soften pixels to stay fast
        dpr={lite ? [1, 1.75] : [1, 2]}
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
        {/* AdaptiveDpr without `pixelated`: if it ever needs to drop resolution
            under load it does so with a smooth filter, never a blocky
            nearest-neighbour rescale — so the sign never looks pixelated */}
        <AdaptiveDpr />
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
