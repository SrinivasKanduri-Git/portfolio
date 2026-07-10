import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  ExtrudeGeometry,
  MeshPhysicalMaterial,
  PointLight,
  Shape,
  type Group,
} from 'three';
import { innerRingSegments, insetPoly, K_BODY, RING_OUTER, S_BOT, S_TOP, SK, type P2 } from '../../brand/skMark';
import { Dust, GlowPlane, KeyBeam, makeBrushedMap } from '../cinema';

// Three fabrication layers per stroke, like a real built sign:
//   casing — the dark metal channel the tube sits in (slightly outset, behind)
//   body   — the glass tube itself: glossy, coloured, softly emissive
//   core   — the white-hot gas line down the middle (inset, hard emissive)
const casingExtrude = { depth: 0.1, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 3, curveSegments: 160 } as const;
const bodyExtrude = { depth: 0.12, bevelEnabled: true, bevelThickness: 0.014, bevelSize: 0.011, bevelSegments: 6, curveSegments: 220 } as const;
const coreExtrude = { depth: 0.02, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.005, bevelSegments: 2, curveSegments: 160 } as const;

function poly(pts: P2[]): Shape {
  const sh = new Shape();
  sh.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) sh.lineTo(pts[i][0], pts[i][1]);
  sh.closePath();
  return sh;
}

function annulus(rOuter: number, rInner: number): Shape {
  const sh = new Shape();
  sh.absarc(0, 0, rOuter, 0, Math.PI * 2, false);
  const hole = new Shape();
  hole.absarc(0, 0, rInner, 0, Math.PI * 2, true);
  sh.holes.push(hole);
  return sh;
}

/**
 * Neon strike: real tubes don't fade in — they stutter, catch, then hold.
 * Deterministic flicker envelope: dark → three misfires → full, then steady.
 */
function strike(t: number): number {
  if (t > 1.7) return 1;
  if (t < 0.25) return 0;
  const flick =
    Math.max(0, Math.sin(t * 41) * Math.sin(t * 13 + 1.7)) * (t < 1.1 ? 1 : 0.25);
  const ramp = Math.min(1, Math.max(0, (t - 0.55) / 1.0));
  const base = ramp * ramp * (3 - 2 * ramp);
  return Math.min(1, base + flick * (1 - base) * 0.85);
}

/**
 * The hero — Srinivas's SK monogram as a fabricated neon marquee, hung from
 * steel cables over the stage: brushed gunmetal backing disc, dark channel
 * casings, glass tube bodies and a white-hot core line, extruded 1:1 from the
 * canonical measured geometry in brand/skMark.
 */
