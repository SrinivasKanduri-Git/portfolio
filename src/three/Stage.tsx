import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { AdaptiveDpr, Environment, Lightformer } from '@react-three/drei';
import { PCFSoftShadowMap, WebGLRenderTarget, type Mesh, type Object3D, type Texture } from 'three';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import { BlendFunction, type EffectComposer as PPEffectComposer } from 'postprocessing';
import { type ReactNode, type RefObject, useEffect, useRef, useState } from 'react';
import { QualityCtx, setCullRegistry, StageRig, type Quality } from './cinema';
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
 * Compile every shader the show can ever need up front instead of letting
 * three compile mid-scroll. compileAsync uses KHR_parallel_shader_compile for
 * the *linking*, but its program set-up is synchronous main-thread work — so
 * this runs in two stages:
 *
 * 1. All-visible pass + texture upload, behind the curtain hold (unchanged
 *    from the original warm-up). The intro does NOT wait for anything beyond
 *    this — gating it on the full sweep held the curtain for seconds on
 *    Mesa/iGPU machines.
 * 2. A visibility-permutation sweep, spread out with generous yields so any
 *    frames running alongside it stay smooth. three bakes the *visible light
 *    counts* into every program, and SetGroup culling changes those counts as
 *    the dolly travels — without this sweep, the first ride re-linked the
 *    whole visible scene's programs at every cull boundary (measured:
 *    100ms–2.3s hitches). Each permutation is applied, compiled with the SYNC
 *    gl.compile (program creation is synchronous either way — KHR parallel
 *    linking continues on driver threads), and the real visibility restored
 *    all inside one synchronous block, so no frame ever renders a wrong
 *    visibility state. Duplicate states are skipped, near-the-camera states
 *    run first.
 */
function WarmUp({ lite }: { lite: boolean }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    let disposed = false;
    // The full tier never renders to the default framebuffer — every frame
    // goes through the EffectComposer's buffers. three keys programs on the
    // output colour space, and that's `outputColorSpace` (srgb) with no render
    // target bound but `workingColorSpace` (linear) with one. Compiling with
    // nothing bound therefore warms the WRONG variant of every program, and
    // the real ones all compile mid-ride at each cull boundary (measured:
    // 199 programs / ~26s of link waits during one scroll-through). Binding a
    // throwaway target during the compile calls makes the warm-up produce the
    // exact programs the composer path will ask for.
    const rt = lite ? null : new WebGLRenderTarget(1, 1);
    const compileAsComposer = <T,>(fn: () => T): T => {
      if (!rt) return fn(); // lite renders straight to screen — srgb is right
      gl.setRenderTarget(rt);
      try {
        return fn();
      } finally {
        gl.setRenderTarget(null);
      }
    };
    // compile() only walks traverseVisible, so design-hidden objects inside a
    // set would never precompile. Remember them and flash them visible inside
    // each mask's synchronous compile block.
    const hidden: Object3D[] = [];
    scene.traverse((o) => {
      if (!o.visible) hidden.push(o);
    });
    const showHidden = (on: boolean) => {
      for (const o of hidden) o.visible = on;
    };
    const uploadTextures = () => {
      // force-upload every texture while the curtain still covers the
      // stage — without this each set's canvas textures upload the first
      // time it scrolls into view, a visible mid-scroll hitch
      scene.traverse((obj) => {
        const mesh = obj as Mesh;
        if (!mesh.isMesh) return;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const m of mats) {
          if (!m) continue;
          for (const key of Object.keys(m)) {
            const v = (m as unknown as Record<string, unknown>)[key] as Texture | null;
            if (v && v.isTexture) gl.initTexture(v);
          }
        }
      });
    };
    const applyRealCulling = () => {
      // the state the per-frame culls would produce for the camera right now
      for (const r of setCullRegistry) {
        if (r.group.current) r.group.current.visible = Math.abs(camera.position.x - r.x) < r.radius;
      }
    };
    // Give the driver threads room to finish linking a batch. This is a blind
    // wait on purpose: EVERY link-status query — even COMPLETION_STATUS_KHR,
    // which the spec promises is non-blocking — stalls 2–4s per batch on
    // ANGLE-over-Mesa, so the only way to stay off the main thread is to never
    // ask.
    const linksSettled = (ms: number) => new Promise((res) => setTimeout(res, ms));
    const warm = async () => {
      // The StageRig keeps the visible light census constant, so every
      // material has exactly ONE program — one all-visible compile behind the
      // curtain covers the whole show. The first frames (pre-ReadySignal,
      // curtain down) absorb the link wait for the opening shot; nothing ever
      // compiles at scroll time. (Compiling with all sets visible is safe
      // now for the same reason: visibility no longer changes any program.)
      showHidden(true);
      const prevCull = setCullRegistry.map((r) => r.group.current?.visible ?? true);
      for (const r of setCullRegistry) {
        if (r.group.current) r.group.current.visible = true;
      }
      try {
        compileAsComposer(() => gl.compile(scene, camera));
      } catch {
        /* fall back to compile-on-first-render */
      }
      showHidden(false);
      setCullRegistry.forEach((r, i) => {
        if (r.group.current) r.group.current.visible = prevCull[i];
      });
      applyRealCulling();
      // textures up while the curtain still covers the stage — without this
      // each set's canvas textures upload on first sight, a mid-scroll hitch
      uploadTextures();
      await linksSettled(2500);
      // Shadow-map DEPTH programs are only ever created by a real render —
      // compile() never touches them. Render each set once to the throwaway
      // target, nearest first; each render's small link wait lands here, off
      // the ride.
      const order = [...setCullRegistry].sort(
        (a, b) => Math.abs(camera.position.x - a.x) - Math.abs(camera.position.x - b.x),
      );
      for (const target of order) {
        if (disposed || !rt) return;
        for (const r of setCullRegistry) {
          if (r.group.current) r.group.current.visible = r === target;
        }
        gl.setRenderTarget(rt);
        try {
          gl.render(scene, camera);
        } catch {
          /* depth programs fall back to compile-on-first-shadow-render */
        } finally {
          gl.setRenderTarget(null);
        }
        applyRealCulling();
        await linksSettled(400);
      }
    };
    warm()
      .catch(() => undefined)
      .finally(() => {
        applyRealCulling();
        rt?.dispose();
      });
    return () => {
      disposed = true;
    };
  }, [gl, scene, camera, lite]);
  return null;
}

