// The seven graphics. Each has three layers: (1) the main type or number, (2) a support element that fits the kind
// (rule, ticks, small caps label, progress dots), (3) its own entry move. Exits are short and clean, not the entry reversed.
// Type sits straight on the video (no box, no frame); a soft gradient backing appears only when the contrast check asks.
// Every graphic stays inside the box the layout engine gave it (fitText caps the type). Origins: NOTICE.md.
import React from 'react';
import {Easing, interpolate, OffthreadVideo, random, staticFile} from 'remotion';
import {fitText} from '@remotion/layout-utils';
import {evolvePath} from '@remotion/paths';
import {Circle} from '@remotion/rough-notation';
import {Scramble} from '../parts/Scramble';
import {Grain} from '../parts/Atmos';
import {FONT} from '../brand';
import {TIMING} from '../styles/presets.mjs';
import {arrowPath, wheelStops} from '../vendor/hf.mjs';
import {parseNum, showNum} from '../vendor/facecam.mjs';
import {arrowFrom} from '../core/layout.mjs';

export type GProps = {
  it: any; // plan item
  r: number[]; // [x,y,w,h] output px
  lf: number; // frame inside the graphic
  dur: number; // frames
  st: any; // style tokens
  ink: string;
  scrim: number;
  u: number;
  fps: number;
  video?: {src: string; srcW: number; srcH: number; scale: number; camX: number; startFrame: number} | null;
  series?: {index: number; total: number} | null;
  target?: number[] | null;
};

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const OUT = Easing.bezier(0.16, 1, 0.3, 1); // land: ease out (motionmaxxing)
const IN = Easing.bezier(0.55, 0, 1, 0.45); // leave: accelerate
const k01 = (lf: number, a: number, b: number, e: (t: number) => number = OUT) => interpolate(lf, [a, b], [0, 1], {...clamp, easing: e});
export const enterK = (lf: number, d = TIMING.enter, at = 0) => k01(lf, at, at + d);
export const exitK = (lf: number, dur: number, d = 9) => k01(lf, dur - d, dur, IN);

const fit = (text: string, width: number, size: number, weight: number, tracking = 0) => {
  try {
    return Math.min(size, fitText({text: text || 'X', withinWidth: width, fontFamily: FONT, fontWeight: weight, letterSpacing: `${tracking}em`, validateFontIsLoaded: false}).fontSize);
  } catch {
    return size;
  }
};

// backing with no edge: a soft dark halo that follows the letters and lines, only when the contrast check
// says the spot is too bright for the type. No box, no blob.
const halo = (scrim: number, u: number) =>
  scrim > 0 ? `drop-shadow(0 0 ${10 * u}px rgba(0,0,0,${Math.min(1, scrim * 1.5).toFixed(3)})) drop-shadow(0 0 ${36 * u}px rgba(0,0,0,${Math.min(1, scrim * 1.2).toFixed(3)}))` : '';
const Backing: React.FC<{r: number[]; st: any; scrim: number; k: number}> = () => null;

const Box: React.FC<{r: number[]; children: React.ReactNode; style?: React.CSSProperties; scrim?: number; u?: number}> = ({r, children, style, scrim = 0, u = 1}) => (
  <div style={{position: 'absolute', left: r[0], top: r[1], width: r[2], height: r[3], ...style, filter: [halo(scrim, u), style?.filter].filter(Boolean).join(' ') || undefined}}>{children}</div>
);
const smallCaps = (st: any, size: number, color: string): React.CSSProperties => ({fontFamily: FONT, fontSize: size, fontWeight: st.heavy, letterSpacing: '0.22em', textTransform: 'uppercase', color, whiteSpace: 'nowrap', lineHeight: 1.2});

// letters rise out of a mask one after another (HyperFrames bottom-up-letters order)
const RiseLetters: React.FC<{text: string; lf: number; at: number; step?: number; style: React.CSSProperties}> = ({text, lf, at, step = 1.2, style}) => (
  <span style={{...style, display: 'inline-flex', overflow: 'hidden', paddingBottom: '0.06em', whiteSpace: 'nowrap'}}>
    {[...text].map((ch, i) => {
      const k = k01(lf, at + i * step, at + i * step + 11);
      return <span key={i} style={{display: 'inline-block', transform: `translateY(${(1 - k) * 110}%)`, whiteSpace: 'pre'}}>{ch}</span>;
    })}
  </span>
);

