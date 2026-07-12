import { Stage } from './Stage';
import { SetGroup } from './cinema';
import { SKLogo } from './dioramas/SKLogo';
import { FleetEnableDock } from './dioramas/FleetEnableDock';
import { NewsAnchorRobot } from './dioramas/NewsAnchorRobot';
import { BugScope } from './dioramas/BugScope';
import { SpatialCanvas } from './dioramas/SpatialCanvas';

/**
 * The WebGL scene. Kept in its own module so it can be lazy-loaded and the
 * three.js bundle never ships to fallback clients. `quality: 'lite'` is the
 * same soundstage tuned for small/weak devices — no post-processing, no shadow
 * maps, capped DPR — so every viewport shares one look.
 * Sets are spaced far apart so fog isolates each scene in its own frame.
 */
export default function Scene3D({ quality = 'full' }: { quality?: 'full' | 'lite' }) {
  return (
    <Stage quality={quality}>
      {/* each set is distance-culled: only the one on frame (plus a neighbour
          mid-transit, already behind full fog) pays render/shadow cost */}
      <SetGroup x={0}><SKLogo position={[0, 0, 0]} /></SetGroup>
      <SetGroup x={-13}><FleetEnableDock position={[-13, 0, 0]} /></SetGroup>
      <SetGroup x={-26}><NewsAnchorRobot position={[-26, 0, 0]} /></SetGroup>
      <SetGroup x={-39}><BugScope position={[-39, 0, 0]} /></SetGroup>
      <SetGroup x={-52}><SpatialCanvas position={[-52, 0, 0]} /></SetGroup>
    </Stage>
  );
}
