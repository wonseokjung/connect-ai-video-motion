// Hold up 1, 2 or 3 fingers: the number you show is stamped next to your hand (finger count from the hand points),
// with the matching line from "text" (comma list: "Plan, Make, Check" -> 2 fingers = Make).
import React from 'react';
import {Box, GraphicProps, SNAP, caps, exitK, fit, k01, type} from '../../../src/catalog/ui';

const FingerCount: React.FC<GraphicProps> = ({it, r, lf, dur, st, ink, scrim, u, L, mainF}) => {
  const tr = L?.track?.[(mainF ?? 0) - (L?.f0 ?? 0)];
  const n = Math.max(1, Math.min(5, tr?.count || Number(it.value) || 1));
  const list = String(it.text || '').split(',').map((x) => x.trim()).filter(Boolean);
  const line = list[n - 1] || '';
  // re-stamp when the count changes: find how long this count has been shown
  let since = 0;
  for (let i = (mainF ?? 0) - (L?.f0 ?? 0); i >= 0 && L?.track?.[i] && (L.track[i].count || 1) === n; i--) since++;
  const k = k01(since, 0, 9, SNAP), out = exitK(lf, dur);
  const D = Math.min(r[3], r[2] * 0.42);
  const fs = fit(line || 'x', r[2] - D - 14 * u, D * 0.46, st.weight, st.tracking);
  return (
    <Box r={r} scrim={scrim} u={u} style={{opacity: k01(lf, 0, 6) * (1 - out)}}>
      <svg width={D} height={D} style={{position: 'absolute', left: 0, top: (r[3] - D) / 2, overflow: 'visible'}}>
        <circle cx={D / 2} cy={D / 2} r={D * 0.46} fill="rgba(11,10,9,0.5)" stroke={st.accent} strokeWidth={2 * u} strokeDasharray={`${Math.PI * D * 0.92 * k} 9999`} transform={`rotate(-90 ${D / 2} ${D / 2})`} />
      </svg>
      <div style={{position: 'absolute', left: 0, top: (r[3] - D) / 2, width: D, height: D, display: 'flex', alignItems: 'center', justifyContent: 'center', ...type(st, D * 0.56, ink), transform: `scale(${0.6 + 0.4 * k})`}}>{n}</div>
      {line && <div style={{position: 'absolute', left: D + 14 * u, top: r[3] / 2 - fs * 0.62, ...type(st, fs, ink), opacity: k}}>{line}</div>}
      {it.sub && <div style={{position: 'absolute', left: D + 15 * u, top: r[3] / 2 + fs * 0.5, ...caps(st, Math.max(9, fs * 0.3), st.accentHi), opacity: k}}>{String(it.sub)}</div>}
    </Box>
  );
};
export default FingerCount;