// 1. NAME TAG. Accent bar grows, the name pushes up out of a mask while it unscrambles (only graphic that scrambles),
//    a thin line draws, the role slides in in small caps. Order from HyperFrames lt-kicker-name. Exit: one clip wipe up.
export const NameTag: React.FC<GProps> = ({it, r, lf, dur, st, ink, scrim, u}) => {
  const name = String(it.text || ''), sub = String(it.sub || '');
  const fs0 = r[3] / (1.2 + 0.42 * 1.7 + 0.5);
  const fs = fit(name, r[2] * 0.9, fs0, st.weight, st.tracking);
  const subH = fs0 * 0.42 * 1.7, base = fs0 * 0.5;
  const bar = k01(lf, 0, 8), push = k01(lf, 3, 15), line = k01(lf, 9, 24), role = k01(lf, 14, 26);
  const out = exitK(lf, dur, 8);
  const pad = Math.max(fs * 0.4, 14 * u);
  return (
    <Box r={r} scrim={scrim} u={u} style={{clipPath: `inset(0 0 ${out * 100}% 0)`}}>
      <Backing r={r} st={st} scrim={scrim} k={push} />
      <div style={{position: 'absolute', left: 0, bottom: base, width: Math.max(3, 4 * u), height: (fs * 1.2 + subH) * bar, background: st.accent}} />
      <div style={{position: 'absolute', left: pad, bottom: base + subH, height: fs * 1.2, overflow: 'hidden'}}>
        <div style={{transform: `translateY(${(1 - push) * 100}%)`, fontFamily: FONT, fontSize: fs, fontWeight: st.weight, letterSpacing: `${st.tracking}em`, color: ink, whiteSpace: 'nowrap', lineHeight: 1.2}}>
          <Scramble text={name} start={3} />
        </div>
      </div>
      <div style={{position: 'absolute', left: pad, bottom: base + subH - 1, width: (r[2] - pad) * 0.8 * line, height: Math.max(1, 1.5 * u), background: ink, opacity: 0.4}} />
      {sub && <div style={{position: 'absolute', left: pad, bottom: base + fs0 * 0.1, ...smallCaps(st, fit(sub.toUpperCase(), (r[2] - pad) * 0.8, fs0 * 0.36, st.heavy, 0.22), st.accentHi), opacity: role, transform: `translateX(${(1 - role) * -28 * u}px)`}}>{sub}</div>}
    </Box>
  );
};

// 2. KEY WORD. Letters rise from a mask, one light sweep runs across them, a hairline draws under with an end tick.
//    Exit: lifts and goes soft in 9 frames.
export const KeyWord: React.FC<GProps> = ({it, r, lf, dur, st, ink, scrim, u}) => {
  const text = String(it.text || '');
  const fs = fit(text, r[2] * 0.96, r[3] / (1.14 + 0.34), st.weight, st.tracking);
  const out = exitK(lf, dur);
  const rule = k01(lf, 6, 22);
  const sweep = interpolate(lf, [10, 34], [-20, 120], clamp);
  const typeStyle: React.CSSProperties = {fontFamily: FONT, fontSize: fs, fontWeight: st.weight, letterSpacing: `${st.tracking}em`, lineHeight: 1.14};
  const w = Math.min(r[2], r[2] * 0.96);
  const sw = Math.max(2, fs * 0.018);
  return (
    <Box r={r} scrim={scrim} u={u} style={{opacity: 1 - out, transform: `translateY(${-out * 26 * u}px)`, filter: out > 0 ? `blur(${out * 12 * u}px)` : undefined}}>
      <Backing r={r} st={st} scrim={scrim} k={k01(lf, 0, 8)} />
      <div style={{position: 'absolute', left: 0, top: 0}}>
        <RiseLetters text={text} lf={lf} at={0} style={{...typeStyle, color: ink}} />
        <div style={{position: 'absolute', left: 0, top: 0, WebkitMaskImage: `linear-gradient(100deg, transparent ${sweep - 12}%, #000 ${sweep}%, transparent ${sweep + 12}%)`, maskImage: `linear-gradient(100deg, transparent ${sweep - 12}%, #000 ${sweep}%, transparent ${sweep + 12}%)`}}>
          <RiseLetters text={text} lf={lf} at={0} style={{...typeStyle, color: st.accentHi}} />
        </div>
      </div>
      <svg style={{position: 'absolute', left: 0, top: fs * 1.22, overflow: 'visible'}} width={r[2]} height={fs * 0.12}>
        <line x1={0} y1={0} x2={w * rule} y2={0} stroke={st.accent} strokeWidth={sw} />
        <line x1={w * rule} y1={-fs * 0.05} x2={w * rule} y2={fs * 0.05} stroke={st.accent} strokeWidth={sw} opacity={rule > 0.02 ? 1 : 0} />
      </svg>
    </Box>
  );
};

