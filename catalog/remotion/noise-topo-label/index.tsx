// Thin contour lines made from noise (@remotion/noise noise2D) draw across the box like a map, a label sits on the ridge.
import React from 'react';
import {noise2D} from '@remotion/noise';
import {Box, GraphicProps, HUE, caps, exitK, fit, hueOf, k01, type} from '../../../src/catalog/ui';

const NoiseTopoLabel: React.FC<GraphicProps> = ({it, r, lf, dur, st, ink, scrim, u}) => {
  const [w, h] = [r[2], r[3]];
  const col = hueOf(it, HUE.teal);
  const N = 9, step = 24;
  const draw = k01(lf, 0, 26), out = exitK(lf, dur);
  const lines = Array.from({length: N}, (_, i) => {
    const pts: string[] = [];
    for (let x = 0; x <= w; x += step) {
      const y = h * 0.28 + i * (h * 0.07) + noise2D('topo', x / 260, i * 0.18 + lf * 0.004) * h * 0.16 - (1 - Math.abs(x / w - 0.5) * 2) * h * 0.1;
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    return 'M' + pts.join(' L');
  });
  const text = String(it.text || 'Landscape');
  const fs = fit(text, w * 0.9, h * 0.3, st.weight, st.tracking);
  return (
    <Box r={r} scrim={scrim} u={u} style={{opacity: 1 - out}}>
      <svg width={w} height={h} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        {lines.map((d, i) => (
          <path key={i} d={d} fill="none" stroke={i === 3 ? st.accent : col} strokeOpacity={i === 3 ? 0.95 : 0.25 + 0.06 * i} strokeWidth={(i === 3 ? 2 : 1.2) * u} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - Math.min(1, draw * 1.3 - i * 0.03)} />
        ))}
      </svg>
      <div style={{position: 'absolute', left: w * 0.06, top: h * 0.04, ...type(st, fs, ink), opacity: k01(lf, 10, 20)}}>{text}</div>
      {it.sub && <div style={{position: 'absolute', left: w * 0.06, top: h * 0.04 + fs * 1.2, ...caps(st, Math.max(10, fs * 0.28), st.accentHi), opacity: k01(lf, 16, 26)}}>{String(it.sub)}</div>}
    </Box>
  );
};
export default NoiseTopoLabel;
