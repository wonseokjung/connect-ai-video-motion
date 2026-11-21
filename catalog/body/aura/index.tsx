// An aura around you: your own measured outline (the person matte of every frame) is grown and blurred into three
// layers of coloured light behind you, a sharp rim of light right at your edge, and the colours turn slowly around
// you. Everything is behind the person matte, so not one pixel of you changes; the light only lives in the room.
import React from 'react';
import {Img} from 'remotion';
import {GraphicProps, HUE, exitK, hueOf, k01} from '../../../src/catalog/ui';
import {matteUrl, rigAt, label} from '../../../src/catalog/rig';

const Aura: React.FC<GraphicProps & {video?: any}> = ({it, lf, dur, st, u, L, mainF, W, H, video}) => {
  const i = (mainF ?? 0) - (L?.f0 ?? 0);
  const url = matteUrl(L, mainF ?? 0);
  if (!url) return null;
  const k = k01(lf, 0, 22), out = exitK(lf, dur, 16);
  const c1 = hueOf(it, HUE.goldHi), c2 = HUE.coral, c3 = HUE.violet, c4 = HUE.teal;
  const r = rigAt(L, i, 8);
  const J = r?.joints || {};
  const ctr = J.neck || (J.leftShoulder && J.rightShoulder ? [(J.leftShoulder[0] + J.rightShoulder[0]) / 2, (J.leftShoulder[1] + J.rightShoulder[1]) / 2] : [W / 2, H * 0.55]);
  const sw = (video?.srcW ?? W) * (video?.scale ?? 1), sh = (video?.srcH ?? H) * (video?.scale ?? 1), ox = -(video?.camX ?? 0);
  const breathe = 1 + 0.012 * Math.sin(lf / 7);
  const spin = lf * 2.2;
  const layer = (scale: number, blur: number, bg: string, op: number, key: string) => (
    <div key={key} style={{position: 'absolute', left: ox, top: 0, width: sw, height: sh, filter: blur ? `blur(${blur * u}px)` : undefined, opacity: op, transform: `scale(${1 + (scale - 1) * k * breathe})`, transformOrigin: `${ctr[0] - ox}px ${ctr[1]}px`}}>
      <div style={{position: 'absolute', inset: 0, background: bg, WebkitMaskImage: `url(${url})`, maskImage: `url(${url})`, WebkitMaskSize: '100% 100%', maskSize: '100% 100%', WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat', maskMode: 'luminance'} as any} />
    </div>
  );
  const conic = (a: number) => `conic-gradient(from ${a}deg at ${ctr[0] - ox}px ${ctr[1]}px, ${c1}, ${c2}, ${c3}, ${c4}, ${c1})`;
  return (
    <div style={{position: 'absolute', inset: 0, opacity: 1 - out, mixBlendMode: 'screen'}}>
      {/* the render waits for this frame's matte (a CSS mask alone is not waited for) */}
      <Img src={url} style={{position: 'absolute', width: 1, height: 1, opacity: 0}} />
      {layer(1.2, 60, conic(spin), 0.85, 'far')}
      {layer(1.08, 22, conic(spin + 120), 1, 'mid')}
      {layer(1.025, 4, `linear-gradient(180deg, #FFF6E6, ${c1} 40%, ${c2})`, 0.95, 'rim')}
      {it.text && (
        <div style={{position: 'absolute', left: 0, width: W, top: Math.max(40 * u, (r?.face?.[1] ?? H * 0.2) - 150 * u), textAlign: 'center', ...label(u, st, 30 * u, c1), letterSpacing: '0.5em', textShadow: `0 0 ${20 * u}px ${c1}`, opacity: k01(lf, 14, 28)}}>{String(it.text)}</div>
      )}
    </div>
  );
};
export default Aura;