// 3. COUNTER. Digit strips roll (HyperFrames number-wheel) with blur by speed, a tick ruler fills with them,
//    the unit sits in small caps on the ruler. Number format from facecammaxxing. Exit: digits drop into their mask.
export const Counter: React.FC<GProps> = ({it, r, lf, dur, st, ink, scrim, u}) => {
  const target = parseNum(String(it.value ?? '0'));
  const shown = showNum(target.v, target.unit);
  const cols = wheelStops(shown, 0);
  const nd = cols.filter((c: any) => c.digit).length;
  const fs = fit(shown, r[2] * 0.8, r[3] / (1.06 + 0.42), st.weight, st.tracking);
  const A = 2, B = 24;
  const land = k01(lf, A, B, Easing.bezier(0.22, 1, 0.36, 1));
  const vel = lf > A && lf < B ? k01(lf + 1, A, B, Easing.bezier(0.22, 1, 0.36, 1)) - land : 0; // progress per frame
  const out = exitK(lf, dur, 8);
  const ticks = 25;
  const rulerW = r[2] * 0.62;
  const LH = 1.1;
  let di = 0;
  return (
    <Box r={r} scrim={scrim} u={u}>
      <div style={{position: 'absolute', left: 0, top: 0, height: fs * LH, overflow: 'hidden', display: 'flex', alignItems: 'flex-start', fontFamily: FONT, fontSize: fs, fontWeight: st.weight, letterSpacing: `${st.tracking}em`, lineHeight: LH, color: ink, fontVariantNumeric: 'tabular-nums'}}>
        {cols.map((c: any, i: number) => {
          const drop = `translateY(${out * 110}%)`;
          if (!c.digit) return <span key={i} style={{display: 'inline-block', height: `${LH}em`, transform: drop, opacity: land}}>{c.ch}</span>;
          const extra = nd - 1 - di++;
          const stops = c.stops + extra * 10;
          const blur = Math.min(fs * 0.12, vel * stops * fs * 0.6);
          const m = Math.min(1, vel * stops * 3);
          const roll = m > 0.02 ? `linear-gradient(180deg, rgba(0,0,0,${1 - m}) 0%, #000 ${18 + 14 * m}%, #000 ${82 - 14 * m}%, rgba(0,0,0,${1 - m}) 100%)` : undefined;
          return (
            <span key={i} style={{display: 'inline-block', height: `${LH}em`, overflow: 'hidden', transform: drop, WebkitMaskImage: roll, maskImage: roll}}>
              <svg width={0} height={0} style={{position: 'absolute'}}><filter id={`vblur-${it.id}-${i}`} x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation={`0 ${blur.toFixed(2)}`} /></filter></svg>
              <span style={{display: 'block', transform: `translateY(${-land * stops * LH}em)`, filter: blur > 0.3 ? `url(#vblur-${it.id}-${i})` : undefined}}>
                {Array.from({length: stops + 1}, (_, n) => <span key={n} style={{display: 'block', height: `${LH}em`, lineHeight: LH}}>{n % 10}</span>)}
              </span>
            </span>
          );
        })}
      </div>
      <svg style={{position: 'absolute', left: 0, top: fs * 1.16, overflow: 'visible'}} width={r[2]} height={fs * 0.2}>
        {Array.from({length: ticks}, (_, i) => {
          const x = (i / (ticks - 1)) * rulerW;
          const on = i / (ticks - 1) <= land + 0.001;
          return <line key={i} x1={x} y1={0} x2={x} y2={i % 6 === 0 ? fs * 0.13 : fs * 0.065} stroke={on ? st.accent : ink} strokeOpacity={(on ? 1 : 0.28) * (1 - out) * k01(lf, 0, 6)} strokeWidth={Math.max(1.5, fs * 0.012)} />;
        })}
      </svg>
      {(it.unit || it.label) && (
        <div style={{position: 'absolute', left: rulerW + fs * 0.12, top: fs * 1.1, ...smallCaps(st, fit(String([it.unit, it.label].filter(Boolean).join(' · ')).toUpperCase(), r[2] - rulerW - fs * 0.12, fs * 0.17, st.heavy, 0.22), st.accentHi), opacity: k01(lf, 14, 24) * (1 - out)}}>
          {[it.unit, it.label].filter(Boolean).join(' · ')}
        </div>
      )}
    </Box>
  );
};

