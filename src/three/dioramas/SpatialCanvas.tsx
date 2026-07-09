import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3, MathUtils, type Group, type Mesh, type MeshStandardMaterial } from 'three';
import { KeyBeam } from '../Stage';

const VIOLET = '#7c5cff'; // Docucaine brand
// format tags — one per supported family (nods to the theme accents too)
const FORMATS = [
  { tag: 'PDF', color: '#ff5c5c' },
  { tag: 'DOCX', color: '#3B82F6' },
  { tag: 'XLSX', color: '#10ff7a' },
  { tag: 'PPTX', color: '#F59E0B' },
  { tag: 'MP4', color: '#a78bfa' },
  { tag: 'JSON', color: '#00f0ff' },
  { tag: 'MD', color: '#7c5cff' },
  { tag: 'CSV', color: '#10B981' },
  { tag: 'SVG', color: '#ff9a52' },
];

const CYCLE = 12;

const smooth = (t: number) => {
  const x = MathUtils.clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
};

/**
 * SC.03 — Docucaine's Spatial Canvas. Mixed-format documents sweep in on arcing
 * paths — banking like dealt cards — and settle into a framed grid; while the
 * canvas holds, a cursor picks one card up and pulls it forward, the drag-and-
 * resize interaction made literal. Then the canvas releases and re-deals.
 */
