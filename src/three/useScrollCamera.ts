import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import { cameraPath } from '../scroll/cameraPath';

const tmpPos = new Vector3();
const tmpTgt = new Vector3();
const curTgt = new Vector3(0, 1.78, 0);

/**
 * Reads document scroll progress each frame and eases the camera toward the
 * waypoint frame from `cameraPath`. Both the dolly position AND the look
 * target are damped, so pans arrive on the same weighted curve as the travel —
 * never a whip while the body is still settling. A breath of handheld drift
 * keeps held frames alive.
 */
export function useScrollCamera() {
  const { camera, clock } = useThree();
  useFrame((_, delta) => {
    // Progress spans only the cinematic zone (hero → end of SC.03), so the
    // resume/flat content below doesn't squeeze the dolly.
    const end = document.getElementById('cinematic-end');
    const zone = end ? end.offsetTop - window.innerHeight : document.documentElement.scrollHeight - window.innerHeight;
    const p = zone > 0 ? window.scrollY / zone : 0;
    const { pos, target } = cameraPath(p);
    tmpPos.set(pos[0], pos[1], pos[2]);
    tmpTgt.set(target[0], target[1], target[2]);
    // operator's breath: two incommensurate sines per axis — organic, tiny
    const t = clock.elapsedTime;
    tmpPos.y += Math.sin(t * 0.51) * 0.012 + Math.sin(t * 0.173 + 2) * 0.008;
    tmpPos.x += Math.sin(t * 0.379 + 1) * 0.01;
    tmpTgt.y += Math.sin(t * 0.443 + 3) * 0.006;
    // frame-rate-independent damping — snappier than a fixed lerp, no jank
    const k = 1 - Math.pow(0.0016, delta);
    camera.position.lerp(tmpPos, k);
    curTgt.lerp(tmpTgt, k);
    camera.lookAt(curTgt);
  });
}

/** Null-rendering component that runs the scroll camera inside the Canvas. */
export function Rig() {
  useScrollCamera();
  return null;
}
