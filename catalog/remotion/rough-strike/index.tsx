// Old word, struck out (@remotion/rough-notation StrikeThrough); the new word comes in under it.
import React from 'react';
import {StrikeThrough} from '@remotion/rough-notation';
import {Box, GraphicProps, HUE, exitK, fit, k01, type} from '../../../src/catalog/ui';

const RoughStrike: React.FC<GraphicProps> = ({it, r, lf, dur, st, ink, scrim, u}) => {
  const old = String(it.text || 'Install'), now = String(it.sub || '');
  const fs = fit(old.length > now.length ? old : now, r[2] * 0.9, r[3] * (now ? 0.42 : 0.6), st.weight, st.tracking);
  const out = exitK(lf, dur);
  const strike = k01(lf, 8, 20);
  return (
    <Box r={r} scrim={scrim} u={u} style={{opacity: 1 - out}}>
      <div style={{position: 'absolute', left: 0, top: now ? r[3] * 0.06 : r[3] / 2 - fs * 0.6, opacity: 1 - strike * 0.45}}>
        <StrikeThrough progress={strike} color={HUE.coral} seed={3} iterations={1} strokeWidth={Math.max(3, fs * 0.08)}>
          <span style={{...type(st, fs, ink), opacity: k01(lf, 0, 6)}}>{old}</span>
        </StrikeThrough>
      </div>
      {now && (
        <div style={{position: 'absolute', left: 0, top: r[3] * 0.52, height: fs * 1.2, overflow: 'hidden'}}>
          <div style={{...type(st, fs, st.accentHi), transform: `translateY(${(1 - k01(lf, 18, 30)) * 100}%)`}}>{now}</div>
        </div>
      )}
    </Box>
  );
};
export default RoughStrike;
