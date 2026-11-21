// "One, two, three, bang": every time your hand comes down on a beat (a real down stroke of the measured hand),
// the next number slams into the room behind you, giant, on the side with more space, with the matching word from
// your list. The old number falls back into the room. Behind the person matte: your shoulder can cut into it.
import React from 'react';
import {GraphicProps, HUE, SNAP, exitK, hueOf, k01} from '../../../src/catalog/ui';
import {FONT} from '../../../src/brand';
import {lockSide, palmOf, pickHand, rigAt, tipOf, label} from '../../../src/catalog/rig';
import {downBeats} from '../../../src/core/body.mjs';

/** frames (since the graphic started) where the hand lands a beat (src/core/body.mjs downBeats on the finger tip height) */
const beatsOf = (L: any, side: string, upTo: number, u: number) => {
  const ys: (number | null)[] = [];
  for (let q = 0; q <= upTo + 3 && q < (L?.rig?.length || 0); q++) { const h = pickHand(rigAt(L, q, 2), side); ys.push((tipOf(h) || palmOf(h))?.[1] ?? null); }
  return downBeats(ys, 34 * u, 7).filter((q: number) => q <= upTo);
};

const COLS = [HUE.goldHi, HUE.coral, HUE.teal, HUE.violet, HUE.blue, HUE.leaf];

const BeatCount: React.FC<GraphicProps> = ({it, lf, dur, st, u, L, mainF, W, H}) => {
  const i = (mainF ?? 0) - (L?.f0 ?? 0);
  const side = lockSide(L, it.hand);
  const list = String(it.text || '').split(',').map((x) => x.trim()).filter(Boolean);
  const max = Math.max(1, Math.min(9, Number(it.value) || list.length || 5));
  const beats = beatsOf(L, side, i, u).slice(0, max);
  const out = exitK(lf, dur, 12);
  const r0 = rigAt(L, 0, 12);
  const face = r0?.face || [W * 0.4, H * 0.2, W * 0.2, H * 0.3];
  const fc = face[0] + face[2] / 2;
  const right = it.place ? it.place === 'right' : W - fc > fc;
  const NH = H * 0.74; // numeral height
  const x0 = right ? fc + face[2] * 0.55 : fc - face[2] * 0.55;
  const base = H * 0.86;
  const n = beats.length;
  const since = n ? i - beats[n - 1] : 0;
  const kk = n ? k01(since, 0, 9, SNAP) : 0;
  const numeral = (v: number, col: string, a: number, sc: number, dy: number, key: string, blur = 0) => (
    <div key={key} style={{position: 'absolute', left: right ? x0 : undefined, right: right ? undefined : W - x0, top: base - NH + dy, height: NH, fontFamily: FONT, fontSize: NH * 1.2, lineHeight: `${NH}px`, fontWeight: 300, letterSpacing: '-0.04em', color: 'transparent', WebkitTextStroke: `${4 * u}px ${col}`, backgroundImage: `linear-gradient(180deg, #FFF6E6 0%, ${col} 35%, ${col}33 100%)`, WebkitBackgroundClip: 'text', backgroundClip: 'text', opacity: a, transform: `scale(${sc})`, transformOrigin: right ? 'left bottom' : 'right bottom', filter: `drop-shadow(0 0 ${30 * u}px ${col}) ${blur ? `blur(${blur}px)` : ''}`}}>{v}</div>
  );
  const col = COLS[(n - 1 + COLS.length) % COLS.length];
  const word = list[n - 1];
  return (
    <div style={{position: 'absolute', inset: 0, opacity: (1 - out) * k01(lf, 0, 6)}}>
      {/* the number before falls back into the room */}
      {n > 1 && since < 14 && numeral(n - 1, COLS[(n - 2) % COLS.length], 0.6 * (1 - since / 14), 1 - 0.25 * (since / 14), -40 * u * (since / 14), 'prev', 6 * (since / 14))}
      {n > 0 && numeral(n, col, Math.min(1, kk * 1.5), 1.35 - 0.35 * kk, 0, 'now')}
      {/* the beat flash: a thin bar of light across the numeral on the hit */}
      {n > 0 && since < 10 && <div style={{position: 'absolute', left: right ? x0 - 40 * u : x0 - NH * 0.9, top: base - NH * 0.45, width: NH * 0.95, height: 4 * u, background: '#FFF6E6', boxShadow: `0 0 ${30 * u}px ${col}`, opacity: 1 - since / 10, transform: `scaleX(${0.4 + since / 10})`}} />}
      {/* tally: one slot per beat */}
      <div style={{position: 'absolute', left: right ? x0 + 10 * u : undefined, right: right ? undefined : W - x0 + 10 * u, top: base + 16 * u, display: 'flex', gap: 10 * u, flexDirection: right ? 'row' : 'row-reverse'}}>
        {Array.from({length: max}, (_, q) => <div key={q} style={{width: 34 * u, height: 6 * u, borderRadius: 3 * u, background: q < n ? COLS[q % COLS.length] : 'rgba(235,226,210,0.25)', boxShadow: q < n ? `0 0 ${10 * u}px ${COLS[q % COLS.length]}` : undefined}} />)}
      </div>
      {word && <div style={{position: 'absolute', left: right ? x0 + 10 * u : undefined, right: right ? undefined : W - x0 + 10 * u, top: base - NH - 10 * u, ...label(u, st, 30 * u, col), letterSpacing: '0.3em', opacity: kk}}>{word}</div>}
    </div>
  );
};
export default BeatCount;
