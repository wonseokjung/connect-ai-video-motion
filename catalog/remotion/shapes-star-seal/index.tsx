// A many-pointed thin star (@remotion/shapes makeStar) turns slowly like a seal; the number stamps in the middle.
import React from 'react';
import {makeStar} from '@remotion/shapes';
import {Box, GraphicProps, SNAP, caps, exitK, fit, k01, textOf, type} from '../../../src/catalog/ui';

const StarSeal: React.FC<GraphicProps> = ({it, r, lf, dur, st, ink, scrim, u}) => {
  const value = String(it.value ?? it.text ?? '1');
  const D = Math.min(r[3], r[2]);
  const star = makeStar({points: 18, innerRadius: D * 0.4, outerRadius: D * 0.47, edgeRoundness: 0.3});
  const stamp = k01(lf, 0, 12, SNAP), out = exitK(lf, dur);
  const fs = fit(value, D * 0.58, D * 0.42, st.weight, -0.04);
  const label = String(it.unit || it.label || '');
  return (
    <Box r={r} scrim={scrim} u={u} style={{opacity: 1 - out}}>
      <svg width={D} height={D} style={{position: 'absolute', left: (r[2] - D) / 2, top: (r[3] - D) / 2, overflow: 'visible', transform: `rotate(${lf * 0.6}deg) scale(${0.6 + 0.4 * stamp})`}}>
        <path d={star.path} transform={`translate(${D * 0.03}, ${D * 0.03})`} fill="none" stroke={st.accent} strokeWidth={2 * u} />
        <circle cx={D / 2} cy={D / 2} r={D * 0.34} fill="none" stroke={ink} strokeOpacity={0.3} strokeWidth={1 * u} strokeDasharray={`${3 * u} ${5 * u}`} />
      </svg>
      <div style={{position: 'absolute', left: 0, right: 0, top: r[3] / 2 - fs * 0.62, textAlign: 'center', ...type(st, fs, ink), transform: `scale(${1.6 - 0.6 * stamp})`, opacity: Math.min(1, stamp * 2), fontVariantNumeric: 'tabular-nums'}}>{value}</div>
      {label && <div style={{position: 'absolute', left: 0, right: 0, top: r[3] / 2 + fs * 0.5, textAlign: 'center', ...caps(st, fit(label.toUpperCase(), D * 0.5, D * 0.06, st.heavy, 0.22), st.accentHi), opacity: k01(lf, 10, 20)}}>{label}</div>}
    </Box>
  );
};
export default StarSeal;
