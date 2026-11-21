// A ring of words around your head: your words run along a tilted orbit that circles your head, behind you (the
// person matte keeps your head in front, so the ring disappears behind it and comes out on the other side). The
// orbit follows your measured face every frame and tilts with your head (eye line). A second ring of light turns
// the other way.
import React from 'react';
import {GraphicProps, HUE, exitK, hueOf, k01, OUT} from '../../../src/catalog/ui';
import {FONT} from '../../../src/brand';
import {rigAt} from '../../../src/catalog/rig';

const HaloWords: React.FC<GraphicProps> = ({it, lf, dur, st, u, L, mainF}) => {
  const i = (mainF ?? 0) - (L?.f0 ?? 0);
  // smooth the face over +-3 frames: the ring should float, not shake
  let n = 0, fx = 0, fy = 0, fw = 0, fh = 0, roll = 0, nr = 0;
  for (let q = i - 3; q <= i + 3; q++) {
    const r = rigAt(L, q, 8);
    if (!r?.face) continue;
    fx += r.face[0] + r.face[2] / 2; fy += r.face[1]; fw += r.face[2]; fh += r.face[3]; n++;
    const a = r.joints.leftEye, b = r.joints.rightEye;
    if (a && b) { roll += Math.atan2(b[1] - a[1], b[0] - a[0]) * (b[0] < a[0] ? -1 : 1); nr++; }
  }
  if (!n) return null;
  fx /= n; fy /= n; fw /= n; fh /= n;
  const deg = nr ? Math.max(-14, Math.min(14, ((roll / nr) * 180) / Math.PI)) : 0;
  const col = hueOf(it, HUE.goldHi), line = HUE.teal, node = HUE.coral;
  const k = k01(lf, 0, 26, OUT), out = exitK(lf, dur, 14);
  const rx = fw * 1.95 * (0.7 + 0.3 * k), ry = rx * 0.34;
  const cx = fx, cy = fy + fh * 0.12;
  const words = String(it.text || 'Think in data').toUpperCase();
  const fs = Math.max(20 * u, fh * 0.2);
  const ring = (rx2: number, ry2: number) => `M ${cx - rx2},${cy} a ${rx2},${ry2} 0 1,1 ${rx2 * 2},0 a ${rx2},${ry2} 0 1,1 ${-rx2 * 2},0`;
  const per = Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry)));
  const rep = Math.max(2, Math.floor(per / (words.length * fs * 0.78 + fs * 2)));
  const txt = Array.from({length: rep}, () => words).join('  ·  ') + '  ·  ';
  const shift = (lf * 0.9) % 100;
  return (
    <div style={{position: 'absolute', inset: 0, opacity: k01(lf, 0, 10) * (1 - out)}}>
      <svg style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}} width={1} height={1}>
        <defs>
          <path id="hwRing" d={ring(rx, ry)} />
          <filter id="hwGlow" x="-30%" y="-80%" width="160%" height="260%"><feGaussianBlur stdDeviation={6 * u} /></filter>
          {/* words only on the far half of the ring (they read upright there); the near half is a line of light */}
          <linearGradient id="hwFar" gradientUnits="userSpaceOnUse" x1={0} y1={cy - ry} x2={0} y2={cy + ry * 0.35}>
            <stop offset="0" stopColor="#fff" />
            <stop offset="0.7" stopColor="#fff" />
            <stop offset="1" stopColor="#000" />
          </linearGradient>
          <mask id="hwMask" maskUnits="userSpaceOnUse" x={cx - rx * 2} y={cy - ry * 3} width={rx * 4} height={ry * 6}>
            <rect x={cx - rx * 2} y={cy - ry * 3} width={rx * 4} height={ry * 6} fill="url(#hwFar)" />
          </mask>
        </defs>
        <g transform={`rotate(${deg} ${cx} ${cy})`}>
          <ellipse cx={cx} cy={cy} rx={rx * 1.12} ry={ry * 1.12} fill="none" stroke={line} strokeWidth={6 * u} opacity={0.35} filter="url(#hwGlow)" />
          <ellipse cx={cx} cy={cy} rx={rx * 1.12} ry={ry * 1.12} fill="none" stroke={line} strokeWidth={1.6 * u} strokeDasharray={`${40 * u} ${10 * u}`} strokeDashoffset={-lf * 3 * u} />
          {[0, 1, 2, 3].map((q) => {
            const a = -lf * 0.03 + (q * Math.PI) / 2;
            return <circle key={q} cx={cx + Math.cos(a) * rx * 1.12} cy={cy + Math.sin(a) * ry * 1.12} r={5 * u} fill={node} style={{filter: `drop-shadow(0 0 ${8 * u}px ${node})`}} />;
          })}
          <g mask="url(#hwMask)">
          <text fontFamily={FONT} fontSize={fs} fontWeight={500} letterSpacing={fs * 0.22} fill={col} style={{filter: `drop-shadow(0 0 ${10 * u}px rgba(242,180,90,0.7))`}}>
            <textPath href="#hwRing" startOffset={`${shift}%`}>{txt}</textPath>
          </text>
          <text fontFamily={FONT} fontSize={fs} fontWeight={500} letterSpacing={fs * 0.22} fill={col} style={{filter: `drop-shadow(0 0 ${10 * u}px rgba(242,180,90,0.7))`}}>
            <textPath href="#hwRing" startOffset={`${shift - 100}%`}>{txt}</textPath>
          </text>
          </g>
        </g>
      </svg>
    </div>
  );
};
export default HaloWords;
