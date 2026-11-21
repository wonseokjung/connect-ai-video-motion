// Point at something: a thin ray leaves your index finger tip and ends at a card in empty space. The card is placed
// like any box (clear of face and body); the ray start follows the finger frame by frame.
import React from 'react';
import {Box, GraphicProps, HUE, caps, exitK, fit, hueOf, k01, type} from '../../../src/catalog/ui';

const PointRay: React.FC<GraphicProps> = ({it, r, lf, dur, st, ink, scrim, u, L, mainF}) => {
  const tips = L?.tips;
  const i = (mainF ?? 0) - (L?.f0 ?? 0);
  // last known tip within 8 frames keeps the ray steady through short losses
  let tip: number[] | null = null;
  for (let q = i; q >= Math.max(0, i - 8) && tips; q--) if (tips[q]) { tip = tips[q]; break; }
  const col = hueOf(it, HUE.teal);
  const text = String(it.text || 'Over here');
  const fs = fit(text, r[2] * 0.84, r[3] * 0.4, st.weight, st.tracking);
  const k = k01(lf, 0, 12), out = exitK(lf, dur);
  const cx = r[0] + r[2] / 2, cy = r[1] + r[3] / 2;
  const ex = tip ? (tip[0] < r[0] ? r[0] : tip[0] > r[0] + r[2] ? r[0] + r[2] : cx) : cx;
  const ey = tip ? (tip[0] >= r[0] && tip[0] <= r[0] + r[2] ? (tip[1] < cy ? r[1] : r[1] + r[3]) : cy) : cy;
  return (
    <>
      {tip && (
        <svg style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}} width={1} height={1}>
          {/* a glowing ray: reads at thumbnail size too */}
          <line x1={tip[0]} y1={tip[1]} x2={tip[0] + (ex - tip[0]) * k} y2={tip[1] + (ey - tip[1]) * k} stroke={col} strokeWidth={4 * u} strokeLinecap="round" strokeDasharray={`${12 * u} ${7 * u}`} strokeDashoffset={-lf * 1.5 * u} opacity={1 - out} style={{filter: `drop-shadow(0 0 ${8 * u}px ${col})`}} />
          <circle cx={tip[0]} cy={tip[1]} r={9 * u * (1 + 0.15 * Math.sin(lf / 3))} fill={col} fillOpacity={0.25} stroke={col} strokeWidth={2.5 * u} opacity={1 - out} style={{filter: `drop-shadow(0 0 ${8 * u}px ${col})`}} />
        </svg>
      )}
      <Box r={r} scrim={scrim} u={u} style={{opacity: k01(lf, 6, 14) * (1 - out)}}>
        <div style={{position: 'absolute', inset: 0, borderRadius: 10 * u, border: `1.5px solid ${col}`, background: 'rgba(11,10,9,0.5)'}} />
        {it.sub && <div style={{position: 'absolute', left: r[2] * 0.08, top: r[3] * 0.12, ...caps(st, Math.max(9, fs * 0.3), col)}}>{String(it.sub)}</div>}
        <div style={{position: 'absolute', left: r[2] * 0.08, top: it.sub ? r[3] * 0.4 : (r[3] - fs * 1.1) / 2, ...type(st, fs, ink)}}>{text}</div>
      </Box>
    </>
  );
};
export default PointRay;
