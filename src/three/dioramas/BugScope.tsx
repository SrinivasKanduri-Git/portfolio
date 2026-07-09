import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import { type Group, type Mesh, type MeshStandardMaterial } from 'three';
import { KeyBeam } from '../Stage';

const RUBY = '#e0113a'; // Ruby-gem red
const COPPER = '#a8622e'; // the reference's copper magnifier
const COPPER_DARK = '#8a4c22';

/**
 * SC.02 — RubySkope. A copper magnifier hovers over a dark grid floor and,
 * focused under its lens on a red laser mat, resolves the brilliant-cut Ruby —
 * the gem you mount to trace what happens inside a Rails app.
 */
export function BugScope({ position = [-2, 0, 0] }: { position?: [number, number, number] }) {
  const scope = useRef<Group>(null);
  const ruby = useRef<Group>(null);
  const reticle = useRef<MeshStandardMaterial>(null);
  const glow = useRef<Mesh>(null);

  useFrame((state3, dt) => {
    const t = state3.clock.elapsedTime;
    if (scope.current) {
      // hovers between camera and gem, examining — small drift, never a big swing
      scope.current.position.x = Math.sin(t * 0.5) * 0.16;
      scope.current.position.y = 1.02 + Math.sin(t * 0.9) * 0.05;
      scope.current.rotation.z = Math.sin(t * 0.5) * 0.04;
      scope.current.rotation.x = -0.12 + Math.sin(t * 0.7) * 0.025;
    }
    if (ruby.current) {
      ruby.current.rotation.y += dt * 0.7;
      ruby.current.position.y = 0.95 + Math.sin(t * 1.2) * 0.05;
    }
    if (reticle.current) reticle.current.emissiveIntensity = 1.3 + Math.sin(t * 4) * 0.4;
    if (glow.current) glow.current.scale.setScalar(1 + Math.sin(t * 2.2) * 0.08);
  });

  return (
    <group position={position}>
      {/* soft key from high right — the single shadow-caster, so shadows read as one */}
      <KeyBeam position={[position[0] + 2.6, 5.8, 3.6]} target={[position[0], 0.6, 0]} intensity={62} color="#f2e8d8" />
      {/* cool ambient fill bounced off the floor */}
      <pointLight position={[-1.6, 2.2, 2.6]} color="#b8c8da" intensity={9} distance={11} />
      {/* the ruby's own red glow — behind the gem so it can't torch the copper rim */}
      <pointLight position={[0, 0.95, -0.35]} color={RUBY} intensity={5.5} distance={2.8} />

      {/* dark grid floor — satin, so the key pools and the laser mat reflects */}
      <gridHelper args={[8, 26, '#2c2c38', '#181820']} position={[0, 0.02, 0]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[9, 6]} />
        <meshStandardMaterial color="#0c0c11" roughness={0.45} metalness={0.5} />
      </mesh>
      <ContactShadows position={[0, 0.015, 0]} scale={5} far={1.8} blur={2.4} opacity={0.55} frames={1} />

      {/* ── THE RUBY — brilliant cut, glossy faceted gem with an ember heart.
          (No transmission material: the transmission pass over the dark stage
          rendered the pavilion invisible — solid dielectric reads better.) ── */}
      <group ref={ruby} position={[0, 0.95, 0]} scale={0.82}>
        {/* crown (flat octagonal table on top comes free with the closed cylinder) */}
        <mesh position={[0, 0.14, 0]} castShadow>
          <cylinderGeometry args={[0.34, 0.62, 0.28, 8, 1]} />
          <meshPhysicalMaterial color="#c81030" emissive="#b00d26" emissiveIntensity={0.95} roughness={0.05} metalness={0.15} clearcoat={1} clearcoatRoughness={0.05} flatShading />
        </mesh>
        {/* girdle */}
        <mesh position={[0, -0.02, 0]}>
          <cylinderGeometry args={[0.62, 0.62, 0.05, 8, 1]} />
          <meshPhysicalMaterial color="#ff2547" emissive="#e01230" emissiveIntensity={1.25} roughness={0.05} metalness={0.15} clearcoat={1} clearcoatRoughness={0.05} flatShading toneMapped={false} />
        </mesh>
        {/* pavilion — tapers to the point */}
        <mesh position={[0, -0.32, 0]} castShadow>
          <cylinderGeometry args={[0.62, 0.001, 0.56, 8, 1]} />
          <meshPhysicalMaterial color="#b80c2a" emissive="#a00a22" emissiveIntensity={0.95} roughness={0.05} metalness={0.15} clearcoat={1} clearcoatRoughness={0.06} flatShading />
        </mesh>
      </group>
      {/* red glow pooled beneath the gem */}
      <mesh ref={glow} position={[0, 0.035, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.55, 32]} />
        <meshBasicMaterial color="#ff1030" transparent opacity={0.2} />
      </mesh>
      {/* red laser scan-grid under the ruby (the reference's targeting mat) */}
      <gridHelper args={[2.2, 8, '#ff2030', '#7a0e18']} position={[0, 0.028, 0]} />
      {/* pulsing targeting reticle */}
      <mesh position={[0, 0.032, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.78, 0.82, 48]} />
        <meshStandardMaterial ref={reticle} color="#ff2d2d" emissive="#ff2d2d" emissiveIntensity={1.3} toneMapped={false} transparent opacity={0.85} />
      </mesh>

      {/* ── THE COPPER MAGNIFIER — floats between camera and gem, lens facing out ── */}
      <group ref={scope} position={[0, 1.02, 0.75]} rotation={[-0.12, 0, 0]}>
        {/* main copper rim (torus already lies in the lens plane, facing +z) */}
        <mesh castShadow>
          <torusGeometry args={[0.72, 0.085, 24, 96]} />
          <meshPhysicalMaterial color={COPPER} roughness={0.32} metalness={0.95} clearcoat={0.6} clearcoatRoughness={0.25} />
        </mesh>
        {/* inner lip holding the glass */}
        <mesh>
          <torusGeometry args={[0.64, 0.03, 12, 72]} />
          <meshPhysicalMaterial color={COPPER_DARK} roughness={0.3} metalness={0.95} clearcoat={0.5} clearcoatRoughness={0.3} />
        </mesh>
        {/* flat lens — thin, low-refraction, clearly a pane not a ball */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.65, 0.65, 0.015, 48]} />
          <meshPhysicalMaterial color="#dceeff" roughness={0.03} metalness={0} transmission={0.9} transparent opacity={0.25} ior={1.08} thickness={0.02} />
        </mesh>
        {/* glass highlight crescents */}
        <mesh position={[0, 0, 0.02]} rotation={[0, 0, 1.9]}>
          <torusGeometry args={[0.42, 0.014, 8, 24, 1.1]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.3} />
        </mesh>
        <mesh position={[0, 0, 0.02]} rotation={[0, 0, -1.1]}>
          <torusGeometry args={[0.38, 0.01, 8, 24, 0.8]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.18} />
        </mesh>
        {/* white reticle arcs just inside the rim (from the reference) */}
        {[0.5, 2.1, 3.7, 5.3].map((a) => (
          <mesh key={a} position={[0, 0, 0.022]} rotation={[0, 0, a]}>
            <torusGeometry args={[0.52, 0.016, 6, 20, 0.75]} />
            <meshBasicMaterial color="#e8f0f8" transparent opacity={0.5} />
          </mesh>
        ))}
        {/* collar where the handle meets the rim — handle runs to the lower right */}
        <group position={[0.56, -0.56, 0]} rotation={[0, 0, Math.PI / 4]}>
          <mesh position={[0, 0.1, 0]}>
            <cylinderGeometry args={[0.1, 0.115, 0.16, 16]} />
            <meshPhysicalMaterial color={COPPER_DARK} roughness={0.3} metalness={0.95} clearcoat={0.5} clearcoatRoughness={0.3} />
          </mesh>
          {/* tapered copper handle at 45° */}
          <mesh position={[0, -0.42, 0]} castShadow>
            <cylinderGeometry args={[0.075, 0.1, 0.95, 20]} />
            <meshPhysicalMaterial color={COPPER} roughness={0.32} metalness={0.95} clearcoat={0.6} clearcoatRoughness={0.25} />
          </mesh>
          {/* rounded pommel */}
          <mesh position={[0, -0.92, 0]}>
            <sphereGeometry args={[0.105, 16, 16]} />
            <meshPhysicalMaterial color={COPPER} roughness={0.32} metalness={0.95} clearcoat={0.6} clearcoatRoughness={0.25} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
