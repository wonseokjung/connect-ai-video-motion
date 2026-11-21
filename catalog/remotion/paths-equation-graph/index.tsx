// Math on screen: a grid and axes draw on, then a curve draws itself (@remotion/paths evolvePath) with a glowing
// point riding its tip (getPointAtLength), the area under it fills with a gradient. Curves: rise | wave | bell.
import React from 'react';
import {evolvePath, getLength, getPointAtLength} from '@remotion/paths';
import {Box, GraphicProps, caps, exitK, fit, k01, textOf, type} from '../../../src/catalog/ui';

const CURVES: Record<string, (x: number) => number> = {
  rise: (x) => (Math.exp(3.2 * x) - 1) / (Math.exp(3.2) - 1),
  wave: (x) => 0.5 + 0.38 * Math.sin(x * Math.PI * 3.2) * (1 - 0.5 * x),
  bell: (x) => Math.exp(-((x - 0.5) ** 2) / 0.03),
};
const LABEL: Record<string, string> = {rise: 'y = eˣ', wave: 'y = sin x', bell: 'y = e^(−x²)'};

const EquationGraph: React.FC<GraphicProps> = ({it, r, lf, dur, st, ink, scrim, u}) => {
  const kind = CURVES[it.curve] ? it.curve : 'rise';
  const f = CURVES[kind];
  const w = r[2], h = r[3];
  const pad = w * 0.06, x0 = pad, x1 = w - pad, y0 = h * 0.92, y1 = h * 0.22;
  const n = 64;
  const d = Array.from({length: n + 1}, (_, i) => {
    const t = i / n;
    return `${i ? 'L' : 'M'} ${(x0 + t * (x1 - x0)).toFixed(1)} ${(y0 - f(t) * (y0 - y1)).toFixed(1)}`;
  }).join(' ');
  const kAx = k01(lf, 0, 12), kC = k01(lf, 8, 40), out = exitK(lf, dur);
  const ax = `M ${x0} ${y1 - h * 0.06} L ${x0} ${y0} L ${x1 + pad * 0.5} ${y0}`;
  const evA = evolvePath(Math.max(0.001, kAx), ax), evC = evolvePath(Math.max(0.001, kC), d);
  const L = getLength(d), tip = getPointAtLength(d, Math.max(0.01, kC * L));
  const area = `${d} L ${x1} ${y0} L ${x0} ${y0} Z`;
  const text = textOf(it, 'Growth');
  const fs = fit(text, w * 0.7, h * 0.16, st.weight, st.tracking);
  const formula = it.formula ?? LABEL[kind];
  return (
    <Box r={r} scrim={scrim} u={u} style={{opacity: 1 - out}}>
      <svg width={w} height={h} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        <defs>
          <linearGradient id="egL" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#22D3EE" /><stop offset="0.5" stopColor="#A78BFA" /><stop offset="1" stopColor="#F472B6" /></linearGradient>
          <linearGradient id="egA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#A78BFA" stopOpacity={0.45} /><stop offset="1" stopColor="#22D3EE" stopOpacity={0} /></linearGradient>
          <clipPath id="egClip"><rect x={0} y={0} width={tip.x} height={h} /></clipPath>
        </defs>
        {Array.from({length: 7}, (_, i) => <line key={'v' + i} x1={x0 + (i / 6) * (x1 - x0)} x2={x0 + (i / 6) * (x1 - x0)} y1={y1} y2={y0} stroke="rgba(255,255,255,0.09)" strokeWidth={1} opacity={k01(lf, i, i + 10)} />)}
        {Array.from({length: 5}, (_, i) => <line key={'h' + i} x1={x0} x2={x1} y1={y1 + (i / 4) * (y0 - y1)} y2={y1 + (i / 4) * (y0 - y1)} stroke="rgba(255,255,255,0.09)" strokeWidth={1} opacity={k01(lf, i, i + 10)} />)}
        <path d={ax} fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth={2 * u} strokeDasharray={evA.strokeDasharray} strokeDashoffset={evA.strokeDashoffset} />
        <path d={area} fill="url(#egA)" clipPath="url(#egClip)" />
        <path d={d} fill="none" stroke="url(#egL)" strokeWidth={5 * u} strokeLinecap="round" strokeDasharray={evC.strokeDasharray} strokeDashoffset={evC.strokeDashoffset} style={{filter: `drop-shadow(0 0 ${8 * u}px #A78BFA)`}} />
        {kC > 0.01 && <line x1={tip.x} x2={tip.x} y1={tip.y} y2={y0} stroke="#F472B6" strokeWidth={1.2 * u} strokeDasharray={`${3 * u} ${4 * u}`} opacity={0.8} />}
        {kC > 0.01 && <circle cx={tip.x} cy={tip.y} r={7 * u} fill="#fff" style={{filter: `drop-shadow(0 0 ${10 * u}px #F472B6)`}} />}
      </svg>
      <div style={{position: 'absolute', left: x0 + w * 0.03, top: 0, ...type(st, fs, ink, 500), clipPath: `inset(0 ${(1 - k01(lf, 4, 18)) * 100}% 0 0)`}}>{text}</div>
      {formula && <div style={{position: 'absolute', right: pad, top: y1 + h * 0.02, ...caps(st, Math.max(10, fs * 0.36), '#F9A8D4'), textTransform: 'none', letterSpacing: '0.06em', fontStyle: 'italic', opacity: k01(lf, 30, 42)}}>{String(formula)}</div>}
    </Box>
  );
};
export default EquationGraph;
