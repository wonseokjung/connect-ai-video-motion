// A sketchy box (@remotion/rough-notation Box) is drawn around the word twice, like a quick pen mark on a whiteboard.
import React from 'react';
import {Box as RoughBoxMark} from '@remotion/rough-notation';
import {Box, GraphicProps, exitK, fit, k01, textOf, type} from '../../../src/catalog/ui';

const RoughBox: React.FC<GraphicProps> = ({it, r, lf, dur, st, ink, scrim, u}) => {
  const text = textOf(it, 'Rule');
  const fs = fit(text, r[2] * 0.78, r[3] * 0.5, st.weight, st.tracking);
  const out = exitK(lf, dur);
  return (
    <Box r={r} scrim={scrim} u={u} style={{opacity: 1 - out, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      <RoughBoxMark progress={k01(lf, 6, 26)} color={st.accent} seed={11} iterations={2} strokeWidth={2 * u} padding={{left: fs * 0.3, right: fs * 0.3, top: fs * 0.15, bottom: fs * 0.15}}>
        <span style={{...type(st, fs, ink), display: 'inline-block', transform: `translateY(${(1 - k01(lf, 0, 12)) * 20 * u}px)`, opacity: k01(lf, 0, 8)}}>{text}</span>
      </RoughBoxMark>
    </Box>
  );
};
export default RoughBox;
