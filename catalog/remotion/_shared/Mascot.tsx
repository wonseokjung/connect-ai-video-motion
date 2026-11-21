// A small robot character drawn only with @remotion/shapes (makeRect, makeEllipse, makeCircle) and moved by
// spring physics: it drops in, squashes, blinks, looks where you tell it and waves. Used by remotion/shapes-agents
// and body/hand-buddy. Pure SVG, so it stays sharp at any size.
import React from 'react';
import {spring} from 'remotion';
import {makeCircle, makeEllipse, makeRect} from '@remotion/shapes';

export type MascotProps = {
  size: number; // body width in px
  lf: number; // frame since it appears
  fps: number;
  body: string; // main colour
  face?: string; // screen colour
  eye?: string;
  look?: [number, number]; // -1..1 where the pupils look
  wave?: boolean;
  delay?: number;
  seed?: number;
};

export const Mascot: React.FC<MascotProps> = ({size: S, lf, fps, body, face = '#14121A', eye = '#7CF7E4', look = [0, 0], wave = false, delay = 0, seed = 0}) => {
  const t = lf - delay;
  const drop = spring({frame: t, fps, config: {damping: 9, stiffness: 140, mass: 0.7}});
  const land = spring({frame: t - 7, fps, config: {damping: 6, stiffness: 220}});
  const squash = t < 7 ? 1 : 1 - 0.16 * Math.sin(Math.min(1, land) * Math.PI) * Math.exp(-(t - 7) / 10);
  const bob = Math.sin((t + seed * 11) / 7) * S * 0.025;
  const blinkT = (t + seed * 17) % 46;
  const blink = blinkT > 40 && blinkT < 45 ? 0.12 : 1;
  const W = S, H = S * 0.86;
  const bodyP = makeRect({width: W, height: H, cornerRadius: S * 0.26}).path;
  const faceP = makeRect({width: W * 0.74, height: H * 0.5, cornerRadius: S * 0.16}).path;
  const eyeP = makeEllipse({rx: S * 0.07, ry: S * 0.085 * blink}).path;
  const ball = makeCircle({radius: S * 0.07}).path;
  const cheek = makeEllipse({rx: S * 0.06, ry: S * 0.03}).path;
  const arm = wave ? Math.sin(t / 3.2) * 34 - 30 : Math.sin((t + seed * 5) / 9) * 8;
  const lx = look[0] * S * 0.05, ly = look[1] * S * 0.04;
  const y0 = (1 - drop) * -S * 1.6;
  return (
    <svg width={S * 1.5} height={S * 1.6} viewBox={`${-S * 0.25} ${-S * 0.45} ${S * 1.5} ${S * 1.6}`} style={{overflow: 'visible', opacity: t < 0 ? 0 : 1}}>
      <g transform={`translate(0 ${y0 + bob}) translate(${W / 2} ${H}) scale(${1 + (1 - squash) * 0.6} ${squash}) translate(${-W / 2} ${-H})`}>
        {/* antenna */}
        <line x1={W / 2} y1={0} x2={W / 2 + Math.sin(t / 5 + seed) * S * 0.05} y2={-S * 0.24} stroke={body} strokeWidth={S * 0.04} strokeLinecap="round" />
        <path d={ball} transform={`translate(${W / 2 - S * 0.07 + Math.sin(t / 5 + seed) * S * 0.05} ${-S * 0.31})`} fill={eye} style={{filter: `drop-shadow(0 0 ${S * 0.08}px ${eye})`}} />
        {/* arms */}
        <g transform={`translate(${-S * 0.02} ${H * 0.55}) rotate(${-arm})`}>
          <rect x={-S * 0.16} y={-S * 0.05} width={S * 0.18} height={S * 0.1} rx={S * 0.05} fill={body} />
        </g>
        <g transform={`translate(${W + S * 0.02} ${H * 0.55}) rotate(${wave ? 0 : arm})`}>
          <rect x={-S * 0.02} y={-S * 0.05} width={S * 0.18} height={S * 0.1} rx={S * 0.05} fill={body} />
        </g>
        {/* body + face screen */}
        <path d={bodyP} fill={body} />
        <path d={bodyP} fill="url(#mascotShine)" opacity={0.35} />
        <path d={faceP} transform={`translate(${W * 0.13} ${H * 0.16})`} fill={face} />
        <path d={eyeP} transform={`translate(${W * 0.34 - S * 0.07 + lx} ${H * 0.41 - S * 0.085 * blink + ly})`} fill={eye} style={{filter: `drop-shadow(0 0 ${S * 0.05}px ${eye})`}} />
        <path d={eyeP} transform={`translate(${W * 0.66 - S * 0.07 + lx} ${H * 0.41 - S * 0.085 * blink + ly})`} fill={eye} style={{filter: `drop-shadow(0 0 ${S * 0.05}px ${eye})`}} />
        <path d={cheek} transform={`translate(${W * 0.2 - S * 0.06} ${H * 0.72})`} fill="#FF8FB1" opacity={0.7} />
        <path d={cheek} transform={`translate(${W * 0.8 - S * 0.06} ${H * 0.72})`} fill="#FF8FB1" opacity={0.7} />
        <defs>
          <linearGradient id="mascotShine" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" />
            <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>
      </g>
      {/* shadow */}
      <ellipse cx={W / 2} cy={H + S * 0.06} rx={W * 0.42 * (0.4 + 0.6 * drop)} ry={S * 0.05} fill="rgba(0,0,0,0.35)" />
    </svg>
  );
};