/**
 * Announce that the stage has real frames on screen. The curtain intro waits
 * for this before starting its choreography: the Scene3D module eval and the
 * first render's texture uploads are 200–350ms main-thread stalls, and any
 * animation running through them visibly stutters. Fired on the third frame so
 * the first-frame upload spike is already behind us.
 */
function ReadySignal() {
  const frames = useRef(0);
  useFrame(() => {
    if (frames.current < 3 && ++frames.current === 3) {
      window.dispatchEvent(new Event('stage-first-frame'));
    }
  });
  return null;
}

/**
 * Keep the EffectComposer's buffers sized to the *drawing buffer*, not just
 * the CSS size. The r3f wrapper only calls composer.setSize on layout size
 * changes, so AdaptiveDpr's scroll-time DPR regression never reached the
 * composer — its passes kept rendering every pixel of the full-res buffers,
 * which is where the full tier's frame budget actually goes (measured: scene
 * draws are neither fill- nor draw-call-bound; the composer chain is the fixed
 * cost). With this sync, regressed scrolling really does shed ~60% of the
 * post-processing raster work.
 */
function ComposerDprSync({ composer }: { composer: RefObject<PPEffectComposer | null> }) {
  const lastDpr = useRef(0);
  useFrame(({ gl, size }) => {
    const dpr = gl.getPixelRatio();
    if (dpr !== lastDpr.current) {
      lastDpr.current = dpr;
      // CSS size is unchanged, so this only re-derives every pass's buffer
      // size from the current (dpr-scaled) drawing buffer
      composer.current?.setSize(size.width, size.height);
    }
  });
  return null;
}

/**
 * While the page is actually scrolling, flag the r3f performance system so
 * AdaptiveDpr eases the render resolution down (never below `performance.min`
 * of the full DPR); ~200ms after the last scroll event it eases back up.
 * Motion hides the softening — parked frames always render at full res.
 */
function RegressOnScroll() {
  const regress = useThree((s) => s.performance.regress);
  useEffect(() => {
    window.addEventListener('scroll', regress, { passive: true });
    return () => window.removeEventListener('scroll', regress);
  }, [regress]);
  return null;
}

