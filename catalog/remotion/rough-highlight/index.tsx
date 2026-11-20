// A highlighter pen (@remotion/rough-notation Highlight) sweeps behind the word in a subject colour.
import React from 'react';
import {Highlight} from '@remotion/rough-notation';
import {Box, GraphicProps, HUE, exitK, fit, hueOf, k01, textOf, type} from '../../../src/catalog/ui';

const RoughHighlight: React.FC<GraphicProps> = ({it, r, lf, dur, st, ink, scrim, u}) => {
  const text = textOf(it, 'Key');
  const fs = fit(text, r[2] * 0.9, r[3] * 0.62, st.weight, st.tracking);
  const out = exitK(lf, dur);
  const col = hueOf(it, HUE.coral);
  return (
    <Box r={r} scrim={scrim} u={u} style={{opacity: 1 - out, display: 'flex', alignItems: 'center'}}>
      <div style={{position: 'relative', marginLeft: fs * 0.1}}>
        <Highlight progress={k01(lf, 4, 20)} color={col + 'AA'} seed={7} iterations={2} padding={{left: fs * 0.12, right: fs * 0.12, top: 0, bottom: 0}}>
          <span style={{...type(st, fs, ink), position: 'relative', opacity: k01(lf, 0, 6)}}>{text}</span>
        </Highlight>
      </div>
    </Box>
  );
};
export default RoughHighlight;