// 4. STEPS 1 · 2 · 3. Progress dots light up to this step, the numeral resolves out of focus (HyperFrames
//    focus-blur-resolve), the step text slides out from behind a mask. Exit: slides aside, fast.
export const Steps: React.FC<GProps> = ({it, r, lf, dur, st, ink, scrim, u, series}) => {
  const num = String(it.value ?? 1).padStart(2, '0');
  const text = String(it.text || '');
  const fsNum = fit(num, r[2], r[3] / (1.02 + 0.273 * (text ? 2.6 : 1.3)), 200, -0.04);
  const ts0 = fsNum * 0.273;
  const ts = fit(text, r[2], ts0, st.weight, st.tracking);
  const k = k01(lf, 2, 14), tk = k01(lf, 8, 20), out = exitK(lf, dur, 7);
  const total = Math.max(series?.total || 3, Number(it.value) || 1);
  const idx = series?.index ?? (Number(it.value) || 1) - 1;
  const dot = ts0 * 0.36;
  return (
    <Box r={r} scrim={scrim} u={u} style={{transform: `translateX(${-out * 70 * u}px)`, opacity: 1 - out}}>
      <Backing r={r} st={st} scrim={scrim} k={k} />
      <div style={{position: 'absolute', left: 0, top: (ts0 * 1.2 - dot) / 2, display: 'flex', gap: dot * 1.1, alignItems: 'center'}}>
        {Array.from({length: total}, (_, i) => {
          const lit = i < idx ? 1 : i === idx ? k01(lf, 4, 12) : 0;
          return (
            <div key={i} style={{position: 'relative', width: i === idx ? dot * 3 * Math.max(0.34, lit) : dot, height: dot, borderRadius: 99, border: `${Math.max(1.5, dot * 0.14)}px solid ${ink}`, borderColor: lit > 0.5 ? st.accent : ink, opacity: lit > 0 ? 1 : 0.45, overflow: 'hidden'}}>
              <div style={{position: 'absolute', inset: 0, background: st.accent, opacity: lit}} />
            </div>
          );
        })}
      </div>
      <div style={{position: 'absolute', left: -fsNum * 0.03, top: ts0 * 1.3, fontFamily: FONT, fontSize: fsNum, fontWeight: 200, letterSpacing: '-0.04em', lineHeight: 1.02, color: st.accentHi, fontVariantNumeric: 'tabular-nums', transform: `scale(${1.12 - 0.12 * k})`, transformOrigin: '0% 70%', filter: k < 1 ? `blur(${(1 - k) * fsNum * 0.07}px)` : undefined, opacity: Math.min(1, k * 1.8)}}>{num}</div>
      {text && (
        <div style={{position: 'absolute', left: 0, top: ts0 * 1.3 + fsNum * 1.04, overflow: 'hidden', paddingRight: ts * 0.2}}>
          <div style={{fontFamily: FONT, fontSize: ts, fontWeight: st.weight, letterSpacing: `${st.tracking}em`, lineHeight: 1.2, color: ink, whiteSpace: 'nowrap', transform: `translateX(${(1 - tk) * -102}%)`}}>{text}</div>
        </div>
      )}
    </Box>
  );
};

