// Generative geometry: a field of thin lines grows through a moving Perlin-like noise field (@remotion/noise noise3D),
// every line follows the flow, colours run across a gradient. The word sits on top. No particles, all strokes.
import React from 'react';
import {noise3D} from '@remotion/noise';
import {Box, GraphicProps, exitK, fit, k01, textOf, type} from '../../../src/catalog/ui';

const PAL = [['#7C3AED', '#22D3EE'], ['#F472B6', '#FBBF24'], ['#22D3EE', '#A3E635']];

const FlowField: React.FC<GraphicProps> = ({it, r, lf, dur, st, ink, scrim, u}) => {
  const w = r[2], h = r[3];
  const pal = PAL[Math.abs(Number(it.palette ?? 0)) % PAL.length];
  const out = exitK(lf, dur, 12);
  const grow = k01(lf, 0, 36);
  const cols = 15, rows = 10, steps = 42;
  const stepLen = Math.min(w, h) * 0.022;
  const lines: {d: string; c: number}[] = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    let x = ((i + 0.5 + 0.35 * noise3D('jx', i, j, 0)) / cols) * w;
    let y = ((j + 0.5 + 0.35 * noise3D('jy', i, j, 0)) / rows) * h;
    const pts = [`M ${x.toFixed(1)} ${y.toFixed(1)}`];
    const n = Math.max(2, Math.round(steps * grow));
    for (let s = 0; s < n; s++) {
      const a = noise3D('flow', x / (w * 0.45), y / (h * 0.45), lf / 70) * Math.PI * 2.2;
      x += Math.cos(a) * stepLen;
      y += Math.sin(a) * stepLen;
      pts.push(`L ${x.toFixed(1)} ${y.toFixed(1)}`);
    }
    lines.push({d: pts.join(' '), c: (i / cols + j / rows) / 2});
  }
  const text = textOf(it, '');
  const fs = text ? fit(text, w * 0.86, h * 0.3, st.weight, st.tracking) : 0;
  return (
    <Box r={r} scrim={scrim} u={u} style={{opacity: 1 - out}}>
      <svg width={w} height={h} style={{position: 'absolute', left: 0, top: 0, maskImage: 'radial-gradient(ellipse at center, black 50%, transparent 78%)', WebkitMaskImage: 'radial-gradient(ellipse at center, black 50%, transparent 78%)'}}>
        <defs>
          <linearGradient id="ffG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={pal[0]} /><stop offset="1" stopColor={pal[1]} /></linearGradient>
        </defs>
        {lines.map((l, i) => <path key={i} d={l.d} fill="none" stroke="url(#ffG)" strokeWidth={(1.6 + 2.2 * l.c) * u} strokeLinecap="round" opacity={0.55 + 0.45 * l.c} />)}
      </svg>
      {text && <div style={{position: 'absolute', left: 0, width: w, top: (h - fs * 1.12) / 2, textAlign: 'center', ...type(st, fs, ink, 600), textShadow: `0 0 ${18 * u}px ${pal[0]}`, opacity: k01(lf, 14, 26), transform: `scale(${0.94 + 0.06 * k01(lf, 14, 30)})`}}>{text}</div>}
    </Box>
  );
};
export default FlowField;
