// Gallery: every catalog graphic for a couple of seconds, grouped by source, with its name, source and licence.
// Graphics that need a person (on the body, behind the person) are shown on a real video, placed by the layout engine.
// GallerySheet: one still per graphic at its peak, for a quick look at the whole catalog.
import React from 'react';
import {AbsoluteFill, CalculateMetadataFunction, OffthreadVideo, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {METAS} from '../catalog/metas.generated.mjs';
import {layoutPlan} from '../core/layout.mjs';
import {getStyle} from '../styles/presets.mjs';
import {FaceMotion, componentFor} from './FaceMotion';
import {FONT} from '../brand';
import {FontGate} from '../parts/FontGate';

export type GalleryProps = {kinds?: string[]; secs?: number; data?: any; cells?: any[]; sheet?: boolean; cols?: number; title?: string};
const W = 1280, H = 720;
const ORDER = ['kit', 'remotion', 'hyperframes', 'lottie', 'body', 'custom'];
const SOURCE_NAME: Record<string, string> = {kit: 'connect-ai-video-motion', remotion: 'Remotion packages', hyperframes: 'HyperFrames blocks', lottie: 'Lottie files', body: 'Body-aware', custom: 'Your own'};

export const galleryList = (kinds?: string[]) => {
  const all = Object.values(METAS as Record<string, any>).filter((m) => (!m.status || m.status === 'ok') && (!kinds || !kinds.length || kinds.some((k) => m.kind === k || m.kind.startsWith(k + '/'))));
  return all.sort((a, b) => ORDER.indexOf(a.kind.split('/')[0]) - ORDER.indexOf(b.kind.split('/')[0]) || (a.kind < b.kind ? -1 : 1));
};
const needsPerson = (m: any) => m.place === 'attach' || m.place === 'behind' || m.stage === 'video';

export const calcGallery: CalculateMetadataFunction<GalleryProps> = async ({props}) => {
  const fps = 30, secs = props.secs || 2;
  const list = galleryList(props.kinds);
  const style = getStyle('connect');
  // items that need a person: one small plan per item on the given project video, at the moment the item asks for
  const cells = list.map((m: any, i: number) => {
    const ex = {...(m.example || {})};
    if (needsPerson(m) && props.data?.meta) {
      const t = ex.at ?? 2;
      const plan = {version: 1, items: [{id: 'g', kind: m.kind, at: t, dur: secs, ...ex}]};
      const L = layoutPlan({meta: props.data.meta, face: props.data.face, body: props.data.body, words: {tier: 'C', captions: []}, plan, info: {}, style, aspect: '16x9', outWidth: W});
      return {kind: m.kind, i, video: true, t0: Math.round(t * fps), L};
    }
    return {kind: m.kind, i, video: false};
  });
  if (props.sheet) {
    const cols = props.cols || 6, cw = 300, ch = Math.round((cw * H) / W);
    const rows = Math.ceil(cells.length / cols);
    return {durationInFrames: 1, fps, width: cols * (cw + 12) + 12, height: 64 + rows * (ch + 54) + 12, props: {...props, cells, cols}};
  }
  return {durationInFrames: Math.max(1, cells.length * secs * fps), fps, width: W, height: H, props: {...props, cells}};
};

const Stage: React.FC<{m: any; lf: number; dur: number}> = ({m, lf, dur}) => {
  const st = getStyle('connect');
  const G = componentFor({kind: m.kind});
  const z = m.size || {aspect: 2, maxW: 0.3};
  let w = W * Math.min(0.6, (z.maxW || 0.3) * 1.5), h = w / (z.aspect || 2);
  if (h > H * 0.5) { h = H * 0.5; w = h * (z.aspect || 2); }
  const full = m.place === 'full' || m.place === 'post';
  const r = full ? [0, 0, W, H] : [(W - w) / 2, (H - h) / 2 - 20, w, h];
  const it = {kind: m.kind, meta: m, ...(m.example || {})};
  return G ? <G it={it} r={r} lf={lf} dur={dur} st={st} ink={st.ink} scrim={0} u={H / 1080} fps={30} W={W} H={H} /> : null;
};

const Caption: React.FC<{m: any; n: number; total: number}> = ({m, n, total}) => {
  const src = m.kind.split('/')[0];
  return (
    <>
      <div style={{position: 'absolute', left: 36, top: 26, fontFamily: FONT, fontSize: 15, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#D6892A'}}>{SOURCE_NAME[src] || src}</div>
      <div style={{position: 'absolute', right: 36, top: 26, fontFamily: FONT, fontSize: 15, letterSpacing: '0.12em', color: 'rgba(235,226,210,0.5)', fontVariantNumeric: 'tabular-nums'}}>{String(n).padStart(2, '0')} / {total}</div>
      <div style={{position: 'absolute', left: 36, bottom: 30, fontFamily: FONT, color: '#EBE2D2'}}>
        <div style={{fontSize: 30, fontWeight: 300}}>{m.title}</div>
        <div style={{fontSize: 15, marginTop: 6, color: 'rgba(235,226,210,0.6)', letterSpacing: '0.04em'}}>
          kind <span style={{color: '#F2B45A'}}>{m.kind}</span> · {m.source?.package || m.source?.repo || m.source?.type} · {m.license}
        </div>
      </div>
    </>
  );
};

const Backdrop: React.FC = () => (
  <AbsoluteFill style={{background: 'radial-gradient(ellipse 80% 70% at 50% 45%, #1a1714 0%, #0B0A09 70%)'}}>
    <svg width={W} height={H} style={{position: 'absolute', opacity: 0.06}}>
      {Array.from({length: 17}, (_, i) => <line key={'v' + i} x1={i * 80} y1={0} x2={i * 80} y2={H} stroke="#EBE2D2" strokeWidth={1} />)}
      {Array.from({length: 10}, (_, i) => <line key={'h' + i} x1={0} y1={i * 80} x2={W} y2={i * 80} stroke="#EBE2D2" strokeWidth={1} />)}
    </svg>
  </AbsoluteFill>
);

const OnVideo: React.FC<{cell: any; data: any; at: number}> = ({cell, data, at}) => (
  <Sequence from={-cell.t0} layout="none">
    <FaceMotion data={data} layout={cell.L} aspect="16x9" mode="final" guides={false} />
  </Sequence>
);

const Cell: React.FC<{cell: any; secs: number; data: any; n: number; total: number}> = ({cell, secs, data, n, total}) => {
  const lf = useCurrentFrame();
  const m = (METAS as any)[cell.kind];
  return (
    <AbsoluteFill style={{background: '#0B0A09', overflow: 'hidden'}}>
      {cell.video ? <OnVideo cell={cell} data={data} at={lf} /> : (<><Backdrop /><Stage m={m} lf={lf} dur={secs * 30} /></>)}
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 140, background: 'linear-gradient(0deg, rgba(11,10,9,0.85), transparent)'}} />
      <Caption m={m} n={n} total={total} />
    </AbsoluteFill>
  );
};

export const Gallery: React.FC<GalleryProps> = (p) => {
  const secs = p.secs || 2;
  const cells = p.cells || [];
  return (
    <AbsoluteFill style={{background: '#0B0A09'}}>
      <FontGate>
      {cells.map((c: any, i: number) => (
        <Sequence key={c.kind} from={i * secs * 30} durationInFrames={secs * 30}>
          <Cell cell={c} secs={secs} data={p.data} n={i + 1} total={cells.length} />
        </Sequence>
      ))}
      </FontGate>
    </AbsoluteFill>
  );
};

export const GallerySheet: React.FC<GalleryProps> = (p) => {
  const cells = p.cells || [];
  const cols = p.cols || 6, cw = 300, ch = Math.round((cw * H) / W), k = cw / W;
  const secs = p.secs || 2;
  return (
    <AbsoluteFill style={{background: '#0B0A09', fontFamily: FONT, color: '#EBE2D2'}}>
      <FontGate>
      <div style={{position: 'absolute', left: 14, top: 16, fontSize: 24, fontWeight: 300}}>{p.title || `connect-ai-video-motion catalog · ${cells.length} graphics · one still each at its peak`}</div>
      {cells.map((c: any, i: number) => {
        const m = (METAS as any)[c.kind];
        const x = 12 + (i % cols) * (cw + 12), y = 64 + Math.floor(i / cols) * (ch + 54);
        const peak = Math.round(secs * 30 * 0.55);
        return (
          <div key={c.kind} style={{position: 'absolute', left: x, top: y, width: cw}}>
            <div style={{width: cw, height: ch, overflow: 'hidden', position: 'relative', outline: '1px solid #2a2622'}}>
              <div style={{width: W, height: H, transform: `scale(${k})`, transformOrigin: '0 0', position: 'absolute'}}>
                <Sequence from={-peak} layout="none">
                  <Cell cell={c} secs={secs} data={p.data} n={i + 1} total={cells.length} />
                </Sequence>
              </div>
            </div>
            <div style={{marginTop: 6, fontSize: 13, color: '#F2B45A', whiteSpace: 'nowrap', overflow: 'hidden'}}>{m.kind}</div>
            <div style={{fontSize: 11, color: 'rgba(235,226,210,0.55)', whiteSpace: 'nowrap', overflow: 'hidden'}}>{m.license} · {m.source?.package || m.source?.repo || m.source?.type}</div>
          </div>
        );
      })}
      </FontGate>
    </AbsoluteFill>
  );
};