/**
 * The stage floor — one continuous slab of polished black under every set.
 * Full tier is a glossy clearcoat slab picking up the studio environment
 * (soft light-panel sheen) rather than a true planar reflector: the reflector
 * re-rendered the entire scene into an off-screen target every frame — the
 * single biggest cost in the pipeline — and on integrated GPUs it was the
 * difference between ~30 and 60fps. Lite keeps the plain satin slab.
 */
function StageFloor({ lite }: { lite: boolean }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[120, 44]} />
      {lite ? (
        <meshStandardMaterial color="#0b0b11" roughness={0.7} metalness={0.3} />
      ) : (
        <meshPhysicalMaterial
          color="#0b0d14"
          roughness={0.34}
          metalness={0.72}
          clearcoat={0.7}
          clearcoatRoughness={0.32}
          envMapIntensity={0.9}
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
  const composer = useRef<PPEffectComposer>(null);
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
      <Canvas
        frameloop={frameloop}
        shadows={!lite}
        // DPR capped at 1.5 (was 2): fill-rate cost is quadratic in DPR and it
        // was the ceiling on high-refresh displays — 1.5 + 4x MSAA still reads
        // crisp while freeing ~44% of the raster budget for 90/120Hz scrolling
        dpr={[1, 1.5]}
        // floor for AdaptiveDpr's scroll-time regression: motion hides the
        // softening, parked frames always return to full res. Held at 0.8 (was
        // 0.6): 0.6 shed enough resolution mid-scroll that the dioramas read as
        // pixelated — 0.8 keeps edges crisp while still trimming raster load
        performance={{ min: 0.8 }}
        camera={{ position: [6, 1.5, 12], fov: 42 }}
        // full tier draws through the EffectComposer, which does its own MSAA —
        // a multisampled default framebuffer there is pure wasted memory/fill
        gl={{ antialias: lite, powerPreference: 'high-performance' }}
        onCreated={(state) => {
          const { gl } = state;
          gl.toneMappingExposure = 0.95; // under neutral — subtle, professional
          gl.shadowMap.type = PCFSoftShadowMap;
          // the default first-use diagnostics call getProgramInfoLog, which
          // blocks the main thread until the driver finishes linking — up to
          // seconds per cull boundary on Mesa. That sync wait is the whole
          // point of KHR_parallel_shader_compile to avoid, so it's off in dev
          // too (dev was measured 3.7s-freeze-worse with it on). Re-enable
          // per-session with ?shaderdebug=1 when actually debugging a shader.
          gl.debug.checkShaderErrors = new URLSearchParams(location.search).has('shaderdebug');
          if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__three = state;
        }}
      >
        <color attach="background" args={['#0a0a0f']} />
        <fog attach="fog" args={['#0a0a0f', 6.8, 11.5]} />
        <ambientLight intensity={lite ? 0.14 : 0.07} />
        <StudioEnv />

        <StageFloor lite={lite} />
        <QualityCtx.Provider value={quality}>
          {/* the one light rig — all set lighting, never culled (see cinema.tsx) */}
          <StageRig />
          {children}
        </QualityCtx.Provider>

        <Rig />
        <WarmUp lite={lite} />
        <ReadySignal />
        <RegressOnScroll />
        {/* AdaptiveDpr without `pixelated`: if it ever needs to drop resolution
            under load it does so with a smooth filter, never a blocky
            nearest-neighbour rescale — so the sign never looks pixelated */}
        <AdaptiveDpr />
        {!lite && <ComposerDprSync composer={composer} />}
        {!lite && (
          <EffectComposer ref={composer} multisampling={4}>
            {/* 4x MSAA for clean edges (SMAA was tried and reverted: its lookup
                textures add ~50KB gzip to the bundle). DepthOfField was cut
                deliberately — it blurred everything off the focus plane (read
                as "pixelated/soft") and was the priciest pass in the chain;
                the stage fog already carries the depth falloff. */}
            {/* gentle halo only — geometry must stay readable, never white out */}
            <Bloom intensity={0.24} luminanceThreshold={0.92} luminanceSmoothing={0.25} mipmapBlur height={256} />
            {/* fine film grain — kept subtle so it reads as cinema, not dirt */}
            <Noise premultiply blendFunction={BlendFunction.ADD} opacity={0.085} />
            <Vignette eskil={false} offset={0.22} darkness={0.92} />
          </EffectComposer>
        )}
      </Canvas>
    </div>
  );
}
