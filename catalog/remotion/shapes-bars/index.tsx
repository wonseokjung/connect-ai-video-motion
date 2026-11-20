// Bars (@remotion/shapes makeRect) rise one after another to the values you said; the last bar is the accent.
import React from 'react';
import {makeRect} from '@remotion/shapes';
import {Box, GraphicProps, HUE, caps, exitK, fit, k01, type} from '../../../src/catalog/ui';

const ShapesBars: React.FC<GraphicProps> = ({it, r, lf, dur, st, ink, scrim, u}) => {
  const vals = String(it.value ?? '2,4,7').split(/[,\s]+/).map(Number).filter((x) => Number.isFinite(x));
  const max = Math.max(...vals, 1);
  const n = vals.length;
  const labH = r[3] * 0.2;
  const bw = (r[2] / n) * 0.62, gap = (r[2] / n) * 0.38;
  const out = exitK(lf, dur);
  const cols = [HUE.blue, HUE.teal, HUE.leaf, HUE.violet];
  return (
    <Box r={r} scrim={scrim} u={u} style={{opacity: 1 - out}}>
      {vals.map((v, i) => {
        const k = k01(lf, 2 + i * 5, 18 + i * 5);
        const h = Math.max(1, (r[3] - labH * 1.6) * (v / max) * k);
        const rect = makeRect({width: bw, height: h, cornerRadius: Math.min(bw * 0.18, h / 2)});
        const last = i === n - 1;
        const fs = fit(String(v), bw * 1.2, labH * 0.9, st.weight, st.tracking);
        return (
          <React.Fragment key={i}>
            <svg width={bw} height={h} style={{position: 'absolute', left: i * (bw + gap) + gap / 2, top: r[3] - labH * 0.6 - h}}>
              <path d={rect.path} fill={last ? st.accent : cols[i % cols.length]} fillOpacity={last ? 1 : 0.75} />
            </svg>
            <div style={{position: 'absolute', left: i * (bw + gap) + gap / 2, width: bw, textAlign: 'center', top: r[3] - labH * 0.6 - h - fs * 1.25, ...type(st, fs, ink), opacity: k}}>{v}</div>
          </React.Fragment>
        );
      })}
      <div style={{position: 'absolute', left: 0, right: 0, top: r[3] - labH * 0.6, height: Math.max(1, 1.5 * u), background: ink, opacity: 0.4 * k01(lf, 0, 10)}} />
      {it.text && <div style={{position: 'absolute', left: 0, top: r[3] - labH * 0.45, ...caps(st, labH * 0.32, st.accentHi), opacity: k01(lf, 14, 24)}}>{it.text}</div>}
    </Box>
  );
};
export default ShapesBars;
