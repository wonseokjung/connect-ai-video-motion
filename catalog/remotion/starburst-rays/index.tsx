// Sun rays turn slowly behind a big number (@remotion/starburst, WebGL); the number counts up in front.
import React from 'react';
import {Starburst} from '@remotion/starburst';
import {Box, GraphicProps, HUE, caps, exitK, fit, hueOf, k01, numOf, type} from '../../../src/catalog/ui';

const StarburstRays: React.FC<GraphicProps> = ({it, r, lf, dur, st, ink, scrim, u}) => {
  const v = numOf(it, 100), k = k01(lf, 4, 28), out = exitK(lf, dur);
  const col = hueOf(it, HUE.gold);
  const txt = `${Number.isInteger(v) ? Math.round(v * k) : (v * k).toFixed(1)}${it.unit && String(it.unit).length <= 2 ? it.unit : ''}`;
  const fs = fit(String(it.value ?? v), r[2] * 0.6, r[3] * 0.5, st.weight, st.tracking);
  return (
    <Box r={r} scrim={scrim} u={u} style={{opacity: 1 - out}}>
      <div style={{position: 'absolute', inset: 0, borderRadius: r[3] * 0.08, overflow: 'hidden', opacity: k01(lf, 0, 12) * 0.9, WebkitMaskImage: 'radial-gradient(closest-side, #000 55%, transparent 100%)', maskImage: 'radial-gradient(closest-side, #000 55%, transparent 100%)'}}>
        <Starburst rays={14} colors={[col, '#0B0A09']} rotation={lf * 0.6} smoothness={0.2} vignette={0.6} />
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: (r[3] - fs * 1.1) / 2, textAlign: 'center', ...type(st, fs, ink), fontVariantNumeric: 'tabular-nums', textShadow: '0 0 30px rgba(0,0,0,0.6)'}}>{txt}</div>
      {it.unit && String(it.unit).length > 2 && <div style={{position: 'absolute', left: 0, right: 0, top: (r[3] + fs) / 2, textAlign: 'center', ...caps(st, Math.max(10, fs * 0.2), st.accentHi), opacity: k01(lf, 18, 28)}}>{String(it.unit)}</div>}
    </Box>
  );
};
export default StarburstRays;
