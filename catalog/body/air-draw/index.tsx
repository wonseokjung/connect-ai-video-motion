// Write in the air: your index finger tip is a pen of light. A thin live trail stays at your fingertip, and the same
// measured path is drawn big on the wall behind you (scaled up around its centre so it fills about a third of the
// frame), joined to your fingertip by a faint beam. Both are BEHIND you (person matte in front, mic and desk too), so
// where the big stroke passes behind your head or body it is hidden, like light on the wall. Colour shifts along the
// stroke (violet, coral, gold), white core, soft glow; the older part thins out. Optional word above the drawing.
// "value" sets the scale by hand (1 = life size, no wall drawing).
import React from 'react';
import {GraphicProps, HUE, exitK, hueOf, k01} from '../../../src/catalog/ui';
import {Pt, lockSide, mix, pickHand, rigAt, smoothPath, tipOf, label} from '../../../src/catalog/rig';

const AirDraw: React.FC<GraphicProps> = ({it, lf, dur, st, u, L, mainF, W = 1920, H = 1080}) => {
  const i = (mainF ?? 0) - (L?.f0 ?? 0);
  const side = lockSide(L, it.hand);
  const out = exitK(lf, dur, 14);
  const c1 = hueOf(it, HUE.goldHi), c2 = HUE.coral, c3 = HUE.violet;
  const n = L?.rig?.length ?? i + 1;
  // the whole measured path (all frames of the graphic) sets the scale, so the drawing does not jump while it grows
  const tips: (Pt | null)[] = [];
  for (let q = 0; q < n; q++) tips.push(tipOf(pickHand(rigAt(L, q, 2), side)));
  const seen = tips.filter(Boolean) as Pt[];
  if (!seen.length) return null;
  const xs = seen.map((p) => p[0]), ys = seen.map((p) => p[1]);
  const bx0 = Math.min(...xs), bx1 = Math.max(...xs), by0 = Math.min(...ys), by1 = Math.max(...ys);
  const bw = Math.max(40 * u, bx1 - bx0), bh = Math.max(40 * u, by1 - by0);
  const C: Pt = [(bx0 + bx1) / 2, (by0 + by1) / 2];
  const want = Number(it.value);
  const g = Number.isFinite(want) && want > 0 ? want : Math.max(1, Math.min(4, (W * 0.8) / bw, (H * 0.52) / bh));
  // the wall drawing is centred on the frame, upper half (around and above the shoulders)
  const T: Pt = g > 1 ? [W * 0.5, H * 0.38] : C;
  const big = (p: Pt): Pt => [T[0] + (p[0] - C[0]) * g, T[1] + (p[1] - C[1]) * g];
  // stroke so far, split where the finger was lost
  const runs: {p: Pt; f: number}[][] = [[]];
  for (let q = 0; q <= Math.min(i, n - 1); q++) {
    const t = tips[q];
    if (!t) { if (runs[runs.length - 1].length) runs.push([]); continue; }
    runs[runs.length - 1].push({p: t, f: q});
  }
  const all = runs.flat();
  const head = all[all.length - 1];
  if (!head) return null;
  const N = Math.max(1, i);
  const segs: React.ReactNode[] = [];
  runs.forEach((run, ri) => {
    for (let q = 1; q < run.length; q++) {
      const a = big(run[q - 1].p), b = big(run[q].p);
      const age = (i - run[q].f) / N; // 0 new .. 1 old
      const t = run[q].f / N;
      const col = t < 0.5 ? mix(c3, c2, t * 2) : mix(c2, c1, (t - 0.5) * 2);
      const w = (30 + 26 * (1 - age)) * u;
      segs.push(<line key={`${ri}_${q}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={col} strokeWidth={w} strokeLinecap="round" opacity={0.65 + 0.35 * (1 - age)} />);
    }
  });
  const live = runs.filter((r) => r.length > 1);
  const bigPaths = live.map((r) => smoothPath(r.map((x) => big(x.p))));
  const smallPaths = g > 1 ? live.map((r) => smoothPath(r.slice(-14).map((x) => x.p))) : [];
  const H0 = big(head.p);
  // the word floats just above the highest point of the whole wall drawing (the top of the frame is where the mic arm,
  // the desk and you are not), fixed for the whole graphic so it does not chase the pen
  const topP = big(seen.reduce((m, p) => (p[1] < m[1] ? p : m), seen[0]));
  const lw = 420 * u;
  const lx = Math.max(40 * u, Math.min(W - 40 * u - lw, topP[0] - lw / 2));
  const ly = Math.max(40 * u, topP[1] - 110 * u);
  const k = k01(lf, 0, 6);
  return (
    <div style={{position: 'absolute', inset: 0, opacity: k * (1 - out)}}>
      <svg style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}} width={1} height={1}>
        <defs>
          <filter id="adGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={18 * u} />
          </filter>
          <radialGradient id="adHead">
            <stop offset="0" stopColor="#FFFFFF" />
            <stop offset="0.35" stopColor={c1} stopOpacity={0.9} />
            <stop offset="1" stopColor={c1} stopOpacity={0} />
          </radialGradient>
        </defs>
        {/* beam from the real fingertip to the pen on the wall */}
        {g > 1 && <line x1={head.p[0]} y1={head.p[1]} x2={H0[0]} y2={H0[1]} stroke={c1} strokeWidth={3 * u} strokeDasharray={`${4 * u} ${10 * u}`} strokeLinecap="round" opacity={0.55} />}
        {/* wide coloured glow under the stroke */}
        {bigPaths.map((d, q) => <path key={`g${q}`} d={d} fill="none" stroke={c2} strokeWidth={96 * u} strokeLinecap="round" strokeLinejoin="round" opacity={0.5} filter="url(#adGlow)" />)}
        <g filter="url(#adGlow)">{segs}</g>
        {segs}
        {/* white core along the whole stroke */}
        {bigPaths.map((d, q) => <path key={q} d={d} fill="none" stroke="#FFF8EC" strokeWidth={9 * u} strokeLinecap="round" strokeLinejoin="round" />)}
        <circle cx={H0[0]} cy={H0[1]} r={90 * u} fill="url(#adHead)" />
        {/* the live trail at the fingertip itself */}
        {smallPaths.map((d, q) => <path key={`s${q}`} d={d} fill="none" stroke={c1} strokeWidth={6 * u} strokeLinecap="round" strokeLinejoin="round" opacity={0.9} style={{filter: `drop-shadow(0 0 ${8 * u}px ${c1})`}} />)}
        <circle cx={head.p[0]} cy={head.p[1]} r={14 * u * (1 + 0.12 * Math.sin(lf / 2.2))} fill="none" stroke={c1} strokeWidth={3 * u} />
      </svg>
      {it.text && (
        <div style={{position: 'absolute', left: lx, width: lw, textAlign: 'center', top: ly, ...label(u, st, 44 * u, c1), textShadow: `0 0 ${18 * u}px ${c1}`, opacity: k01(lf, 10, 20)}}>{String(it.text)}</div>
      )}
    </div>
  );
};
export default AirDraw;
