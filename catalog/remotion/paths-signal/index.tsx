// A signal line: a straight rule warps into a travelling wave (@remotion/paths warpPath) under the label, then calms down.
import React from 'react';
import {warpPath} from '@remotion/paths';
import {Box, GraphicProps, HUE, caps, exitK, fit, hueOf, k01, textOf, type} from '../../../src/catalog/ui';

const Signal: React.FC<GraphicProps> = ({it, r, lf, dur, st, ink, scrim, u}) => {
  const text = textOf(it, 'Signal');
  const fs = fit(text, r[2], r[3] * 0.44, st.weight, st.tracking);
  const y = r[3] * 0.74, w = r[2];
  const amp = r[3] * 0.14 * k01(lf, 4, 18) * (1 - k01(lf, dur - 26, dur - 8));
  const segs = 24;
  const base = `M 0 ${y} ` + Array.from({length: segs}, (_, i) => `L ${((i + 1) / segs) * w} ${y}`).join(' ');
  const d = warpPath(base, ({x, y: yy}) => ({x, y: yy + Math.sin(x / (w / 3.2) * Math.PI * 2 - lf * 0.25) * amp * Math.sin((x / w) * Math.PI)}));
  const out = exitK(lf, dur);
  const col = hueOf(it, HUE.teal);
  return (
    <Box r={r} scrim={scrim} u={u} style={{opacity: 1 - out}}>
      <div style={{position: 'absolute', left: 0, top: 0, ...type(st, fs, ink), clipPath: `inset(0 ${(1 - k01(lf, 0, 14)) * 100}% 0 0)`}}>{text}</div>
      <svg width={w} height={r[3]} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        <path d={d} fill="none" stroke={col} strokeWidth={2.5 * u} strokeLinejoin="round" opacity={k01(lf, 0, 8)} />
      </svg>
      {it.sub && <div style={{position: 'absolute', right: 0, top: y + r[3] * 0.08, ...caps(st, fs * 0.26, st.accentHi)}}>{it.sub}</div>}
    </Box>
  );
};
export default Signal;
