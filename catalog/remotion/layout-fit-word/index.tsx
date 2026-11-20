// One word, as big as the empty place allows (@remotion/layout-utils fitText), cut out of a gold slab that slides away.
import React from 'react';
import {fitText} from '@remotion/layout-utils';
import {Box, FONT, GraphicProps, exitK, k01, textOf, IN} from '../../../src/catalog/ui';

const FitWord: React.FC<GraphicProps> = ({it, r, lf, dur, st, ink, scrim, u}) => {
  const text = textOf(it, 'BIG').toUpperCase();
  let fs = r[3] * 0.8;
  try { fs = Math.min(r[3] * 0.86, fitText({text, withinWidth: r[2], fontFamily: FONT, fontWeight: 200, letterSpacing: '-0.03em', validateFontIsLoaded: false}).fontSize); } catch {}
  const slab = k01(lf, 6, 20, IN), out = exitK(lf, dur);
  return (
    <Box r={r} scrim={scrim} u={u} style={{opacity: 1 - out, overflow: 'hidden'}}>
      <div style={{position: 'absolute', left: 0, top: (r[3] - fs) / 2, fontFamily: FONT, fontWeight: 200, fontSize: fs, lineHeight: 1, letterSpacing: '-0.03em', color: ink, whiteSpace: 'nowrap'}}>{text}</div>
      <div style={{position: 'absolute', left: 0, top: 0, width: r[2], height: r[3], background: st.accent, transform: `translateX(${slab * 102}%)`, opacity: k01(lf, 0, 3)}} />
    </Box>
  );
};
export default FitWord;
