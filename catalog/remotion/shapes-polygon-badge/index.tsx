// A hexagon (@remotion/shapes makePolygon) draws its outline with @remotion/paths evolvePath, turns a little, the word rises inside.
import React from 'react';
import {makePolygon} from '@remotion/shapes';
import {evolvePath} from '@remotion/paths';
import {Box, GraphicProps, HUE, exitK, fit, hueOf, k01, textOf, type} from '../../../src/catalog/ui';

const PolygonBadge: React.FC<GraphicProps> = ({it, r, lf, dur, st, ink, scrim, u}) => {
  const text = textOf(it, 'Idea');
  const D = Math.min(r[3], r[2]);
  const poly = makePolygon({points: 6, radius: D * 0.46, edgeRoundness: null, cornerRadius: D * 0.04});
  const draw = evolvePath(Math.max(0.001, k01(lf, 0, 22)), poly.path);
  const out = exitK(lf, dur);
  const col = hueOf(it, HUE.violet);
  const fs = fit(text, D * 0.7, D * 0.3, st.weight, st.tracking);
  const rise = k01(lf, 10, 24);
  return (
    <Box r={r} scrim={scrim} u={u} style={{opacity: 1 - out}}>
      <svg width={D} height={D} style={{position: 'absolute', left: (r[2] - D) / 2, top: (r[3] - D) / 2, overflow: 'visible', transform: `rotate(${(1 - k01(lf, 0, 30)) * -30 + out * 20}deg)`}}>
        <path d={poly.path} transform={`translate(${D * 0.04}, ${D * 0.04})`} fill={col} fillOpacity={0.14 * k01(lf, 12, 26)} stroke={col} strokeWidth={2.5 * u} strokeDasharray={draw.strokeDasharray} strokeDashoffset={draw.strokeDashoffset} strokeLinejoin="round" />
        <path d={makePolygon({points: 6, radius: D * 0.38}).path} transform={`translate(${D * 0.12}, ${D * 0.12})`} fill="none" stroke={st.accent} strokeOpacity={0.6 * k01(lf, 14, 28)} strokeWidth={1 * u} />
      </svg>
      <div style={{position: 'absolute', left: 0, right: 0, top: r[3] / 2 - fs * 0.6, height: fs * 1.2, overflow: 'hidden', textAlign: 'center'}}>
        <div style={{...type(st, fs, ink), transform: `translateY(${(1 - rise) * 100}%)`}}>{text}</div>
      </div>
    </Box>
  );
};
export default PolygonBadge;
