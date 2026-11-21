// A spirograph (hypotrochoid) draws itself in rainbow segments (@remotion/paths evolvePath) while the whole figure
// turns slowly; a pen point rides the tip. The word appears in the middle when the figure closes.
import React from 'react';
import {evolvePath, getLength, getPointAtLength} from '@remotion/paths';
import {Box, GraphicProps, exitK, fit, k01, textOf, type} from '../../../src/catalog/ui';

const HUES = ['#F43F5E', '#F97316', '#FACC15', '#4ADE80', '#22D3EE', '#818CF8', '#E879F9'];

const Spirograph: React.FC<GraphicProps> = ({it, r, lf, dur, st, ink, scrim, u}) => {
  const w = r[2], h = r[3];
  const S = Math.min(w, h);
  const R = 5, rr = 3, dd = 4.2; // closes after 3 turns
  const sc = (S * 0.46) / (R - rr + dd);
  const N = 540, turns = 3;
  const P = (t: number) => [w / 2 + ((R - rr) * Math.cos(t) + dd * Math.cos(((R - rr) / rr) * t)) * sc, h / 2 + ((R - rr) * Math.sin(t) - dd * Math.sin(((R - rr) / rr) * t)) * sc];
  const segs = HUES.length;
  const k = k01(lf, 0, 52), out = exitK(lf, dur);
  const paths = Array.from({length: segs}, (_, s) => {
    const a = Math.round((s / segs) * N), b = Math.round(((s + 1) / segs) * N);
    return Array.from({length: b - a + 1}, (_, i) => {
      const p = P(((a + i) / N) * Math.PI * 2 * turns);
      return `${i ? 'L' : 'M'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
    }).join(' ');
  });
  const text = textOf(it, '');
  const fs = text ? fit(text, S * 0.5, S * 0.16, st.weight, st.tracking) : 0;
  const pen = k * segs;
  const si = Math.min(segs - 1, Math.floor(pen)), sf = pen - si;
  const tip = getPointAtLength(paths[si], Math.max(0.01, Math.min(1, sf)) * getLength(paths[si]));
  return (
    <Box r={r} scrim={scrim} u={u} style={{opacity: 1 - out}}>
      <svg width={w} height={h} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', transform: `rotate(${lf * 0.6}deg)`, transformOrigin: `${w / 2}px ${h / 2}px`}}>
        {paths.map((d, s) => {
          const ks = Math.max(0, Math.min(1, pen - s));
          if (ks <= 0) return null;
          const ev = evolvePath(Math.max(0.001, ks), d);
          return <path key={s} d={d} fill="none" stroke={HUES[s]} strokeWidth={2.6 * u} strokeLinecap="round" strokeDasharray={ev.strokeDasharray} strokeDashoffset={ev.strokeDashoffset} style={{filter: `drop-shadow(0 0 ${5 * u}px ${HUES[s]})`}} />;
        })}
        {k < 1 && <circle cx={tip.x} cy={tip.y} r={6 * u} fill="#fff" style={{filter: `drop-shadow(0 0 ${10 * u}px ${HUES[si]})`}} />}
      </svg>
      {text && <div style={{position: 'absolute', left: 0, width: w, top: (h - fs * 1.12) / 2, textAlign: 'center', ...type(st, fs, ink, 600), opacity: k01(lf, 40, 52), transform: `scale(${0.85 + 0.15 * k01(lf, 40, 56)})`}}>{text}</div>}
    </Box>
  );
};
export default Spirograph;
