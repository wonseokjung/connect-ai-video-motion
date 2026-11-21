// A robot lands behind your shoulder: the kit's robot (remotion/shapes-agents) drops in behind your measured shoulder
// on the side with more room, its lower half hidden by you (person matte in front), its eyes on your face, and it
// moves with your shoulder every frame. Your word floats over it.
import React from 'react';
import {GraphicProps, HUE, exitK, hueOf, k01} from '../../../src/catalog/ui';
import {Mascot} from '../../remotion/_shared/Mascot';
import {rigAt, label} from '../../../src/catalog/rig';

const ShoulderBuddy: React.FC<GraphicProps> = ({it, lf, dur, st, u, L, mainF, fps, W, H}) => {
  const i = (mainF ?? 0) - (L?.f0 ?? 0);
  // smoothed shoulders and face over +-4 frames
  let n = 0, lx = 0, ly = 0, rx = 0, ry = 0, fx = 0, fy = 0, nf = 0;
  for (let q = i - 4; q <= i + 4; q++) {
    const r = rigAt(L, q, 8);
    const a = r?.joints.leftShoulder, b = r?.joints.rightShoulder;
    if (a && b) { lx += a[0]; ly += a[1]; rx += b[0]; ry += b[1]; n++; }
    if (r?.face) { fx += r.face[0] + r.face[2] / 2; fy += r.face[1] + r.face[3] / 2; nf++; }
  }
  if (!n) return null;
  const A = [lx / n, ly / n], B = [rx / n, ry / n];
  const face = nf ? [fx / nf, fy / nf] : [W / 2, H * 0.35];
  const [lo, hi] = A[0] < B[0] ? [A, B] : [B, A];
  const right = it.hand === 'left' ? false : it.hand === 'right' ? true : W - hi[0] > lo[0];
  const sh = right ? hi : lo;
  const span = Math.abs(hi[0] - lo[0]);
  const col = hueOf(it, HUE.goldHi);
  const S = Math.max(170 * u, span * 0.5);
  const out = exitK(lf, dur, 12);
  // body bottom a little under the top of the shoulder: the lower part stays behind him
  const cx = sh[0] + (right ? 1 : -1) * span * 0.3;
  const bottom = sh[1] + S * 0.1;
  const left = cx - S / 2 - S * 0.25, top = bottom - S * 0.86 - S * 0.45;
  const look: [number, number] = [Math.max(-1, Math.min(1, (face[0] - cx) / (S * 2))), Math.max(-1, Math.min(1, (face[1] - (bottom - S * 0.5)) / (S * 2)))];
  return (
    <div style={{position: 'absolute', inset: 0, opacity: 1 - out}}>
      <div style={{position: 'absolute', left, top, filter: `drop-shadow(0 0 ${18 * u}px rgba(242,180,90,0.45))`}}>
        <Mascot size={S} lf={lf} fps={fps} body={col} face="#14121A" eye="#7CF7E4" look={look} wave delay={6} />
      </div>
      {it.text && (
        <div style={{position: 'absolute', left: cx - 200 * u, width: 400 * u, top: top + S * 0.05 - 40 * u, textAlign: 'center', ...label(u, st, 26 * u, col), textShadow: `0 0 ${14 * u}px rgba(0,0,0,0.6)`, opacity: k01(lf, 14, 24)}}>{String(it.text)}</div>
      )}
    </div>
  );
};
export default ShoulderBuddy;
