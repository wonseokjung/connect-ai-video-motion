// Lottie adapter: any Lottie .json (After Effects / LottieFiles export) through @remotion/lottie, scaled into the
// box the layout engine gave. The animation is stretched to the graphic's time unless meta.loop is true.
import React, {useEffect, useState} from 'react';
import {continueRender, delayRender, staticFile} from 'remotion';
import {Lottie, LottieAnimationData} from '@remotion/lottie';
import {assetName} from '../core/assets.mjs';
import {kindOf} from '../core/catalog.mjs';

export const LottieFile: React.FC<any> = ({it, r, dur, fps}) => {
  const mt = it.meta || {};
  const kind = kindOf(it.kind);
  const file = kind === 'lottie' ? assetName('lottie', it.src) : assetName(kind, mt.src);
  const [data, setData] = useState<LottieAnimationData | null>(null);
  const [h] = useState(() => delayRender(`Lottie ${file}`));
  useEffect(() => {
    fetch(staticFile('vm-assets/' + file))
      .then((x) => x.json())
      .then((j) => {
        setData(j);
        continueRender(h);
      })
      .catch((e) => {
        console.error('Lottie failed', e);
        continueRender(h);
      });
  }, [file]);
  if (!data) return null;
  const frames = (data as any).op - (data as any).ip || 60;
  const own = frames / ((data as any).fr || 30);
  const rate = mt.loop ? 1 : own / Math.max(0.1, dur / fps);
  return (
    <div style={{position: 'absolute', left: r[0], top: r[1], width: r[2], height: r[3]}}>
      <Lottie animationData={data} playbackRate={rate} loop={!!mt.loop} style={{width: '100%', height: '100%'}} />
    </div>
  );
};
