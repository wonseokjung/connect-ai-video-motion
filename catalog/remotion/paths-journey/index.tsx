// A to B: a dot travels along a curved path (@remotion/paths getPointAtLength, getTangentAtLength) from the first word to the second.
import React from 'react';
import {evolvePath, getLength, getPointAtLength, getTangentAtLength} from '@remotion/paths';
import {Box, GraphicProps, HUE, caps, exitK, fit, k01, type} from '../../../src/catalog/ui';

const Journey: React.FC<GraphicProps> = ({it, r, lf, dur, st, ink, scrim, u}) => {
  const a = String(it.text || 'Start'), b = String(it.sub || 'Goal');
  const w = r[2], h = r[3];
  const fs = fit(a.length > b.length ? a : b, w * 0.42, h * 0.24, st.weight, st.tracking);
  const d = `M ${w * 0.08} ${h * 0.7} C ${w * 0.3} ${h * 0.1}, ${w * 0.55} ${h * 1.0}, ${w * 0.92} ${h * 0.32}`;
  const len = getLength(d);
  const k = k01(lf, 6, Math.min(dur - 12, 44));
  const p = getPointAtLength(d, len * k) || {x: 0, y: 0}, tg = getTangentAtLength(d, len * Math.max(0.001, k)) || {x: 1, y: 0};
  const ev = evolvePath(Math.max(0.001, k), d);
  const out = exitK(lf, dur);
  return (
    <Box r={r} scrim={scrim} u={u} style={{opacity: 1 - out}}>
      <svg width={w} height={h} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        <path d={d} fill="none" stroke={ink} strokeOpacity={0.22} strokeWidth={1.5 * u} strokeDasharray={`${4 * u} ${6 * u}`} />
        <path d={d} fill="none" stroke={st.accent} strokeWidth={2.5 * u} strokeDasharray={ev.strokeDasharray} strokeDashoffset={ev.strokeDashoffset} />
        <circle cx={w * 0.08} cy={h * 0.7} r={6 * u} fill={HUE.teal} opacity={k01(lf, 0, 8)} />
        <circle cx={w * 0.92} cy={h * 0.32} r={6 * u} fill="none" stroke={st.accentHi} strokeWidth={2 * u} opacity={k01(lf, 0, 8)} />
        <g transform={`translate(${p.x}, ${p.y}) rotate(${(Math.atan2(tg.y, tg.x) * 180) / Math.PI})`}>
          <path d={`M ${-9 * u} ${-6 * u} L ${9 * u} 0 L ${-9 * u} ${6 * u} Z`} fill={st.accentHi} />
        </g>
      </svg>
      <div style={{position: 'absolute', left: w * 0.02, top: h * 0.76, ...type(st, fs, ink)}}>{a}</div>
      <div style={{position: 'absolute', right: w * 0.02, top: h * 0.32 - fs * 1.5, ...type(st, fs, k > 0.98 ? st.accentHi : ink), opacity: 0.4 + 0.6 * k01(lf, 30, 44)}}>{b}</div>
      {it.label && <div style={{position: 'absolute', left: w * 0.4, top: h * 0.02, ...caps(st, fs * 0.3, st.accentHi)}}>{it.label}</div>}
    </Box>
  );
};
export default Journey;
