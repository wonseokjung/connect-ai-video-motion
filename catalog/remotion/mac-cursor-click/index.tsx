// A real macOS cursor glides to a button and clicks it; the button presses and its label answers (@remotion/mac-cursors).
import React from 'react';
import {MacOSCursor} from '@remotion/mac-cursors';
import {Box, GraphicProps, OUT, caps, exitK, fit, k01, type} from '../../../src/catalog/ui';

const MacCursorClick: React.FC<GraphicProps> = ({it, r, lf, dur, st, ink, scrim, u}) => {
  const [w, h] = [r[2], r[3]];
  const label = String(it.text || 'Render');
  const bw = w * 0.62, bh = h * 0.42, bx = w * 0.04, by = (h - bh) / 2;
  const fs = fit(label, bw * 0.7, bh * 0.62, st.weight, st.tracking);
  const move = k01(lf, 4, 26, OUT);
  const click = lf >= 28 && lf < 34;
  const done = k01(lf, 32, 40);
  const cx = w * 0.98 + (bx + bw * 0.62 - w * 0.98) * move, cy = h * 0.95 + (by + bh * 0.6 - h * 0.95) * move;
  const s = Math.max(1.2, h / 70);
  return (
    <Box r={r} scrim={scrim} u={u} style={{opacity: k01(lf, 0, 8) * (1 - exitK(lf, dur))}}>
      <div style={{position: 'absolute', left: bx, top: by, width: bw, height: bh, borderRadius: bh / 2, background: done > 0 ? `rgba(214,137,42,${0.18 + 0.7 * done})` : 'rgba(235,226,210,0.08)', border: `1.5px solid ${st.accent}`, transform: `scale(${click ? 0.95 : 1})`, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <span style={{...type(st, fs, done > 0.5 ? '#0B0A09' : ink)}}>{label}</span>
      </div>
      {it.sub && <div style={{position: 'absolute', left: bx + bw + 16 * u, top: h / 2 - fs * 0.2, ...caps(st, Math.max(10, fs * 0.36), st.accentHi), opacity: done}}>{String(it.sub)}</div>}
      <div style={{position: 'absolute', left: cx, top: cy, transform: `scale(${s * (click ? 0.9 : 1)})`, transformOrigin: '0 0'}}>
        <MacOSCursor cursor={move > 0.85 ? 'pointer' : 'default'} />
      </div>
    </Box>
  );
};
export default MacCursorClick;
