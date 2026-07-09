import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { DirectionalLight, ExtrudeGeometry, MeshPhysicalMaterial, PointLight, Shape, type Group } from 'three';
import { innerRingArcs, K_BODY, RING_INNER, RING_OUTER, S_BOT, S_TOP, SK, type P2 } from '../../brand/skMark';

// the source render is glossy 3D, not a neon tube: bevelled bars whose edge
// highlights come from the lights. One bevel spec everywhere keeps it one build.
// a defined-but-not-fat bevel with a high segment count: the corners stay crisp
// (not blunt) while the many curve/bevel segments keep arcs and highlights smooth
// — that's the render quality, thin low-poly bevels look cheap.
const glossExtrude = {
  depth: 0.12,
  bevelEnabled: true,
  bevelThickness: 0.013,
  bevelSize: 0.01,
  bevelSegments: 6,
  curveSegments: 220,
} as const;

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

/** an annulus segment between two angles (degrees), for the cut inner ring */
function arcBand(rOuter: number, rInner: number, a0: number, a1: number): Shape {
  const sh = new Shape();
  const r0 = (a0 * Math.PI) / 180;
  const r1 = (a1 * Math.PI) / 180;
  sh.absarc(0, 0, rOuter, r0, r1, false);
  sh.absarc(0, 0, rInner, r1, r0, true);
  sh.closePath();
  return sh;
}

/**
 * The hero backdrop — Srinivas's SK monogram, extruded 1:1 from the canonical
 * measured geometry in brand/skMark (horns dropped by design). Glossy bevelled
 * bars like the source render: the inner circle is cut where the K stem, both
 * K arms and the S's bottom stroke pass through it.
 */
export function SKLogo({ position = [0, 0, 0] }: { position?: [number, number, number] }) {
  const grp = useRef<Group>(null);
  const key = useRef<DirectionalLight>(null);
  const sweep = useRef<PointLight>(null);

  const { meshes, mats } = useMemo(() => {
    const mk = (color: string, emissive: string, intensity: number) =>
      new MeshPhysicalMaterial({
        color,
        emissive,
        emissiveIntensity: intensity,
        // deep glossy clearcoat: a crisp specular sits on a slightly softer body,
        // so the travelling glint reads as a tight glimmer, not a flat plastic sheen
        roughness: 0.15,
        metalness: 0.3,
        clearcoat: 1,
        clearcoatRoughness: 0.1,
      });
    const mats = {
      blue: mk('#0aa2ff', '#0090ff', 0.95), // electric blue
      red: mk('#ff1236', '#ff0f30', 0.9), // neon red
    };
    type Mat = keyof typeof mats;
    const meshes: { geo: ExtrudeGeometry; mat: Mat; z: number }[] = [];
    const push = (shape: Shape, mat: Mat, z: number) => meshes.push({ geo: new ExtrudeGeometry(shape, glossExtrude), mat, z });

    // outer ring — continuous
    push(annulus(RING_OUTER.rOut, RING_OUTER.rIn), 'blue', 0);
    // inner ring — arcs between the letter cuts
    innerRingArcs().forEach(([a0, a1]) => push(arcBand(RING_INNER.rOut, RING_INNER.rIn, a0, a1), 'blue', 0.002));
    // the K, tips ending inside the cleared cuts
    push(poly(K_BODY), 'blue', 0.004);
    // the S — two chevron strokes
    push(poly(S_TOP), 'red', 0.006);
    push(poly(S_BOT), 'red', 0.008);

    return { meshes, mats };
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    // rigid presentation: one slow ±2.3° turn — no bob, no tilt, no deformation
    if (grp.current) grp.current.rotation.y = Math.sin(t * 0.3) * 0.04;
    // the key drifts in a slow, shallow orbit so the gloss highlights travel
    // gently across the bevels — the "light interaction" of a studio product shot
    if (key.current) key.current.position.set(-3 + Math.sin(t * 0.22) * 1.4, 4.5 + Math.cos(t * 0.22) * 0.7, 5);
    // smoothstep power-on ramp, then a barely-there live shimmer
    const s = Math.min(1, t / 1.4);
    const on = s * s * (3 - 2 * s);
    // the shifting light: once the sign is lit, a soft point light drifts
    // left→right across the face on a slow loop. pow³ envelope tightens it to a
    // narrow pass so it reads as a subtle glimmer sliding over the gloss, not a
    // floodlight washing the sign out — cinematic, restrained
    if (sweep.current) {
      const travel = (t * 0.1) % 1; // 0→1 loop, ~10s per pass
      const glint = Math.pow(Math.sin(travel * Math.PI), 3);
      sweep.current.position.set(-3.2 + travel * 6.4, 1.9, 2.3);
      sweep.current.intensity = on * (0.3 + glint * 3.2);
    }
    mats.blue.emissiveIntensity = 0.95 * on * (1 + Math.sin(t * 1.4) * 0.04);
    mats.red.emissiveIntensity = 0.9 * on * (1 + Math.sin(t * 1.9 + 1) * 0.05);
  });

  return (
    <group position={position}>
      {/* glossy-render lighting: cool directional key upper-left (paints the
          bevel highlights the source render has), soft fills right and below */}
      <directionalLight ref={key} position={[-3, 4.5, 5]} color="#eef6ff" intensity={2.8} />
      <pointLight position={[2.6, 1.2, 2.2]} color="#9cc8ff" intensity={14} distance={10} />
      <pointLight position={[0.4, -0.6, 2.4]} color="#ffe2dc" intensity={6} distance={8} />
      {/* the travelling "shifting light" glimmer that slides across the face —
          tight distance so it's a localised glint, not a wash */}
      <pointLight ref={sweep} position={[-3.2, 1.9, 2.3]} color="#eaf3ff" intensity={0} distance={6} decay={1.8} />

      <group ref={grp} position={[0, 1.42, 0]} scale={1.55}>
        {/* matte black backing disc — keeps the interior pitch black like the PNG */}
        <mesh position={[0, 0, -0.1]}>
          <circleGeometry args={[1.05, 128]} />
          <meshStandardMaterial color={SK.ink} roughness={0.95} metalness={0} />
        </mesh>
        {/* per-mesh z steps keep coplanar layers from z-fighting */}
        {meshes.map((m, i) => (
          <mesh key={i} geometry={m.geo} material={mats[m.mat]} position={[0, 0, m.z]} castShadow />
        ))}
      </group>
    </group>
  );
}
