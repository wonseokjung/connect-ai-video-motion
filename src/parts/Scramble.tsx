// Scramble-in text: letters cycle through random glyphs, then lock left to right.
// Our own code (CONNECT AI LAB). Deterministic: same frame = same letters.
import React from 'react';
import {random, useCurrentFrame, useVideoConfig} from 'remotion';

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/+-';

export const Scramble: React.FC<{
  text: string;
  start: number; // frame
  duration?: number; // seconds until every letter is locked
  style?: React.CSSProperties;
}> = ({text, start, duration = 0.3, style}) => {
  // keep duration ≤ 0.3 s so half-scrambled letters never read like a typo
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = (frame - start) / (duration * fps);
  if (t < 0) return <span style={{...style, opacity: 0}}>{text}</span>;
  const out = text
    .split('')
    .map((ch, i) => {
      if (ch === ' ') return ' ';
      const lockAt = (i + 1) / text.length;
      if (t >= lockAt) return ch;
      return GLYPHS[Math.floor(random(`${text}-${i}-${frame}`) * GLYPHS.length)];
    })
    .join('');
  return <span style={{...style, opacity: Math.min(1, t * 3)}}>{out}</span>;
};
