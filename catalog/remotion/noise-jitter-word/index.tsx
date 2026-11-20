// Letters arrive shaken by noise (@remotion/noise noise3D) and settle one by one into a clean word.
import React from 'react';
import {noise3D} from '@remotion/noise';
import {Box, GraphicProps, exitK, fit, k01, type} from '../../../src/catalog/ui';

const NoiseJitterWord: React.FC<GraphicProps> = ({it, r, lf, dur, st, ink, scrim, u}) => {
  const text = String(it.text || 'Signal');
  const fs = fit(text, r[2] * 0.94, r[3] * 0.7, st.weight, st.tracking);
  const out = exitK(lf, dur);
  const chars = [...text];
  return (
    <Box r={r} scrim={scrim} u={u} style={{opacity: 1 - out}}>
      <div style={{position: 'absolute', left: 0, top: (r[3] - fs * 1.15) / 2, ...type(st, fs, ink), display: 'flex'}}>
        {chars.map((c, i) => {
          const settle = 1 - k01(lf, 4 + i * 2, 18 + i * 2);
          const a = fs * 0.35 * settle;
          const dx = noise3D('x', i * 0.7, lf * 0.12, 0) * a, dy = noise3D('y', i * 0.7, lf * 0.12, 0) * a;
          const hot = settle > 0.02;
          return (
            <span key={i} style={{display: 'inline-block', whiteSpace: 'pre', transform: `translate(${dx}px, ${dy}px) rotate(${noise3D('r', i, lf * 0.1, 0) * 18 * settle}deg)`, color: hot ? st.accentHi : ink, opacity: k01(lf, i * 1.5, i * 1.5 + 6)}}>
              {c}
            </span>
          );
        })}
      </div>
    </Box>
  );
};
export default NoiseJitterWord;
