// Before -> after: a circle morphs into a square (@remotion/paths interpolatePath) while the first word gives way to the second.
import React from 'react';
import {interpolatePath} from '@remotion/paths';
import {makeCircle, makeRect} from '@remotion/shapes';
import {Box, GraphicProps, HUE, exitK, fit, k01, type} from '../../../src/catalog/ui';

const Morph: React.FC<GraphicProps> = ({it, r, lf, dur, st, ink, scrim, u}) => {
  const a = String(it.text || 'Idea'), b = String(it.sub || it.value || 'Product');
  const D = r[3] * 0.8;
  const c = makeCircle({radius: D / 2}).path, s = makeRect({width: D, height: D, cornerRadius: D * 0.08}).path;
  const m = k01(lf, Math.round(dur * 0.35), Math.round(dur * 0.35) + 18);
  const out = exitK(lf, dur);
  const fs = fit(a.length > b.length ? a : b, r[2] - D - 24 * u, r[3] * 0.36, st.weight, st.tracking);
  const col = m < 0.5 ? HUE.teal : st.accent;
  return (
    <Box r={r} scrim={scrim} u={u} style={{opacity: (1 - out) * k01(lf, 0, 8)}}>
      <svg width={D} height={D} style={{position: 'absolute', left: 0, top: (r[3] - D) / 2, overflow: 'visible', transform: `rotate(${m * 90}deg)`}}>
        <path d={interpolatePath(m, c, s)} fill="none" stroke={col} strokeWidth={3 * u} />
        <path d={interpolatePath(m, c, s)} fill={col} fillOpacity={0.15} transform={`translate(${D * 0.15}, ${D * 0.15}) scale(0.7)`} />
      </svg>
      <div style={{position: 'absolute', left: D + 24 * u, top: r[3] / 2 - fs * 0.6, height: fs * 1.2, overflow: 'hidden'}}>
        <div style={{...type(st, fs, ink), transform: `translateY(${-m * 100}%)`}}>{a}</div>
        <div style={{...type(st, fs, st.accentHi), transform: `translateY(${-m * 100}%)`}}>{b}</div>
      </div>
    </Box>
  );
};
export default Morph;
