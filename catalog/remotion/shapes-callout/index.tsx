// A speech callout (@remotion/shapes makeCallout) grows from its pointer, the quote types in word by word.
import React from 'react';
import {makeCallout} from '@remotion/shapes';
import {evolvePath} from '@remotion/paths';
import {Box, GraphicProps, exitK, fit, k01, textOf, type} from '../../../src/catalog/ui';

const ShapesCallout: React.FC<GraphicProps> = ({it, r, lf, dur, st, ink, scrim, u, W}) => {
  const text = textOf(it, 'Quote');
  const words = text.split(/\s+/);
  const fromLeft = r[0] + r[2] / 2 > W / 2; // the pointer looks towards the person
  const pl = r[3] * 0.18;
  const w = r[2] - 4 * u, h = r[3] - pl - 4 * u;
  const c = makeCallout({width: w, height: h, pointerLength: pl, pointerBaseWidth: h * 0.3, pointerPosition: 0.72, pointerDirection: 'down', cornerRadius: h * 0.18});
  const grow = k01(lf, 0, 14), out = exitK(lf, dur);
  const draw = evolvePath(Math.max(0.001, k01(lf, 0, 20)), c.path);
  const fs = fit(text, w * 0.84, h * 0.46, st.weight, st.tracking);
  return (
    <Box r={r} scrim={scrim} u={u} style={{opacity: 1 - out, transform: `scale(${0.85 + 0.15 * grow})`, transformOrigin: `${fromLeft ? 28 : 72}% 100%`}}>
      <svg width={c.width} height={c.height} style={{position: 'absolute', left: 2 * u, top: 2 * u, overflow: 'visible', transform: fromLeft ? 'scaleX(-1)' : undefined, transformOrigin: '50% 50%'}}>
        <path d={c.path} fill="rgba(11,10,9,0.55)" fillOpacity={grow} stroke={st.accent} strokeWidth={1.5 * u} strokeDasharray={draw.strokeDasharray} strokeDashoffset={draw.strokeDashoffset} />
      </svg>
      <div style={{position: 'absolute', left: 0, width: w, top: h / 2 - fs * 0.62, textAlign: 'center', ...type(st, fs, ink)}}>
        {words.map((x, i) => (
          <span key={i} style={{opacity: k01(lf, 8 + i * 4, 14 + i * 4), marginRight: i < words.length - 1 ? fs * 0.26 : 0}}>{x}</span>
        ))}
      </div>
    </Box>
  );
};
export default ShapesCallout;
