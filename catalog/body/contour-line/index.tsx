// A glowing gold line traces the outline of your head and shoulders, a little outside it, with a second line in a
// subject colour ("color", teal by default) further out, and a word rides at its end.
// The outline is measured from the person every frame, so the line moves with you and never touches you.
import React from 'react';
import {GraphicProps, caps, exitK, k01} from '../../../src/catalog/ui';

const ContourLine: React.FC<GraphicProps> = ({it, lf, dur, st, u, W, L, mainF}) => {
  const raw: number[][] = L?.contour?.[(mainF ?? 0) - (L?.f0 ?? 0)] || [];
  if (raw.length < 2) return null;
  // the outline comes from a coarse grid: round its corners (Chaikin, 3 passes) so it reads as a drawn line
  let pts = raw;
  for (let n = 0; n < 3; n++) {
    const q: number[][] = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const [a, b] = [pts[i], pts[i + 1]];
      q.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    q.push(pts[pts.length - 1]);
    pts = q;
  }
  const k = k01(lf, 0, 24), out = exitK(lf, dur, 12);
  const d = 'M' + pts.map((p) => p.join(',')).join(' L');
  const end = pts[Math.min(pts.length - 1, Math.floor((pts.length - 1) * k))];
  // two lines (gold, then a subject colour a little further out) with a soft neon glow: reads even as a thumbnail
  const col2 = it.color || '#3FD0C9';
  const cx = pts.reduce((t, p) => t + p[0], 0) / pts.length, cy = pts.reduce((t, p) => t + p[1], 0) / pts.length;
  const outer = pts.map((p) => [cx + (p[0] - cx) * 1.07, cy + (p[1] - cy) * 1.05 - 10 * u]);
  const d2 = 'M' + outer.map((p) => p.join(',')).join(' L');
  const k2 = k01(lf, 6, 30);
  const glow = (c: string, w: number) => ({filter: `drop-shadow(0 0 ${w * u}px ${c})`});
  // the word rides at the line's end; near the frame edge it hangs on the inner side so it is never cut
  const fsL = 34 * u, lw = String(it.text || '').length * fsL * 0.86, FW = W || 1920;
  const lx = end[0] + 16 * u + lw > FW - 24 * u ? end[0] - 16 * u - lw : end[0] + 16 * u;
  return (
    <>
      <svg style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}} width={1} height={1}>
        <g opacity={1 - out}>
          <path d={d2} fill="none" stroke={col2} strokeWidth={3 * u} strokeLinejoin="round" strokeLinecap="round" pathLength={1} strokeDasharray={`${k2} 1`} opacity={0.9} style={glow(col2, 10)} />
          <path d={d} fill="none" stroke={st.accentHi} strokeWidth={4.5 * u} strokeLinejoin="round" strokeLinecap="round" pathLength={1} strokeDasharray={`${k} 1`} style={glow(st.accent, 14)} />
          <path d={d} fill="none" stroke="#FFF4E0" strokeWidth={1.4 * u} strokeLinejoin="round" strokeLinecap="round" pathLength={1} strokeDasharray={`${k} 1`} />
          <circle cx={end[0]} cy={end[1]} r={8 * u} fill="#FFF4E0" style={glow(st.accentHi, 12)} />
        </g>
      </svg>
      {it.text && (
        <div style={{position: 'absolute', left: lx, top: end[1] - 44 * u, ...caps(st, fsL, st.accentHi), textShadow: `0 0 ${14 * u}px rgba(0,0,0,0.6)`, opacity: k01(lf, 18, 28) * (1 - out)}}>{String(it.text)}</div>
      )}
    </>
  );
};
export default ContourLine;
