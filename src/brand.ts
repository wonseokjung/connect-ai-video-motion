// CONNECT AI LAB look: black × gold base, thin sans, subject colours on top.
import {loadFont} from '@remotion/google-fonts/Inter';

const inter = loadFont('normal', {weights: ['200', '300', '400'], subsets: ['latin']});

export const FONT = inter.fontFamily;

export const C = {
  black: '#0B0A09',
  ink: '#EBE2D2', // ivory text
  gold: '#D6892A',
  goldHi: '#F2B45A',
  dim: 'rgba(235,226,210,0.55)',
  rule: 'rgba(214,137,42,0.55)',
};

// Easing curves we use everywhere (slow, weighty).
export const EASE = {
  out: [0.16, 1, 0.3, 1] as const,
  inOut: [0.65, 0, 0.35, 1] as const,
};
