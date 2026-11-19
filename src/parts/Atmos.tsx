// Film grain + vignette + soft light pool. Graphics only, never on a face.
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';

export const LightPool: React.FC<{color: string; x?: number; y?: number; size?: number; strength?: number}> = ({
  color,
  x = 50,
  y = 58,
  size = 60,
  strength = 0.55,
}) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(ellipse ${size}% ${size * 0.8}% at ${x}% ${y}%, ${hexA(color, strength)} 0%, ${hexA(color, strength * 0.25)} 45%, transparent 75%)`,
    }}
  />
);

export const Vignette: React.FC<{amount?: number}> = ({amount = 0.75}) => (
  <AbsoluteFill
    style={{background: `radial-gradient(ellipse 75% 70% at 50% 50%, transparent 45%, rgba(0,0,0,${amount}) 100%)`}}
  />
);

// Deterministic grain: the noise seed changes every 2 frames.
export const Grain: React.FC<{opacity?: number}> = ({opacity = 0.07}) => {
  const frame = useCurrentFrame();
  const seed = Math.floor(frame / 2) % 97;
  return (
    <AbsoluteFill style={{opacity, mixBlendMode: 'overlay', pointerEvents: 'none'}}>
      <svg width="100%" height="100%">
        <filter id={`g${seed}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={seed} />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#g${seed})`} />
      </svg>
    </AbsoluteFill>
  );
};

export function hexA(hex: string, a: number) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
