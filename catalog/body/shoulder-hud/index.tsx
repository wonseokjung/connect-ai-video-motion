// A body HUD beside your shoulder: film-style corner brackets and hairlines (no boxed panel) ride next to your
// shoulder and read your own body live: shoulder tilt, head turn and hand height, measured every frame, with a trace
// of the shoulder line drawn as you move. Your title on top. From the live show's "body HUD beside the shoulder".
import React from 'react';
import {GraphicProps, HUE, caps, exitK, fit, hueOf, k01, type} from '../../../src/catalog/ui';
import {RigFrame, rigAt} from '../../../src/catalog/rig';

const tiltOf = (r: RigFrame | null) => {
  const a = r?.joints.leftShoulder, b = r?.joints.rightShoulder;
  if (!a || !b) return null;
  const [p, q] = a[0] < b[0] ? [a, b] : [b, a];
  return (Math.atan2(q[1] - p[1], q[0] - p[0]) * 180) / Math.PI;
};

const ShoulderHud: React.FC<GraphicProps> = ({it, r, lf, dur, st, ink, u, L, mainF, H}) => {
  const i = (mainF ?? 0) - (L?.f0 ?? 0);
  const tr = L?.track?.[i];
  const a = tr?.anchor;
  const rig = rigAt(L, i, 4);
  const out = exitK(lf, dur), k = k01(lf, 0, 14);
  const gold = hueOf(it, HUE.goldHi), teal = HUE.teal, coral = HUE.coral, violet = HUE.violet;
  const J = rig?.joints || {};
  const tilt = tiltOf(rig);
  const turn = J.nose && J.neck && J.leftShoulder && J.rightShoulder ? ((J.nose[0] - J.neck[0]) / Math.max(1, Math.abs(J.leftShoulder[0] - J.rightShoulder[0]))) * 100 : null;
  const handY = rig?.hands.length ? Math.min(...rig.hands.map((h) => h.box[1] + h.box[3] / 2)) : null;
  const handPct = handY != null ? Math.round((1 - handY / H) * 100) : null;
  // the shoulder line over time, newest on the right
  const hist: number[] = [];
  for (let q = Math.max(0, i - 50); q <= i; q++) { const t = tiltOf(rigAt(L, q, 2)); if (t != null) hist.push(t); }
  const w = r[2], h = r[3], pad = w * 0.06;
  const title = String(it.text || 'Body data');
  const fs = fit(title, w - pad * 2, h * 0.15, st.weight, st.tracking);
  const rows: [string, string, string][] = [
    ['SHOULDER TILT', tilt == null ? '--' : `${tilt > 0 ? '+' : ''}${tilt.toFixed(1)}°`, teal],
    ['HEAD TURN', turn == null ? '--' : `${turn > 0 ? '+' : ''}${Math.round(turn)}%`, coral],
    ['HAND HEIGHT', handPct == null ? '--' : `${handPct}%`, violet],
  ];
  const sx = (q: number) => pad + (q / Math.max(1, hist.length - 1)) * (w - pad * 2);
  const lo = Math.min(-4, ...hist), hi = Math.max(4, ...hist);
  const gy0 = h * 0.8, gy1 = h * 0.96;
  const sy = (v: number) => gy1 - ((v - lo) / (hi - lo)) * (gy1 - gy0);
  const spark = hist.map((v, q) => `${q ? 'L' : 'M'}${sx(q).toFixed(1)},${sy(v).toFixed(1)}`).join(' ');
  const ex = a ? Math.max(r[0], Math.min(r[0] + w, a[0])) : 0, ey = a ? Math.max(r[1], Math.min(r[1] + h, a[1])) : 0;
  const br = 22 * u;
  return (
    <div style={{position: 'absolute', inset: 0, opacity: 1 - out}}>
      {a && (
        <svg style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}} width={1} height={1}>
          <line x1={ex} y1={ey} x2={ex + (a[0] - ex) * 0.5 * k} y2={ey + (a[1] - ey) * 0.5 * k} stroke={gold} strokeWidth={1.5 * u} />
          <circle cx={ex} cy={ey} r={4 * u} fill={gold} />
        </svg>
      )}
      <div style={{position: 'absolute', left: r[0], top: r[1], width: w, height: h, opacity: k, background: 'radial-gradient(ellipse at 30% 40%, rgba(11,10,9,0.45), rgba(11,10,9,0) 75%)'}}>
        {[[0, 0], [1, 0], [0, 1], [1, 1]].map(([x, y], q) => (
          <div key={q} style={{position: 'absolute', left: x ? w - br : 0, top: y ? h - br : 0, width: br, height: br, [x ? 'borderRight' : 'borderLeft']: `2px solid ${gold}`, [y ? 'borderBottom' : 'borderTop']: `2px solid ${gold}`}} />
        ))}
        <div style={{position: 'absolute', left: pad, top: h * 0.06, ...caps(st, Math.max(10, h * 0.04), gold)}}>{it.sub ? String(it.sub) : 'LIVE · MEASURED'}</div>
        <div style={{position: 'absolute', left: pad, top: h * 0.12, ...type(st, fs, ink)}}>{title}</div>
        <div style={{position: 'absolute', left: pad, top: h * 0.29, width: (w - pad * 2) * k01(lf, 4, 20), height: 1, background: `linear-gradient(90deg, ${gold}, transparent)`}} />
        {rows.map(([lab, val, c], q) => (
          <div key={q} style={{position: 'absolute', left: pad, right: pad, top: h * (0.33 + q * 0.145), opacity: k01(lf, 6 + q * 4, 16 + q * 4), display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', borderBottom: '1px solid rgba(235,226,210,0.14)', paddingBottom: 4 * u}}>
            <span style={{...caps(st, Math.max(10, h * 0.04), 'rgba(235,226,210,0.8)')}}><span style={{display: 'inline-block', width: 8 * u, height: 8 * u, borderRadius: '50%', background: c, marginRight: 8 * u, boxShadow: `0 0 ${8 * u}px ${c}`}} />{lab}</span>
            <span style={{...type(st, h * 0.1, c, 400), fontVariantNumeric: 'tabular-nums'}}>{val}</span>
          </div>
        ))}
        <svg width={w} height={h} style={{position: 'absolute', left: 0, top: 0}}>
          <line x1={pad} x2={w - pad} y1={sy(0)} y2={sy(0)} stroke="rgba(235,226,210,0.2)" strokeDasharray={`${3 * u} ${5 * u}`} />
          {spark && <path d={spark} fill="none" stroke={teal} strokeWidth={2.5 * u} style={{filter: `drop-shadow(0 0 ${6 * u}px ${teal})`}} />}
          {hist.length > 0 && <circle cx={sx(hist.length - 1)} cy={sy(hist[hist.length - 1])} r={5 * u} fill="#fff" />}
        </svg>
      </div>
    </div>
  );
};
export default ShoulderHud;
