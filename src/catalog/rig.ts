// Helpers for body graphics that read the measured rig (meta.json "rig": true -> layout item L.rig[frame]).
// Everything is in output px: joints {nose, neck, leftShoulder ...}, hands [{side, pts {indexTip ...}, box, count, pinch}], face box.
import {staticFile} from 'remotion';
import {caps} from './ui';

export type Pt = [number, number];
export type RigHand = {side: 'left' | 'right'; pts: Record<string, Pt>; box: number[]; count: number | null; pinch: number | null};
export type RigFrame = {joints: Record<string, Pt>; hands: RigHand[]; face: number[] | null};

/** rig of frame i of the graphic (i = frames since it started); a frame with nothing measured borrows the nearest one within `reach` */
export const rigAt = (L: any, i: number, reach = 6): RigFrame | null => {
  const R = L?.rig as RigFrame[] | undefined;
  if (!R || !R.length) return null;
  const k = Math.max(0, Math.min(R.length - 1, i));
  if (R[k]) return R[k];
  for (let d = 1; d <= reach; d++) {
    if (R[k - d]) return R[k - d];
    if (R[k + d]) return R[k + d];
  }
  return null;
};

/** the hand to follow: "left" | "right" | "any" (the higher one on screen = the one he raises) */
export const pickHand = (r: RigFrame | null, side: string = 'any'): RigHand | null => {
  if (!r) return null;
  const hs = r.hands.filter((h) => side === 'any' || !side || h.side === side);
  return hs.sort((a, b) => a.box[1] - b.box[1])[0] || null;
};

/** keep following the same hand for the whole graphic: the side of the hand picked at its first good frame */
export const lockSide = (L: any, side: string = 'any'): string => {
  if (side && side !== 'any') return side;
  const R = (L?.rig || []) as RigFrame[];
  const votes: Record<string, number> = {};
  for (const r of R) { const h = pickHand(r, 'any'); if (h) votes[h.side] = (votes[h.side] || 0) + 1; }
  return Object.entries(votes).sort((a, b) => b[1] - a[1])[0]?.[0] || 'any';
};

export const palmOf = (h: RigHand | null): Pt | null => {
  if (!h) return null;
  const ks = ['wrist', 'indexMCP', 'middleMCP', 'ringMCP', 'littleMCP'].filter((k) => h.pts[k]);
  if (!ks.length) return [h.box[0] + h.box[2] / 2, h.box[1] + h.box[3] / 2];
  return [ks.reduce((s, k) => s + h.pts[k][0], 0) / ks.length, ks.reduce((s, k) => s + h.pts[k][1], 0) / ks.length];
};

export const tipOf = (h: RigHand | null): Pt | null => (h ? h.pts.indexTip || h.pts.middleTip || null : null);

/** the person matte frame (behind graphics): a CSS mask / img url, or null when the kit made no matte here */
export const matteUrl = (L: any, mainF: number) => (L?.matteDir ? staticFile(`${L.matteDir}/m_${String(mainF).padStart(6, '0')}.png`) : null);

/** small stable pseudo random in 0..1 (same value every render) */
export const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** Catmull-Rom spline through points -> smooth SVG path */
export const smoothPath = (p: Pt[]) => {
  if (p.length < 2) return '';
  let d = `M${p[0][0].toFixed(1)},${p[0][1].toFixed(1)}`;
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[Math.max(0, i - 1)], b = p[i], c = p[i + 1], e = p[Math.min(p.length - 1, i + 2)];
    const c1 = [b[0] + (c[0] - a[0]) / 6, b[1] + (c[1] - a[1]) / 6], c2 = [c[0] - (e[0] - b[0]) / 6, c[1] - (e[1] - b[1]) / 6];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${c[0].toFixed(1)},${c[1].toFixed(1)}`;
  }
  return d;
};

export const mix = (a: string, b: string, t: number) => {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const A = p(a), B = p(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * Math.max(0, Math.min(1, t))).toString(16).padStart(2, '0')).join('');
};

/** small caps label for body graphics: weight 600 and never under 40 px at 1080p, so it still reads in a 400 px wide gallery clip */
export const label = (u: number, st: any, fs: number, color: string) => ({...caps(st, Math.max(fs, 40 * u), color), fontWeight: 600, letterSpacing: '0.14em'});
