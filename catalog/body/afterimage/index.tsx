// Afterimages of your motion: your measured outline from a moment ago (the person matte of earlier frames) is laid
// down behind you as five flat colour silhouettes, older ones further back and fainter. When you move your arms, a
// rainbow of your own motion trails behind them; when you hold still, it hides behind you. Your pixels never change.
import React from 'react';
import {Img, staticFile} from 'remotion';
import {GraphicProps, HUE, exitK, hueOf, k01} from '../../../src/catalog/ui';

const AfterImage: React.FC<GraphicProps & {video?: any}> = ({it, lf, dur, u, L, mainF, W, H, video}) => {
  if (!L?.matteDir) return null;
  const f = mainF ?? 0;
  const lag = Math.max(2, Math.min(8, Number(it.value) || 6)); // frames between two echoes
  const cols = [hueOf(it, HUE.goldHi), HUE.coral, HUE.violet, HUE.blue, HUE.teal];
  const k = k01(lf, 0, 12), out = exitK(lf, dur, 12);
  const sw = (video?.srcW ?? W) * (video?.scale ?? 1), sh = (video?.srcH ?? H) * (video?.scale ?? 1), ox = -(video?.camX ?? 0);
  const first = Math.max(0, (L.f0 ?? 0) - 17); // the kit makes the matte from 0.6 s before the graphic
  const layers = cols.map((c, q) => {
    const g = Math.max(first, f - lag * (q + 1));
    const url = staticFile(`${L.matteDir}/m_${String(g).padStart(6, '0')}.png`);
    return {c, url, a: (0.95 - q * 0.12) * k, q};
  }).reverse();
  return (
    <div style={{position: 'absolute', inset: 0, opacity: 1 - out}}>
      {layers.map(({c, url, a, q}) => (
        <div key={q} style={{position: 'absolute', left: ox, top: 0, width: sw, height: sh, opacity: a, filter: q === 0 ? `drop-shadow(0 0 ${10 * u}px ${c})` : undefined}}>
          <Img src={url} style={{position: 'absolute', width: 1, height: 1, opacity: 0}} />
          <div style={{position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${c}, ${c}CC)`, WebkitMaskImage: `url(${url})`, maskImage: `url(${url})`, WebkitMaskSize: '100% 100%', maskSize: '100% 100%', WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat', maskMode: 'luminance'} as any} />
        </div>
      ))}
    </div>
  );
};
export default AfterImage;
