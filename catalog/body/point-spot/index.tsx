// Point and light it up: a cone of light leaves your index finger in the real direction you point (knuckle to tip,
// measured every frame) and lands as a spotlight on the room behind you, with your word inside the light. Drawn
// behind the person matte, so the beam starts behind your finger and never lies on you.
import React from 'react';
import {GraphicProps, HUE, exitK, fit, hueOf, k01, type, OUT} from '../../../src/catalog/ui';
import {Pt, lockSide, pickHand, rigAt, label} from '../../../src/catalog/rig';

const PointSpot: React.FC<GraphicProps> = ({it, lf, dur, st, u, L, mainF, W, H}) => {
  const i = (mainF ?? 0) - (L?.f0 ?? 0);
  const side = lockSide(L, it.hand);
  let tx = 0, ty = 0, dx = 0, dy = 0, n = 0;
  for (let q = i - 4; q <= i + 4; q++) {
    const h = pickHand(rigAt(L, q, 3), side);
    const tip = h?.pts.indexTip, base = h?.pts.indexMCP || h?.pts.wrist;
    if (!tip || !base) continue;
    const l = Math.hypot(tip[0] - base[0], tip[1] - base[1]) || 1;
    tx += tip[0]; ty += tip[1]; dx += (tip[0] - base[0]) / l; dy += (tip[1] - base[1]) / l; n++;
  }
  if (!n) return null;
  const tip: Pt = [tx / n, ty / n];
  const dl = Math.hypot(dx, dy) || 1;
  const d: Pt = [dx / dl, dy / dl];
  const k = k01(lf, 0, 16, OUT), out = exitK(lf, dur, 12);
  const col = hueOf(it, HUE.goldHi), beam = '#FFF4DE', ring = HUE.teal;
  // spot: along the pointing line, kept inside the frame
  const reach = Math.min(W, H) * 0.42 * k;
  const R = Math.min(W, H) * 0.12;
  const sp: Pt = [Math.max(R * 1.3, Math.min(W - R * 1.3, tip[0] + d[0] * reach)), Math.max(R, Math.min(H - R, tip[1] + d[1] * reach))];
  const vx = sp[0] - tip[0], vy = sp[1] - tip[1], vl = Math.hypot(vx, vy) || 1;
  const nx = -vy / vl, ny = vx / vl;
  const w0 = 8 * u, w1 = R * 0.95;
  const cone = `${tip[0] + nx * w0},${tip[1] + ny * w0} ${sp[0] + nx * w1},${sp[1] + ny * w1 * 0.55} ${sp[0] - nx * w1},${sp[1] - ny * w1 * 0.55} ${tip[0] - nx * w0},${tip[1] - ny * w0}`;
  const text = it.text ? String(it.text) : '';
  const fs = text ? fit(text, R * 2.6, R * 0.42, 400, st.tracking) : 0;
  return (
    <div style={{position: 'absolute', inset: 0, opacity: 1 - out}}>
      <svg style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}} width={1} height={1}>
        <defs>
          <linearGradient id="psBeam" gradientUnits="userSpaceOnUse" x1={tip[0]} y1={tip[1]} x2={sp[0]} y2={sp[1]}>
            <stop offset="0" stopColor={beam} stopOpacity={0.8} />
            <stop offset="0.7" stopColor={col} stopOpacity={0.28} />
            <stop offset="1" stopColor={col} stopOpacity={0.12} />
          </linearGradient>
          <radialGradient id="psPool">
            <stop offset="0" stopColor={beam} stopOpacity={0.75} />
            <stop offset="0.45" stopColor={col} stopOpacity={0.4} />
            <stop offset="1" stopColor={col} stopOpacity={0} />
          </radialGradient>
          <filter id="psSoft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation={10 * u} /></filter>
        </defs>
        <polygon points={cone} fill="url(#psBeam)" filter="url(#psSoft)" />
        <polygon points={cone} fill="url(#psBeam)" opacity={0.6} />
        <ellipse cx={sp[0]} cy={sp[1]} rx={R * 1.5} ry={R * 1.05} fill="url(#psPool)" />
        <ellipse cx={sp[0]} cy={sp[1]} rx={R} ry={R * 0.7} fill="none" stroke={col} strokeWidth={2.5 * u} style={{filter: `drop-shadow(0 0 ${10 * u}px ${col})`}} />
        <ellipse cx={sp[0]} cy={sp[1]} rx={R * 1.22} ry={R * 0.86} fill="none" stroke={ring} strokeWidth={1.4 * u} strokeDasharray={`${14 * u} ${9 * u}`} strokeDashoffset={-lf * 2 * u} />
        {[0, 90, 180, 270].map((a) => {
          const c = Math.cos((a * Math.PI) / 180), s = Math.sin((a * Math.PI) / 180);
          return <line key={a} x1={sp[0] + c * R * 1.3} y1={sp[1] + s * R * 0.92} x2={sp[0] + c * R * 1.5} y2={sp[1] + s * R * 1.06} stroke={ring} strokeWidth={2 * u} />;
        })}
        <circle cx={tip[0]} cy={tip[1]} r={14 * u} fill="none" stroke={beam} strokeWidth={2 * u} opacity={0.9} />
      </svg>
      {text && <div style={{position: 'absolute', left: sp[0] - R * 1.4, width: R * 2.8, top: sp[1] - fs * 0.62, textAlign: 'center', ...type(st, fs, '#FFFFFF', 400), textShadow: `0 0 ${16 * u}px rgba(0,0,0,0.6)`, opacity: k01(lf, 10, 20)}}>{text}</div>}
      {it.sub && <div style={{position: 'absolute', left: sp[0] - R * 1.4, width: R * 2.8, top: sp[1] + fs * 0.55, textAlign: 'center', ...label(u, st, Math.max(10, fs * 0.3), col), opacity: k01(lf, 14, 24)}}>{String(it.sub)}</div>}
    </div>
  );
};
export default PointSpot;
