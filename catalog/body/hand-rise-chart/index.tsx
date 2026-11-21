// A live chart of your hand: the line is the real height of your raised hand, measured frame by frame, drawn as it
// happens next to the hand. Raise the hand, the line climbs. The number is the hand's height in % of the frame.
import React from 'react';
import {GraphicProps, caps, exitK, fit, hueOf, k01, type} from '../../../src/catalog/ui';

const HandRiseChart: React.FC<GraphicProps> = ({it, r, lf, dur, st, ink, u, L, mainF, H}) => {
  const i0 = (mainF ?? 0) - (L?.f0 ?? 0);
  const track = (L?.track || []) as any[];
  const col = hueOf(it, '#A3FF5C'), col2 = '#2EE6D6';
  const out = exitK(lf, dur);
  const N = Math.max(2, dur);
  const pts: [number, number][] = [];
  let last = null as any;
  for (let i = 0; i <= i0 && i < track.length; i++) {
    const t = track[i];
    if (t?.anchor) last = t.anchor;
    if (last) pts.push([i, 1 - last[1] / H]);
  }
  const w = r[2], h = r[3];
  const top = h * 0.3, bot = h * 0.94, gx = w * 0.02;
  const x = (i: number) => gx + (i / N) * (w - gx * 2);
  // the axis follows what the hand really did: lowest to highest height seen so far (at least 15 % of the frame)
  const vs = pts.map((p) => p[1]);
  const mid = vs.length ? (Math.min(...vs) + Math.max(...vs)) / 2 : 0.5;
  const span = Math.max(0.15, vs.length ? Math.max(...vs) - Math.min(...vs) + 0.06 : 0.15);
  const lo = mid - span / 2;
  const y = (v: number) => bot - Math.max(0, Math.min(1, (v - lo) / span)) * (bot - top);
  const d = pts.map(([i, v], n) => `${n ? 'L' : 'M'} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const area = pts.length ? `${d} L ${x(pts[pts.length - 1][0]).toFixed(1)} ${bot} L ${x(pts[0][0]).toFixed(1)} ${bot} Z` : '';
  const now = pts[pts.length - 1];
  const pct = now ? Math.round(now[1] * 100) : 0;
  const text = it.text ? String(it.text) : 'Hand height';
  const fs = fit(text, w * 0.62, h * 0.12, st.weight, st.tracking);
  const nfs = h * 0.2;
  const k = k01(lf, 0, 10);
  const a = track[i0]?.anchor;
  return (
    <>
      {a && now && (
        <svg style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}} width={1} height={1}>
          <line x1={r[0] + x(now[0])} y1={r[1] + y(now[1])} x2={a[0]} y2={a[1]} stroke={col} strokeWidth={1.5 * u} strokeDasharray={`${4 * u} ${6 * u}`} opacity={0.6 * k * (1 - out)} />
        </svg>
      )}
      <div style={{position: 'absolute', left: r[0], top: r[1], width: w, height: h, opacity: k * (1 - out), background: 'linear-gradient(160deg, rgba(10,14,30,0.72), rgba(10,14,30,0.35))', borderRadius: 14 * u, border: `1px solid rgba(163,255,92,0.35)`, boxShadow: `0 0 ${24 * u}px rgba(46,230,214,0.18)`}}>
        <svg width={w} height={h} style={{position: 'absolute', left: 0, top: 0}}>
          <defs>
            <linearGradient id="hrcA" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={col} stopOpacity={0.55} />
              <stop offset="1" stopColor={col2} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="hrcL" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor={col2} />
              <stop offset="1" stopColor={col} />
            </linearGradient>
          </defs>
          {[0, 1, 2, 3].map((g) => <line key={g} x1={gx} x2={w - gx} y1={top + (g / 3) * (bot - top)} y2={top + (g / 3) * (bot - top)} stroke="rgba(255,255,255,0.12)" strokeWidth={1} />)}
          {area && <path d={area} fill="url(#hrcA)" />}
          {d && <path d={d} fill="none" stroke="url(#hrcL)" strokeWidth={3.5 * u} strokeLinejoin="round" strokeLinecap="round" style={{filter: `drop-shadow(0 0 ${6 * u}px ${col})`}} />}
          {now && <circle cx={x(now[0])} cy={y(now[1])} r={6 * u} fill="#fff" style={{filter: `drop-shadow(0 0 ${8 * u}px ${col})`}} />}
        </svg>
        <div style={{position: 'absolute', left: w * 0.05, top: h * 0.05, ...caps(st, fs * 0.55, col2)}}>{text}</div>
        <div style={{position: 'absolute', right: w * 0.05, top: h * 0.02, ...type(st, nfs, ink, 600), fontVariantNumeric: 'tabular-nums'}}>{pct}<span style={{fontSize: nfs * 0.45, color: col}}>%</span></div>
      </div>
    </>
  );
};
export default HandRiseChart;
