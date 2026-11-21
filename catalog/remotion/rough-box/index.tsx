// A sketchy box (@remotion/rough-notation Box) is drawn around the word twice, like a quick pen mark on a whiteboard.
// "card": true sets the word on a solid card first, for a busy screen (a web page, a picture) behind it.
import React from 'react';
import {Box as RoughBoxMark} from '@remotion/rough-notation';
import {Box, GraphicProps, exitK, fit, k01, textOf, type} from '../../../src/catalog/ui';

const RoughBox: React.FC<GraphicProps> = ({it, r, lf, dur, st, ink, scrim, u}) => {
  const text = textOf(it, 'Rule');
  const fs = fit(text, r[2] * 0.78, r[3] * 0.5, st.weight, st.tracking);
  const out = exitK(lf, dur);
  const card = !!it.card;
  const col = card ? st.ink : ink;
  return (
    <Box r={r} scrim={card ? 0 : scrim} u={u} style={{opacity: 1 - out, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      {card && <div style={{position: 'absolute', inset: 0, background: st.cardBg, borderRadius: st.radius * u, boxShadow: `0 ${18 * u}px ${50 * u}px rgba(0,0,0,0.45)`, opacity: k01(lf, 0, 8)}} />}
      <RoughBoxMark progress={k01(lf, 6, 26)} color={st.accent} seed={11} iterations={2} strokeWidth={2 * u} padding={{left: fs * 0.3, right: fs * 0.3, top: fs * 0.15, bottom: fs * 0.15}}>
        <span style={{...type(st, fs, col), display: 'inline-block', transform: `translateY(${(1 - k01(lf, 0, 12)) * 20 * u}px)`, opacity: k01(lf, 0, 8)}}>{text}</span>
      </RoughBoxMark>
    </Box>
  );
};
export default RoughBox;
