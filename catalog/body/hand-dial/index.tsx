// Turn the dial with your hand: a big round gauge stands next to your raised hand and its needle follows the real
// tilt of the hand (wrist to middle knuckle, measured every frame). Tilt the hand, the value turns; the arc fills
// from teal through gold to coral and the number reads the angle in degrees. From the live "turn the 3D model" gesture.
import React from 'react';
import {GraphicProps, HUE, caps, exitK, fit, hueOf, k01, type, SNAP} from '../../../src/catalog/ui';
import {lockSide, palmOf, pickHand, rigAt} from '../../../src/catalog/rig';

const HandDial: React.FC<GraphicProps> = ({it, r, lf, dur, st, ink, u, L, mainF}) => {
  const i = (mainF ?? 0) - (L?.f0 ?? 0);
  const side = lockSide(L, it.hand);
  // hand tilt, smoothed over +-3 frames: 0 = fingers straight up, + = leaning right on screen
  let sum = 0, n = 0;
  for (let q = i - 3; q <= i + 3; q++) {
    const h = pickHand(rigAt(L, q, 3), side);
    const w = h?.pts.wrist, m = h?.pts.middleMCP || h?.pts.indexMCP;
    if (w && m) { sum += (Math.atan2(m[0] - w[0], w[1] - m[1]) * 180) / Math.PI; n++; }
  }
  const ang = n ? sum / n : 0;
  const h = pickHand(rigAt(L, i, 3), side);
  const wrist = h?.pts.wrist || palmOf(h);
  const out = exitK(lf, dur), k = k01(lf, 0, 16, SNAP);
  const c1 = HUE.teal, c2 = hueOf(it, HUE.goldHi), c3 = HUE.coral;
  const D = Math.min(r[2], r[3] * 0.82);
  const cx = r[0] + r[2] / 2, cy = r[1] + D / 2, R = D * 0.42;
  const A0 = -135, A1 = 135;
  const val = Math.max(A0, Math.min(A1, ang * 1.5)) * k; // 1.5x so a 60 degree tilt sweeps most of the dial
  const pol = (a: number, rr: number) => [cx + Math.sin((a * Math.PI) / 180) * rr, cy - Math.cos((a * Math.PI) / 180) * rr];
  const arc = (a: number, b: number, rr: number) => {
    const [x0, y0] = pol(a, rr), [x1, y1] = pol(b, rr);
    return `M ${x0} ${y0} A ${rr} ${rr} 0 ${Math.abs(b - a) > 180 ? 1 : 0} ${b > a ? 1 : 0} ${x1} ${y1}`;
  };
  const tip = pol(val, R * 0.92);
  const near = wrist ? [Math.max(cx - R * 1.1, Math.min(cx + R * 1.1, wrist[0])), Math.max(cy - R * 1.1, Math.min(cy + R * 1.1, wrist[1]))] : null;
  const text = it.text ? String(it.text) : 'Tilt';
  const fs = fit(text, r[2] * 0.9, r[3] * 0.1, st.heavy, 0.2);
  const deg = Math.round(ang);
  return (
    <div style={{position: 'absolute', inset: 0, opacity: (1 - out) * k01(lf, 0, 8)}}>
      <svg style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}} width={1} height={1}>
        <defs>
          <linearGradient id="hdArc" gradientUnits="userSpaceOnUse" x1={cx - R} y1={cy} x2={cx + R} y2={cy}>
            <stop offset="0" stopColor={c1} />
            <stop offset="0.5" stopColor={c2} />
            <stop offset="1" stopColor={c3} />
          </linearGradient>
          <radialGradient id="hdBg">
            <stop offset="0" stopColor="rgba(11,10,9,0.55)" />
            <stop offset="0.85" stopColor="rgba(11,10,9,0.35)" />
            <stop offset="1" stopColor="rgba(11,10,9,0)" />
          </radialGradient>
        </defs>
        {wrist && near && <line x1={wrist[0]} y1={wrist[1]} x2={near[0]} y2={near[1]} stroke={c2} strokeWidth={1.6 * u} strokeDasharray={`${3 * u} ${6 * u}`} opacity={0.8} />}
        <circle cx={cx} cy={cy} r={R * 1.18 * k} fill="url(#hdBg)" />
        {/* ticks */}
        {Array.from({length: 19}, (_, q) => {
          const a = A0 + q * 15, big = q % 3 === 0;
          const [x0, y0] = pol(a, R * (big ? 1.08 : 1.1)), [x1, y1] = pol(a, R * 1.16);
          const on = val >= 0 ? a >= 0 && a <= val : a <= 0 && a >= val;
          return <line key={q} x1={x0} y1={y0} x2={x1} y2={y1} stroke={on ? c2 : 'rgba(235,226,210,0.45)'} strokeWidth={(big ? 3 : 1.5) * u} />;
        })}
        <path d={arc(A0, A1, R)} fill="none" stroke="rgba(235,226,210,0.14)" strokeWidth={R * 0.16} strokeLinecap="round" />
        {Math.abs(val) > 0.5 && <path d={val > 0 ? arc(0, val, R) : arc(val, 0, R)} fill="none" stroke="url(#hdArc)" strokeWidth={R * 0.16} strokeLinecap="round" style={{filter: `drop-shadow(0 0 ${12 * u}px ${val > 0 ? c3 : c1})`}} />}
        <line x1={cx} y1={cy} x2={tip[0]} y2={tip[1]} stroke="#FFF6E6" strokeWidth={4 * u} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={R * 0.12} fill={c2} />
        <circle cx={tip[0]} cy={tip[1]} r={7 * u} fill="#FFF6E6" style={{filter: `drop-shadow(0 0 ${10 * u}px ${c2})`}} />
      </svg>
      <div style={{position: 'absolute', left: cx - R, width: R * 2, top: cy + R * 0.22, textAlign: 'center', ...type(st, R * 0.42, ink, 300), fontVariantNumeric: 'tabular-nums'}}>{deg > 0 ? '+' : ''}{deg}<span style={{fontSize: R * 0.22, color: c2}}>°</span></div>
      <div style={{position: 'absolute', left: r[0] - r[2] * 0.05, width: r[2] * 1.1, top: cy + R * 1.24, textAlign: 'center', ...caps(st, fs, c2), opacity: k01(lf, 8, 18)}}>{text}</div>
    </div>
  );
};
export default HandDial;
