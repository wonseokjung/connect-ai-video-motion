// Letters fold up from below one after another, a GSAP timeline seeked by Remotion's frame (@remotion/gsap useGsapTimeline).
import React from 'react';
import {useGsapTimeline} from '@remotion/gsap';
import {Box, GraphicProps, exitK, fit, type} from '../../../src/catalog/ui';

const GsapLetters: React.FC<GraphicProps> = ({it, r, lf, dur, st, ink, scrim, u}) => {
  const text = String(it.text || 'Motion');
  const fs = fit(text, r[2] * 0.94, r[3] * 0.7, st.weight, st.tracking);
  const ref = useGsapTimeline<HTMLDivElement>(({timeline, selector}) => {
    timeline.from(selector('.ch'), {yPercent: 90, rotationX: -95, opacity: 0, transformOrigin: '50% 100% -20px', duration: 0.7, ease: 'back.out(1.6)', stagger: 0.05});
    timeline.to(selector('.ch:last-child'), {color: st.accentHi, duration: 0.3}, '-=0.2');
  }, {dependencies: [text]});
  return (
    <Box r={r} scrim={scrim} u={u} style={{opacity: 1 - exitK(lf, dur), perspective: 900}}>
      <div ref={ref} style={{position: 'absolute', left: 0, top: (r[3] - fs * 1.15) / 2, ...type(st, fs, ink), display: 'flex'}}>
        {[...text].map((c, i) => <span key={i} className="ch" style={{display: 'inline-block', whiteSpace: 'pre'}}>{c}</span>)}
      </div>
    </Box>
  );
};
export default GsapLetters;
