// A card you hold: it rides next to your raised hand (always on the side clear of your body and face), swings in 3D
// with the real speed of the hand (it leans the way you move, settles when you stop), and a grip line runs from your
// thumb and index finger to its corner. When you pinch, the corner clamp lights up. From the live "chat card" grab.
import React from 'react';
import {GraphicProps, HUE, caps, exitK, fit, hueOf, k01, type, SNAP} from '../../../src/catalog/ui';
import {lockSide, pickHand, rigAt} from '../../../src/catalog/rig';

const GrabCard: React.FC<GraphicProps> = ({it, r, lf, dur, st, ink, u, L, mainF}) => {
  const i = (mainF ?? 0) - (L?.f0 ?? 0);
  const tr = L?.track?.[i];
  const a = tr?.anchor;
  const col = hueOf(it, HUE.violet), col2 = HUE.coral, gold = HUE.goldHi;
  const out = exitK(lf, dur);
  const k = k01(lf, 0, 14, SNAP);
  // hand velocity (px / frame) over the last 4 frames, from the measured track
  let vx = 0, vy = 0;
  for (let q = i; q > i - 4 && q > 0; q--) {
    const A = L?.track?.[q]?.anchor, B = L?.track?.[q - 1]?.anchor;
    if (A && B) { vx += (A[0] - B[0]) / 4; vy += (A[1] - B[1]) / 4; }
  }
  const tiltY = Math.max(-28, Math.min(28, vx * 1.6 / u));
  const tiltX = Math.max(-18, Math.min(18, -vy * 1.2 / u));
  const h = pickHand(rigAt(L, i), lockSide(L, it.hand));
  const grip = h && h.pts.thumbTip && h.pts.indexTip ? [(h.pts.thumbTip[0] + h.pts.indexTip[0]) / 2, (h.pts.thumbTip[1] + h.pts.indexTip[1]) / 2] : a;
  const pinch = h?.pinch ?? 0;
  const text = String(it.text || 'Your question');
  const sub = it.sub ? String(it.sub) : 'QUESTION';
  const pad = r[2] * 0.08;
  const fs = fit(text, r[2] - pad * 2, r[3] * 0.3, 400, st.tracking);
  const cx = grip ? Math.max(r[0], Math.min(r[0] + r[2], grip[0])) : 0, cy = grip ? Math.max(r[1], Math.min(r[1] + r[3], grip[1])) : 0;
  const lit = 0.35 + 0.65 * Math.min(1, pinch * 1.4);
  const initial = (String(it.label || text).trim()[0] || 'Q').toUpperCase();
  return (
    <div style={{position: 'absolute', inset: 0, opacity: 1 - out}}>
      {grip && (
        <svg style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}} width={1} height={1}>
          <line x1={grip[0]} y1={grip[1]} x2={grip[0] + (cx - grip[0]) * k} y2={grip[1] + (cy - grip[1]) * k} stroke={gold} strokeWidth={2.2 * u} opacity={0.9} />
          <circle cx={grip[0]} cy={grip[1]} r={10 * u} fill="none" stroke={gold} strokeWidth={2 * u} opacity={lit} />
          <circle cx={cx} cy={cy} r={6 * u} fill={gold} style={{filter: `drop-shadow(0 0 ${10 * u}px ${gold})`}} />
        </svg>
      )}
      <div style={{position: 'absolute', left: r[0], top: r[1], width: r[2], height: r[3], perspective: 900 * u}}>
        <div style={{position: 'absolute', inset: 0, transform: `rotateY(${tiltY}deg) rotateX(${tiltX}deg) scale(${0.7 + 0.3 * k})`, transformOrigin: grip && grip[0] < r[0] + r[2] / 2 ? '0% 50%' : '100% 50%', opacity: k01(lf, 0, 8)}}>
          {/* glass card: violet to coral edge light, dark body */}
          <div style={{position: 'absolute', inset: 0, borderRadius: 18 * u, background: `linear-gradient(135deg, rgba(155,123,216,0.42), rgba(18,14,26,0.78) 45%, rgba(224,96,90,0.35))`, border: `1.5px solid rgba(255,255,255,0.22)`, boxShadow: `0 ${20 * u}px ${60 * u}px rgba(0,0,0,0.45), 0 0 ${40 * u}px rgba(155,123,216,0.35), inset 0 1px 0 rgba(255,255,255,0.35)`}} />
          <div style={{position: 'absolute', left: -r[2] * 0.2, top: 0, width: r[2] * 0.35, height: '100%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent)', transform: `translateX(${((lf * 9 * u) % (r[2] * 1.6))}px) skewX(-18deg)`, borderRadius: 18 * u, mixBlendMode: 'screen'}} />
          <div style={{position: 'absolute', left: pad, top: r[3] * 0.12, width: r[3] * 0.2, height: r[3] * 0.2, borderRadius: '50%', background: `linear-gradient(135deg, ${col}, ${col2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', ...type(st, r[3] * 0.11, '#fff', 500)}}>{initial}</div>
          <div style={{position: 'absolute', left: pad + r[3] * 0.27, top: r[3] * 0.16, ...caps(st, Math.max(10, r[3] * 0.065), gold)}}>{sub}</div>
          <div style={{position: 'absolute', left: pad + r[3] * 0.27, top: r[3] * 0.25, height: 2 * u, width: r[2] * 0.3 * k01(lf, 6, 20), background: `linear-gradient(90deg, ${gold}, transparent)`}} />
          <div style={{position: 'absolute', left: pad, top: r[3] * 0.44, ...type(st, fs, ink, 400)}}>{text}</div>
          {/* typing dots under the line: it is a live question */}
          {[0, 1, 2].map((d) => <div key={d} style={{position: 'absolute', left: pad + d * 16 * u, top: r[3] * 0.44 + fs * 1.35, width: 8 * u, height: 8 * u, borderRadius: '50%', background: ink, opacity: 0.25 + 0.6 * Math.max(0, Math.sin(lf / 3 - d * 0.9))}} />)}
          {/* corner clamps: the corner nearest the hand lights when you pinch */}
          {[[0, 0], [1, 0], [0, 1], [1, 1]].map(([x, y], q) => {
            const near = grip ? (grip[0] > r[0] + r[2] / 2 ? 1 : 0) === x : false;
            const s = 26 * u;
            return <div key={q} style={{position: 'absolute', left: x ? r[2] - s : 0, top: y ? r[3] - s : 0, width: s, height: s, borderLeft: x ? undefined : `3px solid ${near ? gold : 'rgba(255,255,255,0.5)'}`, borderRight: x ? `3px solid ${near ? gold : 'rgba(255,255,255,0.5)'}` : undefined, borderTop: y ? undefined : `3px solid ${near ? gold : 'rgba(255,255,255,0.5)'}`, borderBottom: y ? `3px solid ${near ? gold : 'rgba(255,255,255,0.5)'}` : undefined, borderRadius: 6 * u, opacity: near ? lit : 0.6, filter: near ? `drop-shadow(0 0 ${8 * u}px ${gold})` : undefined}} />;
          })}
        </div>
      </div>
    </div>
  );
};
export default GrabCard;
