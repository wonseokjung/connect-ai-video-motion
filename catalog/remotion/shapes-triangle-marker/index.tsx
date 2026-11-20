// A triangle marker (@remotion/shapes makeTriangle) points at the person, the label slides out of it on a thin rule.
import React from 'react';
import {makeTriangle} from '@remotion/shapes';
import {Box, GraphicProps, HUE, exitK, fit, hueOf, k01, textOf, type, caps} from '../../../src/catalog/ui';

const TriangleMarker: React.FC<GraphicProps> = ({it, r, lf, dur, st, ink, scrim, u, W}) => {
  const text = textOf(it, 'Here');
  const toLeft = r[0] + r[2] / 2 > W / 2; // point towards the middle of the frame (where the person is)
  const T = r[3] * 0.42;
  const tri = makeTriangle({length: T, direction: toLeft ? 'left' : 'right', edgeRoundness: 0.1});
  const k = k01(lf, 0, 10), slide = k01(lf, 6, 22), out = exitK(lf, dur, 8);
  const col = hueOf(it, HUE.coral);
  const fs = fit(text, r[2] - T * 1.6, r[3] * 0.4, st.weight, st.tracking);
  const tx = toLeft ? 0 : r[2] - tri.width;
  return (
    <Box r={r} scrim={scrim} u={u} style={{opacity: 1 - out}}>
      <svg width={tri.width} height={tri.height} style={{position: 'absolute', left: tx + (toLeft ? -1 : 1) * (1 - k) * 30 * u, top: (r[3] - tri.height) / 2, overflow: 'visible', opacity: k}}>
        <path d={tri.path} fill={col} />
      </svg>
      <div style={{position: 'absolute', top: r[3] / 2, height: Math.max(1, 1.5 * u), background: ink, opacity: 0.5, ...(toLeft ? {left: tri.width + 10 * u} : {right: tri.width + 10 * u}), width: (r[2] - tri.width - 10 * u) * slide}} />
      <div style={{position: 'absolute', overflow: 'hidden', bottom: r[3] / 2 + 6 * u, height: fs * 1.2, ...(toLeft ? {left: tri.width + 14 * u} : {right: tri.width + 14 * u})}}>
        <div style={{...type(st, fs, ink), transform: `translateY(${(1 - slide) * 100}%)`}}>{text}</div>
      </div>
      {it.sub && <div style={{position: 'absolute', top: r[3] / 2 + 8 * u, ...(toLeft ? {left: tri.width + 14 * u} : {right: tri.width + 14 * u}), ...caps(st, fs * 0.26, st.accentHi), opacity: k01(lf, 14, 24)}}>{it.sub}</div>}
    </Box>
  );
};
export default TriangleMarker;
