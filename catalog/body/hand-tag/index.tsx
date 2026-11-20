// A small tag that stays next to your hand while you hold it up, with a thin leader to the hand. It never sits on
// the person: the layout picks a side of the hand that is clear of the body, frame by frame, and keeps that side.
import React from 'react';
import {Box, GraphicProps, HUE, caps, exitK, fit, hueOf, k01, type} from '../../../src/catalog/ui';

const HandTag: React.FC<GraphicProps> = ({it, r, lf, dur, st, ink, scrim, u, L, mainF}) => {
  const tr = L?.track?.[(mainF ?? 0) - (L?.f0 ?? 0)];
  const col = hueOf(it, HUE.gold);
  const text = String(it.text || 'This one');
  const fs = fit(text, r[2] * 0.84, r[3] * 0.5, st.weight, st.tracking);
  const k = k01(lf, 0, 10), out = exitK(lf, dur);
  const a = tr?.anchor;
  // leader from the card edge nearest the hand to the hand centre
  const ex = a ? Math.max(r[0], Math.min(r[0] + r[2], a[0])) : 0, ey = a ? Math.max(r[1], Math.min(r[1] + r[3], a[1])) : 0;
  return (
    <>
      {a && (
        <svg style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}} width={1} height={1}>
          <line x1={ex} y1={ey} x2={ex + (a[0] - ex) * 0.55 * k} y2={ey + (a[1] - ey) * 0.55 * k} stroke={col} strokeWidth={1.5 * u} opacity={0.9 * (1 - out)} />
          <circle cx={ex} cy={ey} r={3 * u} fill={col} opacity={1 - out} />
        </svg>
      )}
      <Box r={r} scrim={scrim} u={u} style={{opacity: k * (1 - out), transform: `scale(${0.92 + 0.08 * k})`}}>
        <div style={{position: 'absolute', inset: 0, borderLeft: `2px solid ${col}`, background: 'linear-gradient(90deg, rgba(11,10,9,0.55), rgba(11,10,9,0))'}} />
        {it.sub && <div style={{position: 'absolute', left: r[2] * 0.08, top: r[3] * 0.12, ...caps(st, Math.max(9, fs * 0.3), col)}}>{String(it.sub)}</div>}
        <div style={{position: 'absolute', left: r[2] * 0.08, top: it.sub ? r[3] * 0.38 : (r[3] - fs * 1.1) / 2, ...type(st, fs, ink)}}>{text}</div>
      </Box>
    </>
  );
};
export default HandTag;
