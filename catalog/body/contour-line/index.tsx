// A thin gold line traces the outline of your head and shoulders, a little outside it, and a word rides at its end.
// The outline is measured from the person every frame, so the line moves with you and never touches you.
import React from 'react';
import {GraphicProps, caps, exitK, k01} from '../../../src/catalog/ui';

const ContourLine: React.FC<GraphicProps> = ({it, lf, dur, st, u, L, mainF}) => {
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
  return (
    <>
      <svg style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}} width={1} height={1}>
        <path d={d} fill="none" stroke={st.accent} strokeWidth={2 * u} strokeLinejoin="round" strokeLinecap="round" pathLength={1} strokeDasharray={`${k} 1`} opacity={1 - out} />
        <circle cx={end[0]} cy={end[1]} r={4 * u} fill={st.accentHi} opacity={1 - out} />
      </svg>
      {it.text && (
        <div style={{position: 'absolute', left: end[0] + 10 * u, top: end[1] - 30 * u, ...caps(st, 20 * u, st.accentHi), opacity: k01(lf, 18, 28) * (1 - out)}}>{String(it.text)}</div>
      )}
    </>
  );
};
export default ContourLine;
