// Energy between your hands: three strands of light (gold, teal, violet) run from one palm to the other and bend
// with the real distance and height of both hands. They are drawn BEHIND you: the strands pass behind your body and
// show on both sides, so it reads as a field you hold in the room (from the live two-hand grab). A light disc sits
// behind each palm. With only one hand in view the field waits as a disc behind that hand.
import React from 'react';
import {GraphicProps, HUE, exitK, hueOf, k01} from '../../../src/catalog/ui';
import {Pt, hash, palmOf, rigAt, label} from '../../../src/catalog/rig';

const HandArc: React.FC<GraphicProps> = ({it, lf, dur, st, u, L, mainF, W}) => {
  const i = (mainF ?? 0) - (L?.f0 ?? 0);
  const r = rigAt(L, i, 4);
  const out = exitK(lf, dur, 14);
  const k = k01(lf, 0, 18);
  const cols = [hueOf(it, HUE.goldHi), HUE.teal, HUE.violet];
  const hs = (r?.hands || []).map((h) => ({side: h.side, p: palmOf(h) as Pt, w: h.box[2]})).filter((h) => h.p).sort((a, b) => a.p[0] - b.p[0]);
  if (!hs.length) return null;
  const A = hs[0], B = hs[hs.length - 1];
  const two = hs.length > 1 && Math.abs(B.p[0] - A.p[0]) > 80 * u;
  const strands: React.ReactNode[] = [];
  if (two) {
    const dx = B.p[0] - A.p[0], dy = B.p[1] - A.p[1];
    const len = Math.hypot(dx, dy), nx = -dy / len, ny = dx / len;
    cols.forEach((c, s) => {
      const pts: Pt[] = [];
      const n = 48;
      for (let q = 0; q <= n; q++) {
        const t = q / n;
        const env = Math.sin(Math.PI * t); // pinned at both palms
        // smooth waves + a little crackle, all from time and position (same frame = same picture)
        const wave = Math.sin(t * (5 + s * 2) * Math.PI - lf * (0.35 + s * 0.12) + s * 2) * (30 + 18 * s) * u;
        const crackle = (hash(q * 7 + s * 131 + Math.floor(lf / 2) * 17) - 0.5) * 22 * u;
        const bow = -len * 0.12 * (s === 1 ? -0.6 : 1); // gold and violet bow up, teal bows down
        const off = env * (wave + crackle + bow) * k;
        pts.push([A.p[0] + dx * t + nx * off, A.p[1] + dy * t + ny * off]);
      }
      const d = 'M' + pts.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' L');
      strands.push(
        <g key={s}>
          <path d={d} fill="none" stroke={c} strokeWidth={26 * u} opacity={0.5} filter="url(#haGlow)" />
          <path d={d} fill="none" stroke={c} strokeWidth={6 * u} strokeLinejoin="round" />
          <path d={d} fill="none" stroke="#FFFFFF" strokeWidth={2 * u} opacity={0.9} />
        </g>,
      );
    });
  }
  const disc = (p: Pt, w: number, q: number) => {
    const R = Math.max(60 * u, w * 0.9) * (0.6 + 0.4 * k) * (1 + 0.06 * Math.sin(lf / 3 + q));
    return (
      <g key={q}>
        <circle cx={p[0]} cy={p[1]} r={R * 1.5} fill="url(#haDisc)" />
        <circle cx={p[0]} cy={p[1]} r={R} fill="none" stroke={cols[0]} strokeWidth={2.5 * u} strokeDasharray={`${R * 0.5} ${R * 0.2}`} transform={`rotate(${lf * 4 * (q ? -1 : 1)} ${p[0]} ${p[1]})`} />
        <circle cx={p[0]} cy={p[1]} r={R * 1.25} fill="none" stroke={cols[1]} strokeWidth={1.5 * u} opacity={0.7} />
      </g>
    );
  };
  const top = two ? (A.p[1] < B.p[1] ? A : B) : A;
  return (
    <div style={{position: 'absolute', inset: 0, opacity: 1 - out}}>
      <svg style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}} width={1} height={1}>
        <defs>
          <filter id="haGlow" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation={9 * u} /></filter>
          <radialGradient id="haDisc">
            <stop offset="0" stopColor="#FFFFFF" stopOpacity={0.85} />
            <stop offset="0.3" stopColor={cols[0]} stopOpacity={0.55} />
            <stop offset="1" stopColor={cols[2]} stopOpacity={0} />
          </radialGradient>
        </defs>
        {strands}
        {(two ? [A, B] : [A]).map((h, q) => disc(h.p, h.w, q))}
      </svg>
      {it.text && (
        <div style={{position: 'absolute', left: Math.max(40 * u, Math.min((W ?? 1920) - 400 * u, top.p[0] + (top === A ? -420 * u : 60 * u))), top: Math.max(40 * u, top.p[1] - 300 * u), width: 360 * u, textAlign: top === A ? 'right' : 'left', ...label(u, st, 26 * u, cols[0]), textShadow: `0 0 ${16 * u}px ${cols[0]}`, opacity: k01(lf, 12, 24)}}>{String(it.text)}</div>
      )}
    </div>
  );
};
export default HandArc;
