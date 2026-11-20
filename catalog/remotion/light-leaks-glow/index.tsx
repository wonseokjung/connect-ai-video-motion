// A warm light leak drifts across the room BEHIND the person (@remotion/light-leaks, WebGL); the person matte keeps
// him in front, so his face and body pixels are never touched.
import React from 'react';
import {LightLeak} from '@remotion/light-leaks';
import {GraphicProps, exitK, k01} from '../../../src/catalog/ui';

const LightLeaksGlow: React.FC<GraphicProps> = ({it, r, lf, dur}) => (
  <div style={{position: 'absolute', left: r[0], top: r[1], width: r[2], height: r[3], overflow: 'hidden', mixBlendMode: 'screen', opacity: Math.min(k01(lf, 0, 8), 1 - exitK(lf, dur, 12)) * (it.strength ?? 0.5)}}>
    <LightLeak durationInFrames={dur} seed={Number(it.seed ?? 3)} hueShift={Number(it.hue ?? 0)} />
  </div>
);
export default LightLeaksGlow;
