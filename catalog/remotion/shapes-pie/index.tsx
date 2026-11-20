// A pie from @remotion/shapes fills to the number you said, the number counts with it, a thin ring of ticks around.
import React from 'react';
import {makePie, makeCircle} from '@remotion/shapes';
import {Box, GraphicProps, HUE, caps, exitK, fit, hueOf, k01, numOf, type} from '../../../src/catalog/ui';

const ShapesPie: React.FC<GraphicProps> = ({it, r, lf, dur, st, ink, scrim, u}) => {
  const target = Math.max(0, Math.min(100, numOf(it, 50)));
  const D = Math.min(r[3], r[2] * 0.48);
  const k = k01(lf, 4, 30), out = exitK(lf, dur);
  const pie = makePie({radius: D * 0.42, progress: Math.max(0.0001, (target / 100) * k), rotation: -Math.PI / 2});
  const ring = makeCircle({radius: D * 0.48});
  const col = hueOf(it, HUE.teal);
  const label = String(it.text || it.unit || '');
  const fs = fit(`${Math.round(target)}%`, r[2] - D - 16 * u, D * 0.42, st.weight, st.tracking);
  return (
    <Box r={r} scrim={scrim} u={u} style={{opacity: 1 - out, transform: `scale(${1 - out * 0.08})`}}>
      <svg width={D} height={D} style={{position: 'absolute', left: 0, top: (r[3] - D) / 2, overflow: 'visible'}}>
        <g transform={`translate(${D * 0.02}, ${D * 0.02})`} opacity={k01(lf, 0, 10)}>
          <path d={ring.path} fill="none" stroke={ink} strokeOpacity={0.25} strokeWidth={1.5 * u} />
          {Array.from({length: 40}, (_, i) => {
            const a = (i / 40) * Math.PI * 2 - Math.PI / 2, on = i / 40 <= (target / 100) * k;
            const c = D * 0.48;
            return <line key={i} x1={c + Math.cos(a) * c * 0.92} y1={c + Math.sin(a) * c * 0.92} x2={c + Math.cos(a) * c} y2={c + Math.sin(a) * c} stroke={on ? st.accent : ink} strokeOpacity={on ? 1 : 0.25} strokeWidth={1.5 * u} />;
          })}
        </g>
        <path d={pie.path} transform={`translate(${D * 0.08}, ${D * 0.08})`} fill={col} fillOpacity={0.88} />
      </svg>
      <div style={{position: 'absolute', left: D + 16 * u, top: r[3] / 2 - fs * 0.75, ...type(st, fs, ink), fontVariantNumeric: 'tabular-nums'}}>{Math.round(target * k)}%</div>
      {label && <div style={{position: 'absolute', left: D + 18 * u, top: r[3] / 2 + fs * 0.42, ...caps(st, fit(label.toUpperCase(), r[2] - D - 20 * u, fs * 0.22, st.heavy, 0.22), st.accentHi), opacity: k01(lf, 16, 26)}}>{label}</div>}
    </Box>
  );
};
export default ShapesPie;
