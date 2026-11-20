// A solid arrow (@remotion/shapes makeArrow) shoots out and settles; the word rides on its shaft.
import React from 'react';
import {makeArrow} from '@remotion/shapes';
import {Box, GraphicProps, HUE, SNAP, exitK, fit, hueOf, k01, textOf, type} from '../../../src/catalog/ui';

const ShapesArrow: React.FC<GraphicProps> = ({it, r, lf, dur, st, scrim, u, W}) => {
  const text = textOf(it, 'Next');
  const dir = it.direction || (r[0] + r[2] / 2 > W / 2 ? 'right' : 'left'); // away from the person by default
  const L = r[2] - 6 * u;
  const a = makeArrow({length: L, headWidth: r[3] * 0.92, headLength: r[3] * 0.62, shaftWidth: r[3] * 0.52, direction: dir === 'left' ? 'left' : 'right', cornerRadius: 4 * u});
  const k = k01(lf, 0, 14, SNAP), out = exitK(lf, dur, 8);
  const col = hueOf(it, HUE.blue);
  const fs = fit(text, L * 0.66, r[3] * 0.44, st.heavy, st.tracking);
  const from = dir === 'left' ? 1 : -1;
  return (
    <Box r={r} scrim={scrim} u={u} style={{opacity: 1 - out, clipPath: `inset(-10% ${dir === 'left' ? 0 : (1 - k) * 100}% -10% ${dir === 'left' ? (1 - k) * 100 : 0}%)`}}>
      <svg width={a.width} height={a.height} style={{position: 'absolute', left: 3 * u, top: (r[3] - a.height) / 2, transform: `translateX(${from * out * -40 * u}px)`}}>
        <path d={a.path} fill={col} />
      </svg>
      <div style={{position: 'absolute', top: r[3] / 2 - fs * 0.6, ...(dir === 'left' ? {right: r[3] * 0.3} : {left: r[3] * 0.3}), ...type(st, fs, '#FFFFFF', st.heavy), opacity: k01(lf, 8, 16)}}>{text}</div>
    </Box>
  );
};
export default ShapesArrow;