export function SpatialCanvas({ position = [-5, 0, 0] }: { position?: [number, number, number] }) {
  const cards = useRef<(Group | null)[]>([]);
  const halos = useRef<(MeshStandardMaterial | null)[]>([]);
  const cursor = useRef<Mesh>(null);
  const frameMat = useRef<MeshStandardMaterial>(null);
  const tmp = useMemo(() => new Vector3(), []);

  const data = useMemo(
    () =>
      FORMATS.map((f, i) => {
        const h = (n: number) => {
          const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453;
          return x - Math.floor(x);
        };
        const col = i % 3, row = Math.floor(i / 3);
        // the docked layout: a clean 3×3 grid, all cards coplanar in the frame.
        // grid cells never overlap (0.84 pitch > 0.6 card), so no depth lane hack
        // is needed and the settled canvas reads flat and tidy.
        const grid = new Vector3((col - 1) * 0.84, (1 - row) * 0.64 + 1.3, 0);
        // FLOW-THROUGH, not a bounce: each card streams IN from stage-right-front
        // and, after docking, continues OUT to stage-left-back — one directional
        // current, so it never rewinds its own path. entry/exit are off-frame and
        // the card is tiny+dim there, so the cycle wrap is invisible. angle-spread
        // by index keeps neighbours off each other in flight.
        const inAng = (i / FORMATS.length - 0.5) * 1.6;
        const entry = new Vector3(
          2.7 + h(1) * 0.5,
          1.3 + inAng * 1.3 + (h(2) - 0.5) * 0.5,
          1.9 + h(3) * 1.1,
        );
        const exit = new Vector3(
          -2.7 - h(4) * 0.5,
          1.5 + inAng * 1.1 + (h(5) - 0.5) * 0.5 + 0.5,
          1.7 + h(6) * 1.1,
        );
        const spinIn = new Vector3((h(7) - 0.5) * 0.8, 0.6 + h(8) * 0.5, (h(1) - 0.5) * 0.6);
        const spinOut = new Vector3((h(2) - 0.5) * 0.8, -0.7 - h(3) * 0.5, (h(4) - 0.5) * 0.6);
        return { ...f, grid, entry, exit, spinIn, spinOut, bob: h(8) * 6, delay: i * 0.045 };
      }),
    [],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const cycle = (t % CYCLE) / CYCLE;
    const beat = Math.floor(t / CYCLE);
    const focusIdx = beat % FORMATS.length;

    // hold window (cards docked in the frame): cycle 0.36 → 0.70
    const holdT = MathUtils.clamp((cycle - 0.36) / 0.34, 0, 1);
    const lift = Math.sin(holdT * Math.PI); // 0→1→0 pull-forward envelope

    data.forEach((d, i) => {
      const g = cards.current[i];
      if (!g) return;
      // two independent eased ramps drive ONE continuous forward glide:
      //   inT : entry → grid   over the first ~34% (staggered per card)
      //   outT: grid  → exit    over the last  ~28%
      // during the hold both are flat (inT=1, outT=0) so the card rests in its
      // slot; then it releases forward to the exit. no ramp ever reverses, so the
      // motion is one smooth orchestrated current — never a stop-and-rewind.
      const inT = smooth((cycle - d.delay) / 0.34);
      const outT = smooth((cycle - 0.72 - d.delay * 0.25) / 0.24);
      // settled-ness: 1 while docked, 0 at both off-frame ends
      const docked = inT * (1 - outT);

      tmp.lerpVectors(d.entry, d.grid, inT);
      tmp.lerpVectors(tmp, d.exit, outT);
      // arc each leg so cards swoop rather than slide flat; lift also keeps
      // mid-flight paths from grazing each other
      tmp.y += Math.sin(inT * Math.PI) * 0.32 * (1 - outT) + Math.sin(outT * Math.PI) * 0.28;
      // gentle float once fitted — faded in smoothly, never gated on/off
      tmp.y += Math.sin(t * 0.9 + d.bob) * 0.03 * docked * docked * docked;

      // the interaction beat: the cursor lifts the fitted focus card forward
      let focus = 0;
      if (i === focusIdx) {
        focus = lift * smooth((docked - 0.9) / 0.1);
        tmp.z += focus * 0.55;
        tmp.y += focus * 0.05;
      }

      g.position.copy(tmp);
      // spin in on the way to the slot, sit square while docked, spin out on the
      // way off — the tumble direction differs in/out, reinforcing the through-flow
      g.rotation.set(
        d.spinIn.x * (1 - inT) + d.spinOut.x * outT - focus * 0.12,
        d.spinIn.y * (1 - inT) + d.spinOut.y * outT,
        d.spinIn.z * (1 - inT) + d.spinOut.z * outT,
      );
      g.scale.setScalar(0.7 + docked * 0.3 + focus * 0.22);

      const halo = halos.current[i];
      if (halo) halo.emissiveIntensity = 0.5 + docked * 0.3 + focus * 1.3;
    });

    // cursor glides to the focused card while the grid holds
    if (cursor.current) {
      const d = data[focusIdx];
      const show = lift;
      cursor.current.position.set(
        d.grid.x + 0.24,
        d.grid.y - 0.16 + show * 0.06,
        0.72 + show * 0.5,
      );
      cursor.current.scale.setScalar(0.5 + show * 0.5);
      (cursor.current.material as MeshStandardMaterial).opacity = 0.15 + show * 0.85;
    }
    if (frameMat.current) frameMat.current.emissiveIntensity = 0.9 + Math.sin(t * 1.4) * 0.25;
  });

  // the canvas frame the grid snaps into
  const frame = useMemo(() => {
    const w = 3.1, h = 2.35, th = 0.03;
    return [
      { pos: [0, 1.3 + h / 2, -0.12] as const, size: [w, th, th] as const },
      { pos: [0, 1.3 - h / 2, -0.12] as const, size: [w, th, th] as const },
      { pos: [-w / 2, 1.3, -0.12] as const, size: [th, h, th] as const },
      { pos: [w / 2, 1.3, -0.12] as const, size: [th, h, th] as const },
    ];
  }, []);

  return (
    <group position={position}>
      <KeyBeam position={[position[0] + 2.5, 6, 3.6]} target={[position[0], 1.2, 0]} intensity={40} color="#d9ccff" />

      {/* the canvas grid — kept local to this set so it doesn't bleed under others */}
      <gridHelper args={[7.5, 22, VIOLET, '#2a2350']} position={[0, -0.15, 0]} />
      {/* brand glow anchor */}
      <pointLight position={[0, 1.4, 1.6]} color={VIOLET} intensity={9} distance={8} />
      <pointLight position={[0, 2.6, 2.6]} color="#cfd8ee" intensity={6} distance={9} />

      {/* neon canvas frame the documents dock into */}
      {frame.map((f, i) => (
        <mesh key={i} position={f.pos as unknown as [number, number, number]}>
          <boxGeometry args={f.size as unknown as [number, number, number]} />
          <meshStandardMaterial ref={i === 0 ? frameMat : undefined} color={VIOLET} emissive={VIOLET} emissiveIntensity={0.9} toneMapped={false} />
        </mesh>
      ))}

      {/* the cursor that "drags" the focused document */}
      <mesh ref={cursor} position={[0, 1.3, 0.7]}>
        <sphereGeometry args={[0.045, 12, 12]} />
        <meshStandardMaterial color="#ffffff" emissive="#cfe0ff" emissiveIntensity={2.4} toneMapped={false} transparent opacity={0.6} />
      </mesh>

      {/* mixed-format document cards */}
      {data.map((d, i) => (
        <group key={i} ref={(el) => (cards.current[i] = el)}>
          {/* halo glow behind the card */}
          <mesh position={[0, 0, -0.018]}>
            <planeGeometry args={[0.68, 0.52]} />
            <meshStandardMaterial
              ref={(el) => (halos.current[i] = el)}
              color="#000000"
              emissive={d.color}
              emissiveIntensity={0.6}
              toneMapped={false}
              transparent
              opacity={0.16}
            />
          </mesh>
          {/* card surface — dark glass */}
          <mesh castShadow>
            <boxGeometry args={[0.6, 0.44, 0.022]} />
            <meshPhysicalMaterial color="#151130" emissive={VIOLET} emissiveIntensity={0.14} roughness={0.18} metalness={0.4} clearcoat={0.8} clearcoatRoughness={0.2} />
          </mesh>
          {/* format tag bar */}
          <mesh position={[0, 0.18, 0.013]}>
            <planeGeometry args={[0.6, 0.09]} />
            <meshStandardMaterial color={d.color} emissive={d.color} emissiveIntensity={0.9} toneMapped={false} />
          </mesh>
          {/* faux content lines */}
          <mesh position={[-0.06, 0.02, 0.013]}>
            <planeGeometry args={[0.44, 0.028]} />
            <meshBasicMaterial color="#a78bfa" transparent opacity={0.55} />
          </mesh>
          <mesh position={[-0.12, -0.05, 0.013]}>
            <planeGeometry args={[0.32, 0.024]} />
            <meshBasicMaterial color="#6d5bb0" transparent opacity={0.5} />
          </mesh>
          <mesh position={[-0.16, -0.11, 0.013]}>
            <planeGeometry args={[0.24, 0.022]} />
            <meshBasicMaterial color="#6d5bb0" transparent opacity={0.4} />
          </mesh>
          {/* resize handle dots on the corners — the drag-and-resize tell */}
          {[[-0.29, -0.21], [0.29, -0.21], [0.29, 0.21], [-0.29, 0.21]].map(([x, y], k) => (
            <mesh key={k} position={[x, y, 0.014]}>
              <circleGeometry args={[0.014, 8]} />
              <meshBasicMaterial color="#cfe0ff" transparent opacity={0.8} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}
