// A message bubble whose rounded outline hugs each line (@remotion/rounded-text-box + @remotion/layout-utils measureText).
import React from 'react';
import {createRoundedTextBox} from '@remotion/rounded-text-box';
import {measureText} from '@remotion/layout-utils';
import {Box, FONT, GraphicProps, HUE, exitK, fit, hueOf, k01, type} from '../../../src/catalog/ui';

const RoundedMessage: React.FC<GraphicProps> = ({it, r, lf, dur, st, scrim, u}) => {
  const words = String(it.text || 'Hello there').split(/\s+/);
  const lines = words.length > 2 ? [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')] : [words.join(' ')];
  const lh = (r[3] * 0.8) / lines.length;
  const fs = fit(lines.reduce((a, b) => (a.length > b.length ? a : b)), r[2] * 0.86, lh * 0.78, 300, st.tracking);
  const ms = lines.map((l) => ({width: measureText({text: l, fontFamily: FONT, fontSize: fs, fontWeight: 300, letterSpacing: `${st.tracking}em`, validateFontIsLoaded: false}).width * 1.08 + fs * 0.2, height: fs * 1.4}));
  const box = createRoundedTextBox({textMeasurements: ms, textAlign: 'left', horizontalPadding: fs * 0.5, borderRadius: fs * 0.5});
  const bw = box.boundingBox.width, bh = box.boundingBox.height;
  const k = k01(lf, 0, 12), out = exitK(lf, dur);
  const col = hueOf(it, HUE.blue);
  return (
    <Box r={r} scrim={scrim} u={u} style={{opacity: (1 - out) * Math.min(1, k * 2), transform: `translateY(${(1 - k) * 24 * u}px) scale(${0.94 + 0.06 * k})`, transformOrigin: '0 100%'}}>
      <svg width={bw} height={bh} viewBox={`${box.boundingBox.x1} ${box.boundingBox.y1} ${bw} ${bh}`} style={{position: 'absolute', left: 0, top: (r[3] - bh) / 2, overflow: 'visible'}}>
        <path d={box.d} fill={col} />
      </svg>
      <div style={{position: 'absolute', left: fs * 0.5, top: (r[3] - bh) / 2}}>
        {lines.map((l, i) => <div key={i} style={{...type(st, fs, '#FFFFFF', 300), height: fs * 1.4, display: 'flex', alignItems: 'center', opacity: k01(lf, 6 + i * 4, 12 + i * 4)}}>{l}</div>)}
      </div>
    </Box>
  );
};
export default RoundedMessage;
