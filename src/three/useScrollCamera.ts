import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import { cameraPath } from '../scroll/cameraPath';

const tmpPos = new Vector3();
const tmpTgt = new Vector3();

/**
 * Reads document scroll progress each frame and eases the camera toward the
 * waypoint frame from `cameraPath`. Damped (lerp) so the dolly feels weighted
 * and physical, never a linear snap. Mount as a child of <Canvas>.
 */
export function useScrollCamera() {
  const { camera } = useThree();
  useFrame((_, delta) => {
    // Progress spans only the cinematic zone (hero → end of SC.03), so the
    // resume/flat content below doesn't squeeze the dolly.
    const end = document.getElementById('cinematic-end');
    const zone = end ? end.offsetTop - window.innerHeight : document.documentElement.scrollHeight - window.innerHeight;
    const p = zone > 0 ? window.scrollY / zone : 0;
    const { pos, target } = cameraPath(p);
    tmpPos.set(pos[0], pos[1], pos[2]);
    tmpTgt.set(target[0], target[1], target[2]);
    // frame-rate-independent damping — snappier than a fixed lerp, no jank
    const k = 1 - Math.pow(0.0016, delta);
    camera.position.lerp(tmpPos, k);
    camera.lookAt(tmpTgt);
  });
}

/** Null-rendering component that runs the scroll camera inside the Canvas. */
export function Rig() {
  useScrollCamera();
  return null;
}