export function SKLogo({ position = [0, 0, 0] }: { position?: [number, number, number] }) {
  const grp = useRef<Group>(null);
  const spill = useRef<PointLight>(null);

  const { meshes, mats, brushed } = useMemo(() => {
    // matte neon: the tube is self-lit gas, not glossy plastic — no clearcoat,
    // no metal, no specular gloss; the light comes from the emissive body
    const tube = (color: string, emissive: string, intensity: number) =>
      new MeshPhysicalMaterial({
        color,
        emissive,
        emissiveIntensity: intensity,
        roughness: 0.55,
        metalness: 0,
      });
    // the inline is an *accent*: a pale tinted line riding the coloured tube,
    // not a white burn — the sign stays red/blue first
    const hot = (color: string, emissive: string) =>
      new MeshPhysicalMaterial({
        color,
        emissive,
        emissiveIntensity: 1.4,
        toneMapped: false,
        roughness: 0.3,
      });
    const mats = {
      casing: new MeshPhysicalMaterial({ color: '#101318', roughness: 0.4, metalness: 0.9 }),
      blue: tube('#0aa2ff', '#0090ff', 1.3),
      red: tube('#ff1236', '#ff0f30', 1.2),
      blueHot: hot('#9fdcff', SK.blueHot),
      redHot: hot('#ff858c', '#ffb9b2'),
    };
    type Mat = keyof typeof mats;
    const meshes: { geo: ExtrudeGeometry; mat: Mat; z: number }[] = [];
    const push = (shape: Shape, spec: typeof casingExtrude | typeof bodyExtrude | typeof coreExtrude, mat: Mat, z: number) =>
      meshes.push({ geo: new ExtrudeGeometry(shape, spec), mat, z });

    // every stroke gets its three layers; small unique z steps stop z-fighting
    const CORE = 0.04; // core inset — the accent stays a thin line, colour dominates
    const CASE = 0.022; // casing outset — a thin metal lip all round

    // outer ring
    push(annulus(RING_OUTER.rOut + CASE, RING_OUTER.rIn - CASE), casingExtrude, 'casing', -0.055);
    push(annulus(RING_OUTER.rOut, RING_OUTER.rIn), bodyExtrude, 'blue', 0);
    push(annulus(RING_OUTER.rOut - 0.012, RING_OUTER.rIn + 0.012), coreExtrude, 'blueHot', 0.125);
    // inner ring — filled segments, angular-cut where the letters cross it
    innerRingSegments().forEach((seg, i) => {
      push(poly(insetPoly(seg, -CASE)), casingExtrude, 'casing', -0.053 + i * 0.0004);
      push(poly(seg), bodyExtrude, 'blue', 0.002 + i * 0.0004);
      push(poly(insetPoly(seg, 0.019)), coreExtrude, 'blueHot', 0.126 + i * 0.0004);
    });
    // the K — miterFloor 0.6 keeps the arm-tip insets inside the stroke
    push(poly(insetPoly(K_BODY, -CASE, 0.6)), casingExtrude, 'casing', -0.051);
    push(poly(K_BODY), bodyExtrude, 'blue', 0.004);
    push(poly(insetPoly(K_BODY, CORE, 0.6)), coreExtrude, 'blueHot', 0.128);
    // the S — thin chevrons with dagger tips: a hard miter cap (0.85) stops the
    // core/casing offsets from crossing the opposite edge and folding the
    // polygon into a bowtie fill
    [S_TOP, S_BOT].forEach((s, i) => {
      push(poly(insetPoly(s, -CASE, 0.85)), casingExtrude, 'casing', -0.049 + i * 0.002);
      push(poly(s), bodyExtrude, 'red', 0.006 + i * 0.002);
      // 0.021 is the widest inset the dagger tips tolerate before the offset
      // crosses the opposite edge and folds the polygon into a filled bowtie
      push(poly(insetPoly(s, 0.021, 0.85)), coreExtrude, 'redHot', 0.13 + i * 0.002);
    });

    return { meshes, mats, brushed: makeBrushedMap(3) };
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    // rigid presentation: one slow ±2.3° turn — no bob, no tilt, no deformation
    if (grp.current) grp.current.rotation.y = Math.sin(t * 0.3) * 0.04;
    // neon strike, then a barely-there live shimmer
    const on = strike(t);
    mats.blue.emissiveIntensity = 1.3 * on * (1 + Math.sin(t * 1.4) * 0.04);
    mats.red.emissiveIntensity = 1.2 * on * (1 + Math.sin(t * 1.9 + 1) * 0.05);
    mats.blueHot.emissiveIntensity = 1.4 * on * (1 + Math.sin(t * 6.1) * 0.05);
    mats.redHot.emissiveIntensity = 1.4 * on * (1 + Math.sin(t * 6.7 + 2) * 0.06);
    // the sign's own light spilling onto the stage floor breathes with it
    if (spill.current) spill.current.intensity = 7 * on;
  });

  // the sign hangs clear of the floor: bottom of the backing disc sits at
  // SIGN_Y − 1.12·1.55 ≈ 0.06 — nothing sinks into the stage
  const SIGN_Y = 1.85;

  return (
    <group position={position}>
      {/* neon-first lighting: one dim warm key for shadows and dust, the rest
          of the light is the sign itself (spill + fill) — no gloss rig */}
      <KeyBeam position={[2.4, 5.6, 3.2]} target={[0, SIGN_Y, 0]} intensity={70} mapSize={1024} angle={0.42} volumetric={0.06} />
      <pointLight position={[2.6, 1.4, 2.2]} color="#9cc8ff" intensity={6} distance={10} />
      {/* the sign's own blue/red spill pooling on the stage floor */}
      <pointLight ref={spill} position={[0, 1.4, 1.3]} color="#7f9fff" intensity={7} distance={5.5} decay={1.8} />

      {/* dust hanging in the key beam */}
      <Dust position={[0.6, 2.5, 1]} scale={[5, 3.6, 3]} count={55} opacity={0.18} />

      {/* neon halo breathing behind the sign — faint, professional */}
      <GlowPlane color="#1240a0" position={[-0.2, 2.15, -0.55]} size={5.6} opacity={0.16} />
      <GlowPlane color="#7a0d1e" position={[-0.9, 1.35, -0.5]} size={3.4} opacity={0.12} />

      <group ref={grp} position={[0, SIGN_Y, 0]} scale={1.55}>
        {/* steel hanging cables + clamps — the sign is rigged, not floating */}
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.35, 0.945, 0]}>
            <mesh position={[0, 1.3, 0]}>
              <cylinderGeometry args={[0.0075, 0.0075, 2.6, 8]} />
              <meshStandardMaterial color="#3c4046" roughness={0.45} metalness={0.9} />
            </mesh>
            <mesh castShadow>
              <boxGeometry args={[0.05, 0.07, 0.14]} />
              <meshStandardMaterial color="#22262c" roughness={0.35} metalness={0.9} />
            </mesh>
          </group>
        ))}

        {/* brushed gunmetal backing disc + chrome rim + hex mounting bolts */}
        <mesh position={[0, 0, -0.115]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[1.1, 1.1, 0.05, 96]} />
          <meshPhysicalMaterial color="#171a20" roughness={0.55} roughnessMap={brushed} bumpMap={brushed} bumpScale={0.012} metalness={0.85} />
        </mesh>
        <mesh position={[0, 0, -0.09]}>
          <torusGeometry args={[1.1, 0.022, 16, 128]} />
          <meshPhysicalMaterial color="#2c3038" roughness={0.25} metalness={0.95} clearcoat={0.6} />
        </mesh>
        {[45, 135, 225, 315].map((a) => (
          <mesh key={a} position={[Math.cos((a * Math.PI) / 180) * 1.045, Math.sin((a * Math.PI) / 180) * 1.045, -0.082]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.028, 0.028, 0.02, 6]} />
            <meshPhysicalMaterial color="#454a52" roughness={0.3} metalness={0.95} />
          </mesh>
        ))}
        {/* matte black face plate keeps the interior pitch black like the PNG */}
        <mesh position={[0, 0, -0.088]}>
          <circleGeometry args={[1.06, 128]} />
          <meshStandardMaterial color={SK.ink} roughness={0.95} metalness={0} />
        </mesh>

        {/* the three fabrication layers of every stroke */}
        {meshes.map((m, i) => (
          <mesh key={i} geometry={m.geo} material={mats[m.mat]} position={[0, 0, m.z]} castShadow={m.mat === 'blue' || m.mat === 'red'} />
        ))}
      </group>
    </group>
  );
}
