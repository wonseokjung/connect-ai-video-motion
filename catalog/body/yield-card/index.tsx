// A card that makes way for your hand (our rule: panels yield to hands). It stands in a free spot like any card; when
// your measured hand comes toward it, it leans away in 3D, shrinks and slides back, and the edge facing the hand lights
// up. When the hand goes, it settles back. The bar at the bottom is the real distance to your hand.
import React from 'react';
import {GraphicProps, HUE, exitK, fit, hueOf, k01, type, SNAP} from '../../../src/catalog/ui';
import {RigFrame, rigAt, label} from '../../../src/catalog/rig';

const nearHand = (rig: RigFrame | null, r: number[]) => {
  let best: {d: number; p: number[]} | null = null;
  for (const h of rig?.hands || []) for (const p of Object.values(h.pts)) {
    const dx = Math.max(r[0] - p[0], 0, p[0] - (r[0] + r[2])), dy = Math.max(r[1] - p[1], 0, p[1] - (r[1] + r[3]));
    const d = Math.hypot(dx, dy);
    if (!best || d < best.d) best = {d, p};
  }
  return best;
};

const YieldCard: React.FC<GraphicProps> = ({it, r, lf, dur, st, ink, u, L, mainF, W = 1920, H = 1080}) => {
  const i = (mainF ?? 0) - (L?.f0 ?? 0);
  const col = hueOf(it, HUE.blue), gold = HUE.goldHi, coral = HUE.coral;
  const reach = r[2] * 1.6; // starts to lean well before the hand arrives (the layout keeps it clear of hands)
  // how close the hand is, smoothed (+-3 frames) so the card moves like a body, not a switch
  let s = 0, n = 0, dir = [0, 0];
  for (let q = i - 3; q <= i + 3; q++) {
    const nh = nearHand(rigAt(L, q, 2), r);
    const v = nh ? Math.max(0, Math.min(1, 1 - nh.d / reach)) : 0;
    s += v; n++;
    if (nh && q === i) { const cx = r[0] + r[2] / 2, cy = r[1] + r[3] / 2; const dl = Math.hypot(cx - nh.p[0], cy - nh.p[1]) || 1; dir = [(cx - nh.p[0]) / dl, (cy - nh.p[1]) / dl]; }
  }
  const y = n ? s / n : 0;
  const e = y * y * (3 - 2 * y);
  const k = k01(lf, 0, 14, SNAP), out = exitK(lf, dur);
  const text = String(it.text || 'Make way');
  const pad = r[2] * 0.08;
  const fs = fit(text, r[2] - pad * 2, r[3] * 0.32, st.weight, st.tracking);
  const fromLeft = dir[0] > 0; // hand on the left of the card
  const nh = nearHand(rigAt(L, i, 2), r);
  const pct = nh ? Math.max(0, Math.min(1, nh.d / reach)) : 1;
  // the move (slide + lean + shrink) never takes the card closer than 40 px to the frame edge: the four corners are
  // projected exactly as CSS does it (scale, rotateY about the edge, translate, perspective from the box centre)
  const sc = (0.85 + 0.15 * k) * (1 - 0.18 * e);
  const ang = (((fromLeft ? 1 : -1) * e * 38) * Math.PI) / 180;
  const P = 1000 * u, m = 40 * u;
  const ox = fromLeft ? r[0] + r[2] : r[0], oy = r[1] + r[3] / 2; // transform origin
  const px = r[0] + r[2] / 2, py = r[1] + r[3] / 2; // perspective origin
  const bounds = (tx: number, ty: number) => {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const [cx, cy] of [[r[0], r[1]], [r[0] + r[2], r[1]], [r[0], r[1] + r[3]], [r[0] + r[2], r[1] + r[3]]]) {
      const lx = (cx - ox) * sc, ly = (cy - oy) * sc;
      const X = ox + tx + lx * Math.cos(ang), Y = oy + ty + ly, Z = -lx * Math.sin(ang);
      const f = P / (P - Z);
      const sx = px + (X - px) * f, sy = py + (Y - py) * f;
      x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
    }
    return [x0, y0, x1, y1];
  };
  let tx = dir[0] * e * r[2] * 0.14, ty = dir[1] * e * r[3] * 0.18;
  for (let pass = 0; pass < 3; pass++) {
    const [x0, y0, x1, y1] = bounds(tx, ty);
    if (x0 < m) tx += m - x0; else if (x1 > W - m) tx -= x1 - (W - m);
    if (y0 < m) ty += m - y0; else if (y1 > H - m) ty -= y1 - (H - m);
  }
  return (
    <div style={{position: 'absolute', left: r[0], top: r[1], width: r[2], height: r[3], perspective: 1000 * u, opacity: (1 - out) * k01(lf, 0, 8)}}>
      <div style={{position: 'absolute', inset: 0, transformOrigin: fromLeft ? '100% 50%' : '0% 50%', transform: `translate(${tx}px, ${ty}px) rotateY(${(fromLeft ? 1 : -1) * e * 38}deg) scale(${sc})`}}>
        <div style={{position: 'absolute', inset: 0, borderRadius: 16 * u, background: `linear-gradient(150deg, rgba(76,140,198,0.45), rgba(12,16,26,0.82) 50%, rgba(214,137,42,0.28))`, border: '1.5px solid rgba(255,255,255,0.2)', boxShadow: `0 ${24 * u}px ${60 * u}px rgba(0,0,0,0.4), 0 0 ${36 * u}px rgba(76,140,198,0.3)`}} />
        {/* the edge facing the hand lights up as it comes */}
        <div style={{position: 'absolute', top: 0, bottom: 0, [fromLeft ? 'left' : 'right']: 0, width: 6 * u, borderRadius: 3 * u, background: `linear-gradient(180deg, ${gold}, ${coral})`, opacity: 0.2 + 0.8 * e, boxShadow: `0 0 ${30 * u * e}px ${gold}`}} />
        <div style={{position: 'absolute', left: pad, top: r[3] * 0.12, ...label(u, st, Math.max(10, r[3] * 0.07), gold)}}>{it.sub ? String(it.sub) : 'MAKES WAY'}</div>
        <div style={{position: 'absolute', left: pad, top: r[3] * 0.3, ...type(st, fs, ink)}}>{text}</div>
        <div style={{position: 'absolute', left: pad, right: pad, bottom: r[3] * 0.16, height: 6 * u, borderRadius: 3 * u, background: 'rgba(235,226,210,0.15)'}}>
          <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct * 100}%`, borderRadius: 3 * u, background: `linear-gradient(90deg, ${coral}, ${gold}, ${col})`}} />
        </div>
        <div style={{position: 'absolute', left: pad, bottom: r[3] * 0.04, ...label(u, st, Math.max(9, r[3] * 0.05), 'rgba(235,226,210,0.65)'), fontVariantNumeric: 'tabular-nums'}}>HAND {nh ? Math.round(nh.d / u) : '--'} PX</div>
      </div>
    </div>
  );
};
export default YieldCard;
