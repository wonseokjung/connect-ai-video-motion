// Two words in one card, the first turns into the second with a @remotion/transitions presentation.
// Used by catalog/remotion/transition-* (each item picks a different presentation).
import React from 'react';
import {TransitionSeries, linearTiming, TransitionPresentation} from '@remotion/transitions';
import {Box, GraphicProps, HUE, caps, exitK, fit, hueOf, k01, type} from '../../../src/catalog/ui';

export const TransitionWords: React.FC<GraphicProps & {make: (w: number, h: number) => TransitionPresentation<any>; ease?: (t: number) => number}> = ({it, r, lf, dur, st, ink, scrim, u, make, ease}) => {
  const a = String(it.text || 'Before'), b = String(it.sub || 'After');
  const col = hueOf(it, HUE.gold);
  const w = r[2], h = r[3];
  const T = Math.round(Math.min(18, dur * 0.3));
  const first = Math.max(T + 2, Math.round(dur * 0.62)); // the change happens a bit after the middle
  const card = (word: string, c: string, bg: string, tag: string) => {
    const fs = fit(word, w * 0.8, h * 0.42, st.weight, st.tracking);
    return (
      <div style={{position: 'absolute', inset: 0, background: bg, borderRadius: 14 * u, border: `1px solid ${c}55`, overflow: 'hidden'}}>
        <div style={{position: 'absolute', left: w * 0.08, top: h * 0.14, ...caps(st, Math.max(10, h * 0.09), c), opacity: 0.85}}>{tag}</div>
        <div style={{position: 'absolute', left: w * 0.08, top: h * 0.36, ...type(st, fs, word === b ? c : ink)}}>{word}</div>
      </div>
    );
  };
  const inK = k01(lf, 0, 10), out = exitK(lf, dur);
  return (
    <Box r={r} scrim={scrim} u={u} style={{opacity: inK * (1 - out), transform: `translateY(${(1 - inK) * 18 * u}px)`}}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={first}>{card(a, ink, 'rgba(11,10,9,0.78)', String(it.label || 'before'))}</TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={make(w, h)} timing={linearTiming({durationInFrames: T, easing: ease})} />
        <TransitionSeries.Sequence durationInFrames={Math.max(1, dur - first + T)}>{card(b, col, 'rgba(20,16,11,0.9)', String(it.label2 || 'after'))}</TransitionSeries.Sequence>
      </TransitionSeries>
    </Box>
  );
};
