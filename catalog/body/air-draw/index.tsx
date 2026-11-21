// Write in the air: your index finger tip leaves a line of light in the room, measured frame by frame (no faked
// path). It is drawn BEHIND you (person matte in front), so where the stroke passes behind your body it is hidden,
// the same way the live "air whiteboard" never draws on the person. Gold head, colour shifting along the stroke,
// white core, soft glow; the older part of the stroke thins out. Optional word written at the end of the stroke.
import React from 'react';
import {GraphicProps, HUE, caps, exitK, hueOf, k01} from '../../../src/catalog/ui';
import {Pt, lockSide, mix, pickHand, rigAt, smoothPath, tipOf} from '../../../src/catalog/rig';

const AirDraw: React.FC<GraphicProps> = ({it, lf, dur, st, u, L, mainF, W}) => {
  const i = (mainF ?? 0) - (L?.f0 ?? 0);
  const side = lockSide(L, it.hand);
  const out = exitK(lf, dur, 14);
  const c1 = hueOf(it, HUE.goldHi), c2 = HUE.coral, c3 = HUE.violet;
  // stroke points so far, split where the finger was lost
  const runs: {p: Pt; f: number}[][] = [[]];
  for (let q = 0; q <= i; q++) {
    const r = rigAt(L, q, 2);
    const t = tipOf(pickHand(r, side));
    if (!t) { if (runs[runs.length - 1].length) runs.push([]); continue; }
    runs[runs.length - 1].push({p: t, f: q});
  }
  const all = runs.flat();
  const head = all[all.length - 1];
  if (!head) return null;
  const N = Math.max(1, i);
  // the word sits just outside the stroke, on the side away from the face, level with the stroke's outer point
  // (so it does not land on the mic arm or the hand that is drawing)
  const fc = rigAt(L, i, 8)?.face;
  const awayLeft = fc ? head.p[0] < fc[0] + fc[2] / 2 : false;
  const outer = all.reduce((m, x) => (awayLeft ? x.p[0] < m.p[0] : x.p[0] > m.p[0]) ? x : m, all[0]);
  const segs: React.ReactNode[] = [];
  runs.forEach((run, ri) => {
    for (let q = 1; q < run.length; q++) {
      const a = run[q - 1], b = run[q];
      const age = (i - b.f) / N; // 0 new .. 1 old
      const t = b.f / N;
      const col = t < 0.5 ? mix(c3, c2, t * 2) : mix(c2, c1, (t - 0.5) * 2);
      const w = (22 + 22 * (1 - age)) * u;
      segs.push(<line key={`${ri}_${q}`} x1={a.p[0]} y1={a.p[1]} x2={b.p[0]} y2={b.p[1]} stroke={col} strokeWidth={w} strokeLinecap="round" opacity={0.6 + 0.4 * (1 - age)} />);
    }
  });
  const paths = runs.filter((r) => r.length > 1).map((r) => smoothPath(r.map((x) => x.p)));
  const k = k01(lf, 0, 6);
  return (
    <div style={{position: 'absolute', inset: 0, opacity: k * (1 - out)}}>
      <svg style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}} width={1} height={1}>
        <defs>
          <filter id="adGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={16 * u} />
          </filter>
          <radialGradient id="adHead">
            <stop offset="0" stopColor="#FFFFFF" />
            <stop offset="0.35" stopColor={c1} stopOpacity={0.9} />
            <stop offset="1" stopColor={c1} stopOpacity={0} />
          </radialGradient>
        </defs>
        {/* wide coloured glow under the stroke */}
        {paths.map((d, q) => <path key={`g${q}`} d={d} fill="none" stroke={c2} strokeWidth={70 * u} strokeLinecap="round" strokeLinejoin="round" opacity={0.6} filter="url(#adGlow)" />)}
        <g filter="url(#adGlow)" opacity={1}>{segs}</g>
        <g filter="url(#adGlow)" opacity={0.7}>{segs}</g>
        {segs}
        {/* white core along the whole stroke */}
        {paths.map((d, q) => <path key={q} d={d} fill="none" stroke="#FFF8EC" strokeWidth={7 * u} strokeLinecap="round" strokeLinejoin="round" opacity={1} />)}
        <circle cx={head.p[0]} cy={head.p[1]} r={70 * u} fill="url(#adHead)" />
        <circle cx={head.p[0]} cy={head.p[1]} r={16 * u * (1 + 0.12 * Math.sin(lf / 2.2))} fill="none" stroke={c1} strokeWidth={2 * u} />
      </svg>
      {it.text && (
        <div style={{position: 'absolute', ...(awayLeft ? {right: (W ?? 1920) - outer.p[0] + 56 * u, textAlign: 'right'} : {left: outer.p[0] + 56 * u}), top: outer.p[1] - 22 * u, ...caps(st, 30 * u, c1), textShadow: `0 0 ${18 * u}px ${c1}`, opacity: k01(lf, 10, 20)}}>{String(it.text)}</div>
      )}
    </div>
  );
};
export default AirDraw;
