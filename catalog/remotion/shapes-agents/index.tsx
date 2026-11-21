// Three little agent robots (drawn with @remotion/shapes, moved by spring physics) drop in one by one and pass a
// glowing ball down the line, the word lands above them. For "my agents", "teamwork", "they work together".
import React from 'react';
import {Box, GraphicProps, caps, exitK, fit, k01, textOf, type} from '../../../src/catalog/ui';
import {Mascot} from '../_shared/Mascot';

const BODIES = ['#FF6B6B', '#4ADE80', '#7C83FF'];
const EYES = ['#FFE66D', '#7CF7E4', '#FFB3F0'];

const Agents: React.FC<GraphicProps> = ({it, r, lf, dur, st, ink, scrim, u, fps}) => {
  const text = textOf(it, 'Teamwork');
  const out = exitK(lf, dur);
  const S = Math.min(r[2] / 3.9, r[3] * 0.42);
  const gap = (r[2] - S * 3) / 3;
  const xs = [0, 1, 2].map((i) => gap / 2 + i * (S + gap));
  const yb = r[3] - S * 0.95;
  // ball hops 0 -> 1 -> 2 -> 1 ... along arcs, after everyone has landed
  const T = Math.max(0, lf - 26), hop = 14;
  const leg = Math.floor(T / hop), ph = (T % hop) / hop;
  const seq = [0, 1, 2, 1];
  const a = seq[leg % 4], b = seq[(leg + 1) % 4];
  const bx = xs[a] + (xs[b] - xs[a]) * ph + S / 2, by = yb - S * 0.55 - Math.sin(ph * Math.PI) * S * 0.7;
  const holder = ph < 0.5 ? a : b;
  const fs = fit(text, r[2] * 0.9, r[3] * 0.24, st.weight, st.tracking);
  return (
    <Box r={r} scrim={scrim} u={u} style={{opacity: 1 - out}}>
      <div style={{position: 'absolute', left: 0, width: r[2], top: 0, textAlign: 'center', ...type(st, fs, ink, 600), transform: `translateY(${(1 - k01(lf, 18, 32)) * 20}px)`, opacity: k01(lf, 18, 30)}}>{text}</div>
      {xs.map((x, i) => (
        <div key={i} style={{position: 'absolute', left: x - S * 0.25, top: yb - S * 0.45}}>
          <Mascot size={S} lf={lf} fps={fps} body={BODIES[i]} eye={EYES[i]} delay={i * 6} seed={i} look={[Math.max(-1, Math.min(1, (bx - (x + S / 2)) / S)), -0.6]} wave={lf > 26 && holder === i} />
        </div>
      ))}
      {lf > 26 && (
        <div style={{position: 'absolute', left: bx - S * 0.11, top: by - S * 0.11, width: S * 0.22, height: S * 0.22, borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%, #FFFFFF, #FFE66D 45%, #FF9F1C)', boxShadow: `0 0 ${S * 0.25}px #FFD23F`}} />
      )}
      {it.sub && <div style={{position: 'absolute', left: 0, width: r[2], top: fs * 1.25, textAlign: 'center', ...caps(st, Math.max(10, fs * 0.28), '#7CF7E4'), opacity: k01(lf, 24, 34)}}>{String(it.sub)}</div>}
    </Box>
  );
};
export default Agents;
