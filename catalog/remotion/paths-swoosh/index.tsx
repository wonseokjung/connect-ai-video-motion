// The word sits still while a hand-drawn swoosh (@remotion/paths evolvePath) writes itself under it and flicks up at the end.
import React from 'react';
import {evolvePath, getPointAtLength, getLength} from '@remotion/paths';
import {Box, GraphicProps, exitK, fit, k01, textOf, type} from '../../../src/catalog/ui';

const Swoosh: React.FC<GraphicProps> = ({it, r, lf, dur, st, ink, scrim, u}) => {
  const text = textOf(it, 'Easy');
  const fs = fit(text, r[2] * 0.94, r[3] * 0.62, st.weight, st.tracking);
  const y = fs * 1.12;
  const w = r[2];
  const d = `M ${w * 0.02} ${y + fs * 0.08} C ${w * 0.3} ${y + fs * 0.22}, ${w * 0.62} ${y + fs * 0.02}, ${w * 0.86} ${y - fs * 0.02} S ${w * 0.97} ${y - fs * 0.2}, ${w * 0.96} ${y - fs * 0.26}`;
  const k = k01(lf, 6, 26), out = exitK(lf, dur);
  const ev = evolvePath(Math.max(0.001, k), d);
  const len = getLength(d);
  const tip = getPointAtLength(d, len * Math.max(0.001, k)) || {x: 0, y: 0};
  return (
    <Box r={r} scrim={scrim} u={u} style={{opacity: 1 - out, transform: `translateY(${-out * 20 * u}px)`}}>
      <div style={{position: 'absolute', left: 0, top: 0, ...type(st, fs, ink), opacity: k01(lf, 0, 8), transform: `translateY(${(1 - k01(lf, 0, 12)) * 16 * u}px)`}}>{text}</div>
      <svg width={w} height={r[3]} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        <path d={d} fill="none" stroke={st.accent} strokeWidth={Math.max(3, fs * 0.07)} strokeLinecap="round" strokeDasharray={ev.strokeDasharray} strokeDashoffset={ev.strokeDashoffset} />
        {k > 0.02 && k < 0.99 && <circle cx={tip.x} cy={tip.y} r={Math.max(3, fs * 0.05)} fill={st.accentHi} />}
      </svg>
    </Box>
  );
};
export default Swoosh;
