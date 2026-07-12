import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { ContactShadows, MeshTransmissionMaterial } from '@react-three/drei';
import {
  AdditiveBlending,
  CanvasTexture,
  LatheGeometry,
  RepeatWrapping,
  SRGBColorSpace,
  Texture,
  Vector2,
  type Group,
  type Mesh,
  type MeshStandardMaterial,
} from 'three';
import { Dust, GlowPlane, makeBrushedMap, useQuality, useSetActive, useSetLights } from '../cinema';

// handing this to MeshTransmissionMaterial's `buffer` prop while the set is
// culled makes drei skip its two full-scene FBO renders per frame (it only
// renders when the buffer is its own internal FBO) — without a material swap,
// so no mid-scroll shader recompile when the set comes back
const idleBuffer = new Texture();

const RUBY = '#e0113a';
const COPPER = '#a8622e';
const COPPER_DARK = '#7d4520';

/** the classic diamond icon in profile: wide flat table, SHALLOW crown (the
 *  crown must stay squat or the silhouette reads as a rhombus), straight
 *  girdle band, deep pavilion tapering to the culet */
function gemGeometry(): LatheGeometry {
  const profile = [
    new Vector2(0.001, 0.145), // table centre
    new Vector2(0.44, 0.145), // table edge — wide and flat
    new Vector2(0.56, 0.075), // crown break facet — a second bevel row so the
    new Vector2(0.62, 0.02), //  crown catches light in two steps, not one slope
    new Vector2(0.62, -0.05), // girdle bottom
    new Vector2(0.34, -0.34), // pavilion main — mid break so the bottom facets
    new Vector2(0.001, -0.6), //  don't read as one smooth cone
  ];
  // 16 radial facets: a true round brilliant, not a chunky octagon
  return new LatheGeometry(profile, 16);
}

/** red caustic mat — concentric ripples + crosshair, burned into one texture */
function makeCausticTexture(): CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = 512;
  cv.height = 512;
  const g = cv.getContext('2d')!;
  g.clearRect(0, 0, 512, 512);
  const c = 256;
  // rippled rings, brighter toward the centre — light focused through the gem
  for (let r = 30; r < 250; r += 14) {
    const a = Math.max(0, 0.55 - r / 320) * (0.7 + 0.3 * Math.sin(r * 0.8));
    g.strokeStyle = `rgba(255,40,60,${a.toFixed(3)})`;
    g.lineWidth = 2 + Math.sin(r * 0.5) * 1.2;
    g.beginPath();
    for (let i = 0; i <= 96; i++) {
      const th = (i / 96) * Math.PI * 2;
      const rr = r + Math.sin(th * 6 + r * 0.35) * 3.5;
      const x = c + Math.cos(th) * rr;
      const y = c + Math.sin(th) * rr;
      i === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
    }
    g.closePath();
    g.stroke();
  }
  // hot core
  const core = g.createRadialGradient(c, c, 0, c, c, 70);
  core.addColorStop(0, 'rgba(255,120,120,0.85)');
  core.addColorStop(1, 'rgba(255,30,50,0)');
  g.fillStyle = core;
  g.fillRect(0, 0, 512, 512);
  // crosshair ticks
  g.strokeStyle = 'rgba(255,70,80,0.5)';
  g.lineWidth = 3;
  [0, Math.PI / 2, Math.PI, Math.PI * 1.5].forEach((a) => {
    g.beginPath();
    g.moveTo(c + Math.cos(a) * 190, c + Math.sin(a) * 190);
    g.lineTo(c + Math.cos(a) * 240, c + Math.sin(a) * 240);
    g.stroke();
  });
  const tex = new CanvasTexture(cv);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

/** faint blue-grey bench grid, replacing the old wireframe gridHelper */
function makeBenchGrid(): CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = 512;
  cv.height = 512;
  const g = cv.getContext('2d')!;
  g.clearRect(0, 0, 512, 512);
  g.strokeStyle = 'rgba(90,105,140,0.5)';
  g.lineWidth = 1;
  for (let i = 0; i <= 16; i++) {
    const p = (i / 16) * 512;
    g.beginPath();
    g.moveTo(p, 0);
    g.lineTo(p, 512);
    g.stroke();
    g.beginPath();
    g.moveTo(0, p);
    g.lineTo(512, p);
    g.stroke();
  }
  const tex = new CanvasTexture(cv);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

/** knurl bump map for the grip collar — fine crosshatch */
function makeKnurlMap(): CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = 128;
  cv.height = 128;
  const g = cv.getContext('2d')!;
  g.fillStyle = '#808080';
  g.fillRect(0, 0, 128, 128);
  g.strokeStyle = '#b8b8b8';
  g.lineWidth = 2;
  for (let i = -128; i < 256; i += 8) {
    g.beginPath();
    g.moveTo(i, 0);
    g.lineTo(i + 128, 128);
    g.stroke();
    g.beginPath();
    g.moveTo(i + 128, 0);
    g.lineTo(i, 128);
    g.stroke();
  }
  const tex = new CanvasTexture(cv);
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.repeat.set(6, 1);
  return tex;
}

