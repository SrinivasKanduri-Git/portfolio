import { Stage } from './Stage';
import { SKLogo } from './dioramas/SKLogo';
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
      <SKLogo position={[0, 0, 0]} />
      <NewsAnchorRobot position={[-13, 0, 0]} />
      <BugScope position={[-26, 0, 0]} />
      <SpatialCanvas position={[-39, 0, 0]} />
    </Stage>
  );
}
