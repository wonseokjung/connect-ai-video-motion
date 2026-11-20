// A short list held by a rough curly bracket (@remotion/rough-notation Bracket); the lines come in one by one.
import React from 'react';
import {Bracket} from '@remotion/rough-notation';
import {Box, GraphicProps, exitK, fit, k01, type} from '../../../src/catalog/ui';

const BracketList: React.FC<GraphicProps> = ({it, r, lf, dur, st, ink, scrim, u}) => {
  const lines = String(it.text || 'One, Two, Three').split(/\s*[,/|]\s*/).filter(Boolean).slice(0, 4);
  const lh = r[3] / (lines.length + 0.4);
  const fs = fit(lines.reduce((a, b) => (a.length > b.length ? a : b), ''), r[2] * 0.8, lh * 0.66, st.weight, st.tracking);
  const out = exitK(lf, dur);
  return (
    <Box r={r} scrim={scrim} u={u} style={{opacity: 1 - out}}>
      <div style={{position: 'absolute', left: r[2] * 0.12, top: lh * 0.2}}>
        <Bracket progress={k01(lf, 0, 16)} color={st.accent} seed={5} bracketLeft strokeWidth={2 * u} padding={{left: fs * 0.4, right: 0, top: 4 * u, bottom: 4 * u}}>
          <div>
            {lines.map((l, i) => (
              <div key={i} style={{...type(st, fs, ink), height: lh, display: 'flex', alignItems: 'center', opacity: k01(lf, 8 + i * 6, 16 + i * 6), transform: `translateX(${(1 - k01(lf, 8 + i * 6, 18 + i * 6)) * 24 * u}px)`}}>
                <span style={{color: st.accentHi, fontSize: fs * 0.5, marginRight: fs * 0.3, fontVariantNumeric: 'tabular-nums'}}>{String(i + 1).padStart(2, '0')}</span>
                {l}
              </div>
            ))}
          </div>
        </Bracket>
      </div>
    </Box>
  );
};
export default BracketList;