// 5. SCREEN CARD + ARROW. The card swings up on a 3D hinge with a zoomed copy of the screen area, its title rises,
//    the arrow draws (HyperFrames hw-arrow wobble, drawn with @remotion/paths evolvePath) and a hand ring closes on the
//    target (@remotion/rough-notation Circle). Exit: the card folds away, arrow and ring go with it.
export const Card: React.FC<GProps> = ({it, r, lf, dur, st, u, video, target}) => {
  const k = k01(lf, 0, 14), out = exitK(lf, dur, 8);
  const title = String(it.text || '');
  const barH = r[3] * (it.zoom ? 0.18 : 0.6);
  const fs = fit(title, r[2] * 0.78, barH * 0.46, st.weight, st.tracking);
  const arrowK = k01(lf, 8, 24);
  const fade = 1 - k01(lf, dur - 8, dur - 4, Easing.linear);
  let arrow: React.ReactNode = null;
  if (target) {
    const from = arrowFrom(r, target);
    const p = arrowPath(from, target, {bend: 0.3, seed: 3, head: 26 * u});
    const body = evolvePath(arrowK, p.body);
    const hk = k01(lf, 22, 28);
    arrow = (
      <svg style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none', opacity: fade}} width={1} height={1}>
        <path d={p.body} stroke={st.accent} strokeWidth={4 * u} fill="none" strokeLinecap="round" strokeDasharray={body.strokeDasharray} strokeDashoffset={body.strokeDashoffset} />
        <path d={p.headA} stroke={st.accent} strokeWidth={4 * u} fill="none" strokeLinecap="round" opacity={hk} />
        <path d={p.headB} stroke={st.accent} strokeWidth={4 * u} fill="none" strokeLinecap="round" opacity={hk} />
      </svg>
    );
  }
  const ring = target && it.ring ? (
    <div style={{position: 'absolute', left: target[0] - it.ring[0] / 2, top: target[1] - it.ring[1] / 2, opacity: fade}}>
      <Circle progress={k01(lf, 20, 34, Easing.linear)} color={st.accentHi} strokeWidth={3 * u} seed={5} padding={{left: 10 * u, right: 10 * u, top: 10 * u, bottom: 10 * u}}>
        <div style={{width: it.ring[0], height: it.ring[1]}} />
      </Circle>
    </div>
  ) : null;
  let zoom: React.ReactNode = null;
  if (it.zoom && video) {
    const [zx, zy, zw, zh] = it.zoom;
    const bw = r[2], bh = r[3] - barH;
    const kk = Math.max(bw / (zw * video.srcW), bh / (zh * video.srcH));
    zoom = (
      <div style={{position: 'absolute', left: 0, top: 0, width: bw, height: bh, overflow: 'hidden', background: '#000'}}>
        <OffthreadVideo src={staticFile(video.src)} muted trimBefore={video.startFrame} style={{position: 'absolute', width: video.srcW * kk, height: video.srcH * kk, left: -zx * video.srcW * kk + (bw - zw * video.srcW * kk) / 2, top: -zy * video.srcH * kk + (bh - zh * video.srcH * kk) / 2, maxWidth: 'none'}} />
      </div>
    );
  }
  const light = st.cardBg === '#FFFFFF';
  return (
    <>
      {arrow}
      {ring}
      <Box r={r} style={{transform: `perspective(${1600 * u}px) rotateX(${(1 - k) * 32 - out * 70}deg) translateY(${(1 - k) * 36 * u}px)`, transformOrigin: out > 0 ? '50% 0%' : '50% 100%', opacity: Math.min(1, k * 2) * (1 - out), borderRadius: st.radius * 2 * u, overflow: 'hidden', boxShadow: `0 ${30 * u}px ${80 * u}px rgba(0,0,0,0.45)`}}>
        <div style={{position: 'absolute', inset: 0, background: st.cardBg}} />
        {zoom}
        <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: barH, display: 'flex', alignItems: 'center', gap: fs * 0.5, padding: `0 ${fs * 0.7}px`}}>
          <div style={{width: fs * 0.3, height: fs * 0.3, borderRadius: 99, background: st.accent, flex: 'none', transform: `scale(${k01(lf, 4, 12)})`}} />
          <RiseLetters text={title} lf={lf} at={6} step={0.8} style={{fontFamily: FONT, fontSize: fs, fontWeight: st.weight, letterSpacing: `${st.tracking}em`, lineHeight: 1.2, color: light ? st.inkOnLight : st.ink}} />
        </div>
      </Box>
    </>
  );
};

