// A small chip grows into a wide card: shape, colour and radius are tweened together (@remotion/animation-utils interpolateStyles, makeTransform).
import React from 'react';
import {interpolateStyles, makeTransform, translateY, scale} from '@remotion/animation-utils';
import {Box, GraphicProps, HUE, caps, exitK, fit, k01, textOf, type} from '../../../src/catalog/ui';

const Chip: React.FC<GraphicProps> = ({it, r, lf, dur, st, scrim, u}) => {
  const text = textOf(it, 'Live');
  const k = k01(lf, 6, 24), out = exitK(lf, dur);
  const fs = fit(text, r[2] * 0.72, r[3] * 0.58, st.weight, st.tracking);
  const css = interpolateStyles(k, [0, 1], [
    {width: r[3] * 0.5, height: r[3] * 0.5, borderRadius: r[3] * 0.25, backgroundColor: HUE.coral},
    {width: r[2], height: r[3] * 0.86, borderRadius: r[3] * 0.12, backgroundColor: 'rgba(18,16,14,0.82)'},
  ]);
  return (
    <Box r={r} scrim={scrim} u={u} style={{opacity: 1 - out}}>
      <div style={{position: 'absolute', left: 0, top: (r[3] - (css.height as number)) / 2, ...css, border: `${1.5 * u}px solid ${st.accent}`, transform: makeTransform([translateY((1 - k01(lf, 0, 8)) * 20 * u), scale(0.9 + 0.1 * k01(lf, 0, 8))])}} />
      <div style={{position: 'absolute', left: r[3] * 0.2, top: r[3] / 2 - r[3] * 0.08, width: r[3] * 0.16, height: r[3] * 0.16, borderRadius: 99, background: HUE.coral, opacity: k}} />
      <div style={{position: 'absolute', left: r[3] * 0.5, top: r[3] / 2 - fs * 0.62, ...type(st, fs, '#FFFFFF'), opacity: k01(lf, 18, 28), clipPath: `inset(0 ${(1 - k01(lf, 18, 32)) * 100}% 0 0)`}}>{text}</div>
      {it.sub && <div style={{position: 'absolute', right: r[3] * 0.2, top: r[3] / 2 - fs * 0.18, ...caps(st, fs * 0.3, st.accentHi), opacity: k01(lf, 24, 32)}}>{it.sub}</div>}
    </Box>
  );
};
export default Chip;
