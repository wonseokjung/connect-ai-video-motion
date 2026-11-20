// A word flies in fast and stops, leaving a short motion trail behind it (@remotion/motion-blur Trail).
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {Trail} from '@remotion/motion-blur';
import {Box, GraphicProps, OUT, caps, exitK, fit, k01, type} from '../../../src/catalog/ui';

const Fly: React.FC<{w: number; h: number; text: string; sub: string; st: any; ink: string; u: number}> = ({w, h, text, sub, st, ink, u}) => {
  const f = useCurrentFrame(); // Trail draws this again at earlier frames, so it must read the frame itself
  const k = k01(f, 2, 16, OUT);
  const fs = fit(text, w * 0.92, h * 0.6, st.weight, st.tracking);
  return (
    <div style={{position: 'absolute', left: (1 - k) * -w * 0.9, top: (h - fs * 1.4) / 2, width: w}}>
      <div style={{...type(st, fs, ink)}}>{text}</div>
      {sub && <div style={{...caps(st, Math.max(10, fs * 0.2), st.accentHi), marginTop: fs * 0.06, opacity: k01(f, 14, 22)}}>{sub}</div>}
    </div>
  );
};

const MotionBlurTrail: React.FC<GraphicProps> = ({it, r, lf, dur, st, ink, scrim, u}) => (
  <Box r={r} scrim={scrim} u={u} style={{opacity: 1 - exitK(lf, dur), overflow: 'hidden'}}>
    <Trail layers={8} lagInFrames={0.8} trailOpacity={0.55}>
      <Fly w={r[2]} h={r[3]} text={String(it.text || 'Fast')} sub={String(it.sub || '')} st={st} ink={ink} u={u} />
    </Trail>
  </Box>
);
export default MotionBlurTrail;