// 6. CHAPTER. A long line draws first, the chapter number lands under it, the title rises out of the line.
//    Exit: the line pulls back to the left and the title sinks behind it.
export const Chapter: React.FC<GProps> = ({it, r, lf, dur, st, ink, scrim, u}) => {
  const title = String(it.text || '');
  const fs0 = r[3] / 2.6;
  const fs = fit(title, r[2] * 0.96, fs0, st.weight, st.tracking);
  const line = k01(lf, 0, 16), num = k01(lf, 8, 16), rise = k01(lf, 10, 24);
  const out = exitK(lf, dur, 9);
  const L = `M 0 0 L ${r[2]} 0`;
  const draw = evolvePath(Math.max(0.0001, line * (1 - out)), L);
  const y = fs0 * 1.6;
  return (
    <Box r={r} scrim={scrim} u={u}>
      <svg style={{position: 'absolute', left: 0, top: y, overflow: 'visible'}} width={r[2]} height={2}>
        <path d={L} stroke={ink} strokeOpacity={0.5} strokeWidth={1.5 * u} strokeDasharray={draw.strokeDasharray} strokeDashoffset={draw.strokeDashoffset} />
        <circle cx={0} cy={0} r={4 * u} fill={st.accent} opacity={line * (1 - out)} />
      </svg>
      <div style={{position: 'absolute', left: 0, top: y + fs0 * 0.28, ...smallCaps(st, fs0 * 0.36, st.accentHi), opacity: num * (1 - out), transform: `translateY(${(1 - num) * -10 * u}px)`}}>{it.label ?? (it.value != null ? 'Chapter ' + String(it.value).padStart(2, '0') : '')}</div>
      <div style={{position: 'absolute', left: 0, top: y - fs * 1.26, height: fs * 1.22, overflow: 'hidden'}}>
        <div style={{fontFamily: FONT, fontSize: fs, fontWeight: st.weight, letterSpacing: `${st.tracking}em`, color: ink, whiteSpace: 'nowrap', lineHeight: 1.2, transform: `translateY(${(1 - rise + out) * 102}%)`}}>{title}</div>
      </div>
    </Box>
  );
};

// 7. END CARD (after the video). Order from HyperFrames cta-close: words rise one by one, a line draws,
//    then the action in small caps. Black, one soft light, very faint grain, thin type.
export const EndCard: React.FC<{it: any; lf: number; dur: number; st: any; u: number; W: number; H: number; info: any}> = ({it, lf, st, u, W, H}) => {
  const title = String(it.text || '');
  const words = title.split(/\s+/).filter(Boolean);
  const tall = H > W;
  const fs = fit(title, W * (tall ? 0.8 : 0.62), (tall ? W * 0.14 : H * 0.15), st.weight, st.tracking);
  const act = String(it.sub || '');
  const line = k01(lf, 14, 30), bk = k01(lf, 22, 34);
  const glow = 0.2 + 0.04 * Math.sin(lf / 14);
  return (
    <div style={{position: 'absolute', inset: 0, background: '#0B0A09', overflow: 'hidden'}}>
      <div style={{position: 'absolute', inset: 0, background: `radial-gradient(ellipse 55% 50% at 50% 46%, ${st.accent}${Math.round(glow * 255).toString(16).padStart(2, '0')} 0%, transparent 70%)`}} />
      <Grain opacity={0.05} />
      <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, color: st.ink}}>
        <div style={{display: 'flex', gap: fs * 0.26, fontSize: fs, fontWeight: st.weight, letterSpacing: `${st.tracking}em`, lineHeight: 1.15, overflow: 'hidden'}}>
          {words.map((w, i) => {
            const k = k01(lf, 2 + i * 4, 18 + i * 4);
            return <span key={i} style={{display: 'inline-block', transform: `translateY(${(1 - k) * 110}%)`}}>{w}</span>;
          })}
        </div>
        <div style={{width: fs * 3 * line, height: Math.max(1, 1.5 * u), background: st.accent, marginTop: fs * 0.3}} />
        {act && <div style={{marginTop: fs * 0.35, ...smallCaps(st, fs * 0.2, st.accentHi), opacity: bk, transform: `translateY(${(1 - bk) * 12 * u}px)`}}>{act}</div>}
      </div>
    </div>
  );
};

export const GRAPHICS: Record<string, React.FC<any>> = {nametag: NameTag, keyword: KeyWord, counter: Counter, steps: Steps, card: Card, chapter: Chapter};
export const seedOf = (s: string) => Math.floor(random(s) * 1000);
