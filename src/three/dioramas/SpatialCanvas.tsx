import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import {
  AdditiveBlending,
  CanvasTexture,
  MathUtils,
  SRGBColorSpace,
  Vector3,
  type Group,
  type MeshBasicMaterial,
  type MeshStandardMaterial,
} from 'three';
import { Dust, GlowPlane, KeyBeam, makeRadialGlow } from '../cinema';

const VIOLET = '#7c5cff';
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
] as const;

const CYCLE = 12;

const smooth = (t: number) => {
  const x = MathUtils.clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
};

/**
 * A real document face per format: header bar with the tag, then content that
 * matches the family — tables for sheets, a play thumb for video, braces for
 * JSON, curves for SVG — so the cards read as documents, not decals.
 */
function makeDocTexture(tag: string, color: string): CanvasTexture {
  const W = 256;
  const H = 192;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const g = cv.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#16112e');
  grad.addColorStop(1, '#0c0920');
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
  // header bar
  g.fillStyle = color;
  g.fillRect(0, 0, W, 34);
  g.fillStyle = '#0b0817';
  g.font = '900 20px "Public Sans", Arial, sans-serif';
  g.textBaseline = 'middle';
  g.fillText(tag, 12, 18);
  // three ui dots on the right of the header
  [W - 18, W - 34, W - 50].forEach((x) => {
    g.beginPath();
    g.arc(x, 17, 4, 0, Math.PI * 2);
    g.fillStyle = 'rgba(10,8,20,0.55)';
    g.fill();
  });
  const ink = 'rgba(190,178,255,0.72)';
  const inkDim = 'rgba(140,125,210,0.45)';
  g.fillStyle = ink;
  const line = (x: number, y: number, w: number, h = 7, c = ink) => {
    g.fillStyle = c;
    g.fillRect(x, y, w, h);
  };
  switch (tag) {
    case 'XLSX':
    case 'CSV': {
      // spreadsheet grid with a lit header row
      g.strokeStyle = 'rgba(120,110,190,0.4)';
      for (let r = 0; r < 5; r++)
        for (let c = 0; c < 4; c++) {
          const x = 14 + c * 58;
          const y = 48 + r * 26;
          g.strokeRect(x, y, 58, 26);
          if (r === 0) line(x + 6, y + 9, 40, 7, ink);
          else if ((r + c) % 3 !== 0) line(x + 6, y + 10, 24 + ((r * c) % 3) * 8, 6, inkDim);
        }
      break;
    }
    case 'MP4': {
      // video thumb with play triangle + scrubber
      g.fillStyle = 'rgba(60,48,120,0.55)';
      g.fillRect(14, 46, W - 28, 100);
      g.fillStyle = 'rgba(220,210,255,0.9)';
      g.beginPath();
      g.moveTo(118, 76);
      g.lineTo(148, 96);
      g.lineTo(118, 116);
      g.closePath();
      g.fill();
      line(14, 158, W - 28, 5, inkDim);
      line(14, 158, 88, 5, ink);
      g.beginPath();
      g.arc(102, 160, 6, 0, Math.PI * 2);
      g.fillStyle = ink;
      g.fill();
      break;
    }
    case 'JSON': {
      g.font = '700 15px "Courier Prime", monospace';
      g.fillStyle = ink;
      ['{', '  "doc": "kb",', '  "chunks": 512,', '  "embedded": true,', '  "score": 0.98', '}'].forEach((s, i) =>
        g.fillText(s, 16, 58 + i * 22),
      );
      break;
    }
    case 'SVG': {
      g.strokeStyle = ink;
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(24, 150);
      g.bezierCurveTo(70, 40, 150, 180, 232, 70);
      g.stroke();
      g.strokeStyle = inkDim;
      g.strokeRect(60, 70, 60, 44);
      g.beginPath();
      g.arc(180, 130, 26, 0, Math.PI * 2);
      g.stroke();
      [
        [24, 150],
        [232, 70],
      ].forEach(([x, y]) => {
        g.fillStyle = ink;
        g.fillRect(x - 4, y - 4, 8, 8);
      });
      break;
    }
    case 'PPTX': {
      line(24, 56, 150, 14, ink); // slide title
      line(24, 84, 4, 52, inkDim); // slide edge
      [0, 1, 2].forEach((i) => line(40, 88 + i * 20, 110 - i * 18, 7, inkDim));
      g.fillStyle = 'rgba(60,48,120,0.55)';
      g.fillRect(168, 84, 66, 56);
      break;
    }
    case 'MD': {
      g.font = '900 20px "Courier Prime", monospace';
      g.fillStyle = ink;
      g.fillText('# Readme', 16, 60);
      [0, 1, 2, 3].forEach((i) => line(16, 80 + i * 20, i === 2 ? 120 : 200 - i * 16, 6, inkDim));
      g.fillText('```', 16, 168);
      break;
    }
    default: {
      // PDF / DOCX — title, rule, justified paragraphs, image block
      line(18, 54, 140, 12, ink);
      line(18, 74, W - 36, 2, inkDim);
      [0, 1, 2, 3].forEach((i) => line(18, 86 + i * 16, i === 3 ? 130 : W - 40 - (i % 2) * 14, 6, inkDim));
      g.fillStyle = 'rgba(60,48,120,0.5)';
      g.fillRect(18, 152, 84, 28);
      [0, 1].forEach((i) => line(114, 156 + i * 13, 118 - i * 30, 6, inkDim));
    }
  }
  const tex = new CanvasTexture(cv);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** faint violet canvas grid printed on the shared floor */
function makeFloorGrid(): CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = 512;
  cv.height = 512;
  const g = cv.getContext('2d')!;
  g.clearRect(0, 0, 512, 512);
  for (let i = 0; i <= 20; i++) {
    const p = (i / 20) * 512;
    const major = i % 5 === 0;
    g.strokeStyle = major ? 'rgba(124,92,255,0.55)' : 'rgba(70,55,140,0.35)';
    g.lineWidth = major ? 1.6 : 1;
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

/**
 * SC.03 — Docucaine's Spatial Canvas. Mixed-format documents sweep in on arcing
 * paths — banking like dealt cards — and settle into a machined light-frame;
 * while the canvas holds, a cursor picks one card up and pulls it forward, the
 * drag-and-resize interaction made literal. Then the canvas releases, re-deals.
 */
export function SpatialCanvas({ position = [-5, 0, 0] }: { position?: [number, number, number] }) {
  const cards = useRef<(Group | null)[]>([]);
  const halos = useRef<(MeshBasicMaterial | null)[]>([]);
  const docMats = useRef<(MeshStandardMaterial | null)[]>([]);
  const cursor = useRef<Group>(null);
  const cursorMat = useRef<MeshStandardMaterial>(null);
  const frameMat = useRef<MeshStandardMaterial>(null);
  const tmp = useMemo(() => new Vector3(), []);

  const docTextures = useMemo(() => FORMATS.map((f) => makeDocTexture(f.tag, f.color)), []);
  const haloTextures = useMemo(() => FORMATS.map((f) => makeRadialGlow(f.color)), []);
  const floorTex = useMemo(makeFloorGrid, []);

  const data = useMemo(
    () =>
      FORMATS.map((f, i) => {
        const h = (n: number) => {
          const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453;
          return x - Math.floor(x);
        };
        const col = i % 3,
          row = Math.floor(i / 3);
        // the docked layout: a clean 3×3 grid, all cards coplanar in the frame
        const grid = new Vector3((col - 1) * 0.84, (1 - row) * 0.64 + 1.3, 0);
        // FLOW-THROUGH, not a bounce: each card streams IN from stage-right-front
        // and, after docking, continues OUT to stage-left-back — one directional
        // current, so it never rewinds its own path
        const inAng = (i / FORMATS.length - 0.5) * 1.6;
        const entry = new Vector3(2.7 + h(1) * 0.5, 1.3 + inAng * 1.3 + (h(2) - 0.5) * 0.5, 1.9 + h(3) * 1.1);
        const exit = new Vector3(-2.7 - h(4) * 0.5, 1.5 + inAng * 1.1 + (h(5) - 0.5) * 0.5 + 0.5, 1.7 + h(6) * 1.1);
        const spinIn = new Vector3((h(7) - 0.5) * 0.8, 0.6 + h(8) * 0.5, (h(1) - 0.5) * 0.6);
        const spinOut = new Vector3((h(2) - 0.5) * 0.8, -0.7 - h(3) * 0.5, (h(4) - 0.5) * 0.6);
        return { ...f, grid, entry, exit, spinIn, spinOut, bob: h(8) * 6, delay: i * 0.02 };
      }),
    [],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const cycle = (t % CYCLE) / CYCLE;
    const beat = Math.floor(t / CYCLE);
    const focusIdx = beat % FORMATS.length;

    // timeline: deal in 0→0.46 (staggered), ALL settled by 0.46, the cursor
    // interaction beat runs 0.52→0.78 — strictly after every card is docked —
    // then the whole canvas releases together at 0.8
    const holdT = MathUtils.clamp((cycle - 0.52) / 0.26, 0, 1);
    const lift = Math.sin(holdT * Math.PI); // 0→1→0 pull-forward envelope

    data.forEach((d, i) => {
      const g = cards.current[i];
      if (!g) return;
      const inT = smooth((cycle - d.delay) / 0.3);
      const outT = smooth((cycle - 0.8) / 0.17);
      const docked = inT * (1 - outT);

      tmp.lerpVectors(d.entry, d.grid, inT);
      tmp.lerpVectors(tmp, d.exit, outT);
      tmp.y += Math.sin(inT * Math.PI) * 0.32 * (1 - outT) + Math.sin(outT * Math.PI) * 0.28;
      tmp.y += Math.sin(t * 0.9 + d.bob) * 0.03 * docked * docked * docked;

      // the interaction beat: the cursor lifts the fitted focus card forward
      let focus = 0;
      if (i === focusIdx) {
        focus = lift * smooth((docked - 0.9) / 0.1);
        tmp.z += focus * 0.55;
        tmp.y += focus * 0.05;
      }

      g.position.copy(tmp);
      g.rotation.set(
        d.spinIn.x * (1 - inT) + d.spinOut.x * outT - focus * 0.12,
        d.spinIn.y * (1 - inT) + d.spinOut.y * outT,
        d.spinIn.z * (1 - inT) + d.spinOut.z * outT,
      );
      // shrink cards as they leave so they recede to nothing instead of
      // streaking off-frame at full size
      g.scale.setScalar((0.7 + docked * 0.3 + focus * 0.22) * (1 - outT * 0.65));

      // the additive halo + the emissive doc face are what bloomed into a
      // bright dot as a card exited stage-left — fade both out with the exit
      // (and dim while off-grid) so cards dissolve cleanly, no flash
      const halo = halos.current[i];
      if (halo) halo.opacity = (0.06 + docked * 0.1 + focus * 0.22) * (1 - outT);
      const dm = docMats.current[i];
      if (dm) dm.emissiveIntensity = 0.55 * (0.2 + 0.8 * docked);
    });

    // cursor glides to the focused card while the grid holds
    if (cursor.current) {
      const d = data[focusIdx];
      const show = lift;
      cursor.current.position.set(d.grid.x + 0.24, d.grid.y - 0.16 + show * 0.06, 0.72 + show * 0.5);
      cursor.current.scale.setScalar(0.5 + show * 0.5);
      if (cursorMat.current) cursorMat.current.opacity = 0.15 + show * 0.85;
    }
    if (frameMat.current) frameMat.current.emissiveIntensity = 1.05 + Math.sin(t * 1.4) * 0.2;
  });

  // the machined light-frame the grid snaps into: dark rails, violet channel
  const FRAME_W = 3.1;
  const FRAME_H = 2.35;
  const rails = useMemo(
    () => [
      { pos: [0, 1.3 + FRAME_H / 2, -0.12] as const, size: [FRAME_W + 0.14, 0.09, 0.09] as const },
      { pos: [0, 1.3 - FRAME_H / 2, -0.12] as const, size: [FRAME_W + 0.14, 0.09, 0.09] as const },
      { pos: [-FRAME_W / 2, 1.3, -0.12] as const, size: [0.09, FRAME_H, 0.09] as const },
      { pos: [FRAME_W / 2, 1.3, -0.12] as const, size: [0.09, FRAME_H, 0.09] as const },
    ],
    [],
  );
  const strips = useMemo(
    () => [
      { pos: [0, 1.3 + FRAME_H / 2, -0.065] as const, size: [FRAME_W - 0.02, 0.028, 0.012] as const },
      { pos: [0, 1.3 - FRAME_H / 2, -0.065] as const, size: [FRAME_W - 0.02, 0.028, 0.012] as const },
      { pos: [-FRAME_W / 2, 1.3, -0.065] as const, size: [0.028, FRAME_H - 0.02, 0.012] as const },
      { pos: [FRAME_W / 2, 1.3, -0.065] as const, size: [0.028, FRAME_H - 0.02, 0.012] as const },
    ],
    [],
  );

  return (
    <group position={position}>
      {/* unified rig: warm key kept faint here — this set's light IS the violet */}
      <KeyBeam position={[2.5, 6, 3.6]} target={[0, 1.2, 0]} intensity={40} angle={0.46} volumetric={0} />
      {/* violet key from high behind — visible cone OFF: through the empty frame
          it read as a hard straight light-stream down the middle. Light only. */}
      <KeyBeam position={[-0.4, 6.2, -1.6]} target={[0, 1.3, 0]} intensity={55} color="#8f6bff" angle={0.4} volumetric={0} mapSize={1024} />
      <pointLight position={[0, 1.4, 1.6]} color={VIOLET} intensity={9} distance={8} />
      <pointLight position={[0, 2.6, 2.6]} color="#cfd8ee" intensity={6} distance={9} />

      <Dust position={[0, 1.9, 0.6]} scale={[4.6, 3.2, 3]} count={40} color="#cabdff" size={0.95} opacity={0.14} />

      {/* violet drafting grid printed on the shared floor + pooled glow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.018, 0.4]}>
        <planeGeometry args={[7.2, 5]} />
        <meshBasicMaterial map={floorTex} transparent opacity={0.34} depthWrite={false} />
      </mesh>
      <GlowPlane color="#2b1e66" position={[0, 0.026, 0.2]} rotation={[-Math.PI / 2, 0, 0]} size={5.5} opacity={0.3} />

      {/* machined frame rails with the violet light channel + corner plates */}
      {rails.map((f, i) => (
        <RoundedBox key={i} args={[...f.size]} radius={0.018} smoothness={3} position={[...f.pos]} castShadow>
          <meshPhysicalMaterial color="#15141f" roughness={0.35} metalness={0.9} clearcoat={0.5} />
        </RoundedBox>
      ))}
      {strips.map((f, i) => (
        <mesh key={i} position={[...f.pos]}>
          <boxGeometry args={[...f.size]} />
          <meshStandardMaterial ref={i === 0 ? frameMat : undefined} color={VIOLET} emissive={VIOLET} emissiveIntensity={1.4} toneMapped={false} />
        </mesh>
      ))}
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sy) => (
          <mesh key={`${sx}${sy}`} position={[(sx * FRAME_W) / 2, 1.3 + (sy * FRAME_H) / 2, -0.06]}>
            <boxGeometry args={[0.16, 0.16, 0.05]} />
            <meshPhysicalMaterial color="#232132" roughness={0.3} metalness={0.95} clearcoat={0.6} />
          </mesh>
        )),
      )}

      {/* the cursor that "drags" the focused document — glowing ring + dot */}
      <group ref={cursor} position={[0, 1.3, 0.7]}>
        <mesh>
          <sphereGeometry args={[0.032, 16, 16]} />
          <meshStandardMaterial ref={cursorMat} color="#ffffff" emissive="#cfe0ff" emissiveIntensity={1.6} toneMapped={false} transparent opacity={0.6} />
        </mesh>
        <mesh>
          <torusGeometry args={[0.07, 0.006, 8, 32]} />
          <meshBasicMaterial color="#cfe0ff" transparent opacity={0.55} />
        </mesh>
      </group>

      {/* mixed-format document cards — glass slabs with real doc faces */}
      {data.map((_d, i) => (
        <group key={i} ref={(el) => (cards.current[i] = el)}>
          {/* soft halo bloom behind the card */}
          <mesh position={[0, 0, -0.03]}>
            <planeGeometry args={[1.15, 0.95]} />
            <meshBasicMaterial
              ref={(el) => (halos.current[i] = el)}
              map={haloTextures[i]}
              transparent
              opacity={0.15}
              depthWrite={false}
              blending={AdditiveBlending}
            />
          </mesh>
          {/* glass slab body */}
          <RoundedBox args={[0.62, 0.46, 0.024]} radius={0.02} smoothness={3} castShadow>
            {/* matte slab — was glossy (clearcoat 1) and threw sharp specular
                streaks off the key light that flashed across as cards dealt in */}
            <meshPhysicalMaterial color="#0f0c22" roughness={0.55} metalness={0.2} clearcoat={0} />
          </RoundedBox>
          {/* the document itself — lit like a screen */}
          <mesh position={[0, 0, 0.0135]}>
            <planeGeometry args={[0.58, 0.435]} />
            <meshStandardMaterial ref={(el) => (docMats.current[i] = el)} map={docTextures[i]} emissive="#ffffff" emissiveMap={docTextures[i]} emissiveIntensity={0.55} roughness={0.4} toneMapped={false} />
          </mesh>
          {/* resize handle dots on the corners — the drag-and-resize tell */}
          {[
            [-0.3, -0.22],
            [0.3, -0.22],
            [0.3, 0.22],
            [-0.3, 0.22],
          ].map(([x, y], k) => (
            <mesh key={k} position={[x, y, 0.016]}>
              <circleGeometry args={[0.013, 10]} />
              <meshBasicMaterial color="#cfe0ff" transparent opacity={0.85} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}
