// [ word ]: two square brackets draw themselves around the word (@remotion/paths evolvePath), then close in a little.
import React from 'react';
import {evolvePath} from '@remotion/paths';
import {Box, GraphicProps, exitK, fit, k01, textOf, type} from '../../../src/catalog/ui';

const Brackets: React.FC<GraphicProps> = ({it, r, lf, dur, st, ink, scrim, u}) => {
  const text = textOf(it, 'Focus');
  const pad = r[3] * 0.22;
  const fs = fit(text, r[2] - pad * 3, r[3] * 0.56, st.weight, st.tracking);
  const k = k01(lf, 0, 18), close = k01(lf, 16, 30), out = exitK(lf, dur);
  const h = r[3] * 0.9, arm = pad * 0.9, x0 = pad * 0.4 + (1 - close) * -pad * 0.4;
  const L = `M ${x0 + arm} ${(r[3] - h) / 2} L ${x0} ${(r[3] - h) / 2} L ${x0} ${(r[3] + h) / 2} L ${x0 + arm} ${(r[3] + h) / 2}`;
  const xr = r[2] - pad * 0.4 + (1 - close) * pad * 0.4;
  const R = `M ${xr - arm} ${(r[3] - h) / 2} L ${xr} ${(r[3] - h) / 2} L ${xr} ${(r[3] + h) / 2} L ${xr - arm} ${(r[3] + h) / 2}`;
  const eL = evolvePath(Math.max(0.001, k), L), eR = evolvePath(Math.max(0.001, k), R);
  return (
    <Box r={r} scrim={scrim} u={u} style={{opacity: 1 - out}}>
      <svg width={r[2]} height={r[3]} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        <path d={L} fill="none" stroke={st.accent} strokeWidth={2.5 * u} strokeDasharray={eL.strokeDasharray} strokeDashoffset={eL.strokeDashoffset} />
        <path d={R} fill="none" stroke={st.accent} strokeWidth={2.5 * u} strokeDasharray={eR.strokeDasharray} strokeDashoffset={eR.strokeDashoffset} />
      </svg>
      <div style={{position: 'absolute', left: 0, right: 0, top: r[3] / 2 - fs * 0.6, textAlign: 'center', ...type(st, fs, ink), letterSpacing: `${st.tracking + (1 - close) * 0.2}em`, opacity: k01(lf, 6, 16)}}>{text}</div>
    </Box>
  );
};
export default Brackets;
