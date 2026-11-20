// Shared pieces for catalog graphics: timing curves, type fitting, the props every graphic gets.
// Every catalog component receives GraphicProps and must stay inside its box `r` (plus meta.bleed).
import React from 'react';
import {Easing, interpolate} from 'remotion';
import {fitText} from '@remotion/layout-utils';
import {FONT} from '../brand';

export type GraphicProps = {
  it: any; // the plan line (text, value, sub, unit, label ...) + it.meta (the catalog meta.json)
  r: number[]; // [x, y, w, h] in output px: the empty place the layout engine found
  lf: number; // frame inside the graphic (0 = its word)
  dur: number; // frames on screen
  st: any; // style tokens (styles/presets.mjs): ink, accent, accentHi, weight, tracking ...
  ink: string; // text colour picked by the contrast check
  scrim: number; // 0..0.8: how much dark halo the spot needs
  u: number; // 1 = 1080 px short side
  fps: number;
  W: number;
  H: number;
  L?: any; // the layout item (track for body graphics, contour, tips)
  mainF?: number; // frame of the whole video
};

export {FONT};
export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
export const OUT = Easing.bezier(0.16, 1, 0.3, 1);
export const IN = Easing.bezier(0.55, 0, 1, 0.45);
export const SNAP = Easing.bezier(0.34, 1.56, 0.64, 1); // a little overshoot, for stamps
export const k01 = (lf: number, a: number, b: number, e: (t: number) => number = OUT) => interpolate(lf, [a, b], [0, 1], {...clamp, easing: e});
export const exitK = (lf: number, dur: number, d = 9) => k01(lf, dur - d, dur, IN);
export const halo = (scrim: number, u: number) =>
  scrim > 0 ? `drop-shadow(0 0 ${10 * u}px rgba(0,0,0,${Math.min(1, scrim * 1.5).toFixed(3)})) drop-shadow(0 0 ${36 * u}px rgba(0,0,0,${Math.min(1, scrim * 1.2).toFixed(3)}))` : undefined;

export const fit = (text: string, width: number, size: number, weight = 200, tracking = 0) => {
  try {
    return Math.min(size, fitText({text: text || 'X', withinWidth: width, fontFamily: FONT, fontWeight: weight, letterSpacing: `${tracking}em`, validateFontIsLoaded: false}).fontSize);
  } catch {
    return size;
  }
};

// subject colours (2-3 per scene, each with one meaning); gold stays the brand accent
export const HUE = {gold: '#D6892A', goldHi: '#F2B45A', ivory: '#EBE2D2', teal: '#3FB7A6', coral: '#E0605A', blue: '#4C8CC6', violet: '#9B7BD8', leaf: '#7FB069', ink: '#0B0A09'};
export const hueOf = (it: any, d: string) => (it.color && (HUE as any)[it.color]) || it.color || d;

export const Box: React.FC<{r: number[]; children?: React.ReactNode; style?: React.CSSProperties; scrim?: number; u?: number}> = ({r, children, style, scrim = 0, u = 1}) => (
  <div style={{position: 'absolute', left: r[0], top: r[1], width: r[2], height: r[3], ...style, filter: [halo(scrim, u), style?.filter].filter(Boolean).join(' ') || undefined}}>{children}</div>
);

export const type = (st: any, fs: number, color: string, weight?: number): React.CSSProperties => ({fontFamily: FONT, fontSize: fs, fontWeight: weight ?? st.weight, letterSpacing: `${st.tracking}em`, color, whiteSpace: 'nowrap', lineHeight: 1.12});
export const caps = (st: any, fs: number, color: string): React.CSSProperties => ({fontFamily: FONT, fontSize: fs, fontWeight: st.heavy, letterSpacing: '0.22em', textTransform: 'uppercase', color, whiteSpace: 'nowrap', lineHeight: 1.2});

export const textOf = (it: any, d = '') => String(it.text ?? it.value ?? d);
export const numOf = (it: any, d = 0) => {
  const n = parseFloat(String(it.value ?? '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : d;
};
