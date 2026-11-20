// A big thin word stands in the room BEHIND you: the person matte draws you again in front of it, so it reads like
// a set piece. Your face and body pixels are never changed.
import React from 'react';
import {GraphicProps, exitK, fit, k01, OUT} from '../../../src/catalog/ui';
import {FONT} from '../../../src/brand';

const BehindText: React.FC<GraphicProps> = ({it, r, lf, dur, st, u}) => {
  const text = String(it.text || 'Vibe coding');
  const fs = fit(text, r[2] * 0.9, r[3] * 0.8, 200, -0.02);
  const k = k01(lf, 0, 26, OUT), out = exitK(lf, dur, 14);
  return (
    <div style={{position: 'absolute', left: r[0], top: r[1], width: r[2], height: r[3], display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'visible'}}>
      <div style={{fontFamily: FONT, fontWeight: st.weight, fontSize: fs, letterSpacing: `${-0.02 + 0.06 * (1 - k)}em`, lineHeight: 1, whiteSpace: 'nowrap', color: it.color || st.accentHi, opacity: k * (1 - out) * 0.96, transform: `translateY(${(1 - k) * 30 * u}px)`, textShadow: `0 0 ${40 * u}px rgba(214,137,42,0.35)`}}>{text}</div>
    </div>
  );
};
export default BehindText;
