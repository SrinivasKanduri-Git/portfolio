import { lazy, Suspense, useCallback, useState } from 'react';
import { Hud } from './hud/Hud';
import { CurtainIntro } from './hud/CurtainIntro';
import { FallbackStage } from './fallback/FallbackStage';
import type { Tier } from './capabilities';

const Scene3D = lazy(() => import('./three/Scene3D'));

export function App({ tier, reduceMotion }: { tier: Tier; reduceMotion: boolean }) {
  const [intro, setIntro] = useState(!reduceMotion && tier !== 'fallback');
  const done = useCallback(() => setIntro(false), []);

  return (
    <>
      {tier !== 'fallback' ? (
        <Suspense fallback={<FallbackStage />}>
          <Scene3D quality={tier} />
        </Suspense>
      ) : (
        <FallbackStage />
      )}
      <Hud reduceMotion={reduceMotion} />
      <CurtainIntro onDone={done} skip={reduceMotion || tier === 'fallback'} />
      {intro && <style>{`html{overflow:hidden}`}</style>}
    </>
  );
}
