// A little robot character that follows your raised hand: it stands next to the hand on the side that is clear of
// your body, its eyes look at the hand and it waves, a dotted line ties it to the hand. Same layout as body/hand-tag
// (the hand is measured frame by frame), the character is the one from remotion/shapes-agents.
import React from 'react';
import {GraphicProps, caps, exitK, fit, hueOf, k01, type} from '../../../src/catalog/ui';
import {Mascot} from '../../remotion/_shared/Mascot';

const HandBuddy: React.FC<GraphicProps> = ({it, r, lf, dur, st, ink, u, fps, L, mainF}) => {
  const tr = L?.track?.[(mainF ?? 0) - (L?.f0 ?? 0)];
  const a = tr?.anchor;
  const col = hueOf(it, '#FF6B9D');
  const out = exitK(lf, dur);
  const text = it.text ? String(it.text) : '';
  const fs = text ? fit(text, r[2] * 1.2, r[3] * 0.2, st.weight, st.tracking) : 0;
  const S = Math.min(r[2] * 0.78, r[3] * (text ? 0.6 : 0.72));
  const cx = r[0] + r[2] / 2, cy = r[1] + r[3] * (text ? 0.62 : 0.55);
  const look: [number, number] = a ? [Math.max(-1, Math.min(1, (a[0] - cx) / (r[2] * 0.6))), Math.max(-1, Math.min(1, (a[1] - cy) / (r[3] * 0.6)))] : [0, 0];
  const ex = a ? Math.max(r[0], Math.min(r[0] + r[2], a[0])) : 0, ey = a ? Math.max(r[1], Math.min(r[1] + r[3], a[1])) : 0;
  const k = k01(lf, 0, 12);
  return (
    <div style={{position: 'absolute', inset: 0, opacity: 1 - out}}>
      {a && (
        <svg style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}} width={1} height={1}>
          <line x1={ex} y1={ey} x2={ex + (a[0] - ex) * 0.6 * k} y2={ey + (a[1] - ey) * 0.6 * k} stroke={col} strokeWidth={3 * u} strokeDasharray={`${2 * u} ${9 * u}`} strokeLinecap="round" />
          <circle cx={ex + (a[0] - ex) * 0.6 * k} cy={ey + (a[1] - ey) * 0.6 * k} r={6 * u * (1 + 0.25 * Math.sin(lf / 3))} fill={col} style={{filter: `drop-shadow(0 0 ${8 * u}px ${col})`}} />
        </svg>
      )}
      <div style={{position: 'absolute', left: cx - S * 0.75, top: cy - S * 0.75}}>
        <Mascot size={S} lf={lf} fps={fps} body={col} eye="#FFF3A3" look={look} wave />
      </div>
      {text && <div style={{position: 'absolute', left: r[0] - r[2] * 0.1, width: r[2] * 1.2, top: r[1], textAlign: 'center', ...type(st, fs, ink, 600), opacity: k01(lf, 10, 20)}}>{text}</div>}
      {it.sub && <div style={{position: 'absolute', left: r[0] - r[2] * 0.1, width: r[2] * 1.2, top: r[1] + fs * 1.2, textAlign: 'center', ...caps(st, Math.max(9, fs * 0.36), col), opacity: k01(lf, 14, 24)}}>{String(it.sub)}</div>}
    </div>
  );
};
export default HandBuddy;