/**
 * SC.02 — RubySkope, shot like a jeweller's macro plate: a machined copper
 * loupe hovers between camera and stone, its real glass bending the scene
 * behind it, while the brilliant-cut Ruby — a true refractive gem with an
 * ember heart — turns over a red caustic mat.
 */
export function BugScope({ position = [-2, 0, 0] }: { position?: [number, number, number] }) {
  const quality = useQuality();
  // warm volumetric key high stage-right, cool fill, red practical — on the
  // shared stage rig
  useSetLights(position[0], () => ({
    key: { position: [2.6, 5.8, 3.4], target: [0, 0.8, 0], intensity: 68, angle: 0.42, volumetric: 0.06 },
    points: [
      { position: [-1.6, 2.2, 2.6], color: '#9db8e8', intensity: 8, distance: 11 },
      // the ruby's own red glow — behind the gem so it can't torch the copper rim
      { position: [-0.3, 1.44, -0.9], color: RUBY, intensity: 1.1, distance: 3.4, decay: 2 },
    ],
  }));
  const full = quality === 'full';
  const active = useSetActive();
  const scope = useRef<Group>(null);
  const ruby = useRef<Group>(null);
  const reticle = useRef<MeshStandardMaterial>(null);
  const caustic = useRef<Mesh>(null);

  const gemGeo = useMemo(gemGeometry, []);
  const causticTex = useMemo(makeCausticTexture, []);
  const benchTex = useMemo(makeBenchGrid, []);
  const knurlTex = useMemo(makeKnurlMap, []);
  const brushed = useMemo(() => makeBrushedMap(4), []);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    if (scope.current) {
      // stays parked over the stone (gem centre x = -0.3) with only a gentle
      // examining drift, so the ruby always reads magnified inside the lens.
      // y sits high enough that the long handle hangs clear of the stage floor
      // glass stays locked on the gem's centre — only a whisper of drift so it
      // reads as a held examination, never sliding off the stone
      scope.current.position.x = -0.3 + Math.sin(t * 0.4) * 0.05;
      scope.current.position.y = 1.46 + Math.sin(t * 0.9) * 0.03;
      scope.current.rotation.z = Math.sin(t * 0.5) * 0.03;
      scope.current.rotation.x = -0.12 + Math.sin(t * 0.7) * 0.02;
    }
    if (ruby.current) {
      ruby.current.rotation.y += dt * 0.55;
      // the gem levitates above its caustic pool — glass rides at the same height
      ruby.current.position.y = 1.44 + Math.sin(t * 1.2) * 0.04;
    }
    if (reticle.current) reticle.current.emissiveIntensity = 1 + Math.sin(t * 4) * 0.3;
    if (caustic.current) caustic.current.rotation.z = t * 0.06;
  });

  const copperProps = {
    color: COPPER,
    roughness: 0.34,
    roughnessMap: brushed,
    metalness: 1,
    clearcoat: 0.5,
    clearcoatRoughness: 0.25,
  } as const;

  return (
    <group position={position}>
      {/* faint dust catching the key beam — no motes on the stone itself */}
      <Dust position={[0.4, 2.1, 0.8]} scale={[5, 3, 3.5]} count={32} size={1.1} opacity={0.1} />

      {/* jeweller's bench grid — faint, printed on the shared stage floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.018, 0]}>
        <planeGeometry args={[7, 5]} />
        <meshBasicMaterial map={benchTex} transparent opacity={0.28} depthWrite={false} />
      </mesh>
      <ContactShadows position={[0, 0.02, 0]} scale={5} far={1.8} blur={2.4} opacity={0.5} frames={1} />

      {/* ── THE RUBY — one faceted lathe, real transmission on full tier;
          seated left of centre so the loupe never hides it ── */}
      <group ref={ruby} position={[-0.3, 1.44, 0]} scale={0.85}>
        <mesh geometry={gemGeo} castShadow>
          {full ? (
            <MeshTransmissionMaterial
              buffer={active ? undefined : idleBuffer}
              color={RUBY}
              transmission={1}
              thickness={1.0}
              roughness={0.14}
              ior={1.77}
              chromaticAberration={0.1}
              anisotropicBlur={0.5}
              attenuationColor="#ff2038"
              attenuationDistance={1.3}
              resolution={512}
              samples={8}
              flatShading
              clearcoat={0.35}
              clearcoatRoughness={0.4}
              emissive="#8a0a1c"
              emissiveIntensity={0.55}
            />
          ) : (
            <meshPhysicalMaterial color="#c81030" emissive="#b00d26" emissiveIntensity={0.9} roughness={0.06} metalness={0.15} clearcoat={1} clearcoatRoughness={0.05} flatShading />
          )}
        </mesh>
      </group>

      {/* red light pooled beneath the gem + focused caustic mat */}
      <GlowPlane color="#8f0a1c" position={[-0.3, 0.028, 0]} rotation={[-Math.PI / 2, 0, 0]} size={2.6} opacity={0.3} />
      <mesh ref={caustic} rotation={[-Math.PI / 2, 0, 0]} position={[-0.3, 0.034, 0]}>
        <planeGeometry args={[2.4, 2.4]} />
        <meshBasicMaterial map={causticTex} transparent opacity={0.5} depthWrite={false} blending={AdditiveBlending} />
      </mesh>
      {/* pulsing targeting reticle */}
      <mesh position={[-0.3, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.78, 0.82, 64]} />
        <meshStandardMaterial ref={reticle} color="#ff2d2d" emissive="#ff2d2d" emissiveIntensity={1.3} toneMapped={false} transparent opacity={0.8} />
      </mesh>

      {/* ── THE COPPER LOUPE — machined rim, knurled collar, real glass ── */}
      <group ref={scope} position={[-0.3, 1.46, 0.75]} rotation={[-0.12, 0, 0]}>
        {/* main rim — stepped machined bezel (front lip, barrel, back lip) */}
        <mesh castShadow>
          <torusGeometry args={[0.72, 0.085, 32, 128]} />
          <meshPhysicalMaterial {...copperProps} />
        </mesh>
        {[0.055, -0.055].map((z) => (
          <mesh key={z} position={[0, 0, z]}>
            <torusGeometry args={[0.755, 0.018, 12, 128]} />
            <meshPhysicalMaterial color={COPPER_DARK} roughness={0.28} metalness={1} clearcoat={0.4} />
          </mesh>
        ))}
        {/* inner lip holding the glass */}
        <mesh>
          <torusGeometry args={[0.63, 0.03, 16, 96]} />
          <meshPhysicalMaterial color={COPPER_DARK} roughness={0.3} metalness={1} clearcoat={0.4} />
        </mesh>
        {/* tiny set-screws around the rim */}
        {[0.9, 2.5, 4.1, 5.7].map((a) => (
          <mesh key={a} position={[Math.cos(a) * 0.72, Math.sin(a) * 0.72, 0.088]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.016, 0.016, 0.014, 6]} />
            <meshPhysicalMaterial color="#5c3a1c" roughness={0.3} metalness={1} />
          </mesh>
        ))}
        {/* the lens — true refractive glass on full tier, ghost pane on lite */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.64, 0.64, 0.045, 64]} />
          {full ? (
            <MeshTransmissionMaterial
              transmission={1}
              thickness={0.35}
              roughness={0.02}
              ior={1.5}
              chromaticAberration={0.06}
              anisotropicBlur={0.1}
              resolution={768}
              samples={6}
              clearcoat={1}
            />
          ) : (
            <meshPhysicalMaterial color="#dceeff" roughness={0.03} metalness={0} transmission={0.9} transparent opacity={0.25} ior={1.1} thickness={0.02} />
          )}
        </mesh>
        {/* collar where the handle meets the rim — knurled grip */}
        <group position={[0.56, -0.56, 0]} rotation={[0, 0, Math.PI / 4]}>
          <mesh position={[0, 0.1, 0]}>
            <cylinderGeometry args={[0.1, 0.115, 0.16, 32]} />
            <meshPhysicalMaterial color={COPPER_DARK} roughness={0.4} bumpMap={knurlTex} bumpScale={0.35} metalness={1} />
          </mesh>
          {/* tapered copper handle with turned grooves */}
          <mesh position={[0, -0.42, 0]} castShadow>
            <cylinderGeometry args={[0.075, 0.1, 0.95, 32]} />
            <meshPhysicalMaterial {...copperProps} />
          </mesh>
          {[-0.14, -0.2, -0.66, -0.72].map((y) => (
            <mesh key={y} position={[0, y, 0]}>
              <torusGeometry args={[y > -0.4 ? 0.088 : 0.1, 0.006, 8, 48]} />
              <meshPhysicalMaterial color={COPPER_DARK} roughness={0.3} metalness={1} />
            </mesh>
          ))}
          {/* dark grip sleeve between the grooves */}
          <mesh position={[0, -0.43, 0]}>
            <cylinderGeometry args={[0.088, 0.097, 0.44, 32]} />
            <meshStandardMaterial color="#2e1c12" roughness={0.85} metalness={0.1} />
          </mesh>
          {/* rounded pommel */}
          <mesh position={[0, -0.92, 0]}>
            <sphereGeometry args={[0.105, 24, 24]} />
            <meshPhysicalMaterial {...copperProps} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
