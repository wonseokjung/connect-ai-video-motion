// The main composition: your video + the graphics the plan asks for, placed by the layout engine.
// mode "final" = video + graphics (out/final.mp4), "overlay" = graphics only on transparent (out/overlay.mov).
import React from 'react';
import {AbsoluteFill, CalculateMetadataFunction, OffthreadVideo, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {TransitionSeries, linearTiming} from '@remotion/transitions';
import {fade} from '@remotion/transitions/fade';
import {layoutPlan, rectAt, END_FADE, FACE_MARGIN, bodyBox} from '../core/layout.mjs';
import {faceAt, inflate} from '../core/face.mjs';
import {toWords} from '../core/words.mjs';
import {pickInk} from '../core/contrast.mjs';
import {getStyle} from '../styles/presets.mjs';
import {EndCard, GRAPHICS} from './graphics';
import {FONT} from '../brand';

export type FMData = {meta: any; face: any; words: any; plan: any; info: any; contrast?: Record<string, number>};
export type FMProps = {
  data?: FMData | null;
  aspect: '16x9' | '9x16';
  mode: 'final' | 'overlay';
  guides?: boolean; // face box, margin and graphic boxes (preview / sheet only)
  showWords?: boolean; // transcript strip with the current word lit (demo only)
  layout?: any;
  outWidth?: number;
};

// In the Studio the data is read from the project folder (public dir = projects/<name>/work).
export const calcFaceMotion: CalculateMetadataFunction<FMProps> = async ({props}) => {
  let data = props.data;
  if (!data) {
    const get = async (f: string, fallback: any = null) => {
      try {
        const r = await fetch(staticFile(f));
        return r.ok ? await r.json() : fallback;
      } catch {
        return fallback;
      }
    };
    data = {meta: await get('meta.json'), face: await get('face.json'), words: await get('words.json', {tier: 'C', captions: []}), plan: await get('plan.json', {items: []}), info: await get('my-info.json', {}), contrast: await get('contrast.json', {})};
  }
  if (!data?.meta) throw new Error('No project loaded. Run: npx video-motion demo');
  const style = getStyle(data.info?.style);
  const layout = layoutPlan({meta: data.meta, face: data.face, words: data.words, plan: data.plan, info: data.info, style, aspect: props.aspect, outWidth: props.outWidth});
  return {durationInFrames: layout.total, fps: layout.fps, width: layout.W, height: layout.H, props: {...props, data, layout}};
};

const Guides: React.FC<{layout: any; data: FMData; f: number; u: number}> = ({layout, data, f, u}) => {
  const fb = faceAt(data.face, f / layout.fps);
  if (!fb) return null;
  const s = layout.scale, ox = layout.camera ? layout.camera[Math.min(layout.camera.length - 1, f)] : 0;
  const fsx = data.face.width ? data.meta.width / data.face.width : 1, fsy = data.face.height ? data.meta.height / data.face.height : 1;
  const b = [fb[0] * fsx * s - ox, fb[1] * fsy * s, fb[2] * fsx * s, fb[3] * fsy * s];
  const m = inflate(b, FACE_MARGIN * u);
  const box = (r: number[], color: string, dash = false, label = '') => (
    <div style={{position: 'absolute', left: r[0], top: r[1], width: r[2], height: r[3], border: `${2 * u}px ${dash ? 'dashed' : 'solid'} ${color}`, boxSizing: 'border-box'}}>
      {label && <div style={{position: 'absolute', top: -26 * u, left: 0, fontFamily: FONT, fontSize: 18 * u, color, whiteSpace: 'nowrap'}}>{label}</div>}
    </div>
  );
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {layout.zones.map((z: any, i: number) => <div key={i} style={{position: 'absolute', left: z.r[0], top: z.r[1], width: z.r[2], height: z.r[3], background: 'rgba(224,96,90,0.12)'}} />)}
      {box(m, 'rgba(224,96,90,0.9)', true)}
      {box(b, 'rgba(224,96,90,0.9)', false, 'FACE')}
      {(() => { const bb = bodyBox(b, layout.W, layout.H, layout.body, layout.aspect === '9x16'); return bb ? box(bb, 'rgba(224,160,90,0.8)', true, 'BODY') : null; })()}
      {layout.items.filter((it: any) => !it.hidden && f >= it.f0 && f < it.f1).map((it: any) => {
        const r = rectAt(it, f);
        return r ? <React.Fragment key={it.id}>{box(r, 'rgba(143,183,224,0.9)', false, it.id)}</React.Fragment> : null;
      })}
    </AbsoluteFill>
  );
};

const WordStrip: React.FC<{data: FMData; t: number; u: number; W: number; H: number}> = ({data, t, u, W, H}) => {
  const ws = toWords(data.words);
  const cur = ws.findIndex((w: any) => t >= w.t0 && t < w.t1 + 0.15);
  if (cur < 0) return null;
  const a = Math.max(0, cur - 4), z = Math.min(ws.length, cur + 3);
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: H * 0.035, textAlign: 'center', fontFamily: FONT, fontSize: 24 * u, letterSpacing: '0.02em', color: 'rgba(235,226,210,0.5)'}}>
      <span style={{fontSize: 14 * u, letterSpacing: '0.2em', marginRight: 16 * u}}>SAID</span>
      {ws.slice(a, z).map((w: any, i: number) => <span key={i} style={{margin: `0 ${5 * u}px`, color: a + i === cur ? '#EBE2D2' : undefined}}>{w.w}</span>)}
    </div>
  );
};

const Main: React.FC<{p: FMProps}> = ({p}) => {
  const f = useCurrentFrame();
  const {layout, data} = p as any;
  const style = getStyle(data.info?.style);
  const s = layout.scale, srcW = data.meta.width, srcH = data.meta.height;
  const camX = layout.camera ? layout.camera[Math.min(layout.camera.length - 1, f)] : 0;
  const u = layout.u;
  return (
    <AbsoluteFill>
      {p.mode === 'final' && (
        <OffthreadVideo src={staticFile(data.meta.file)} style={{position: 'absolute', left: -camX, top: 0, width: srcW * s, height: srcH * s, maxWidth: 'none'}} />
      )}
      {layout.items.map((it: any) => {
        if (it.hidden || !it.segments.length) return null;
        const G = GRAPHICS[it.kind];
        if (!G) return null;
        const c = pickInk(data.contrast?.[`${it.id}@${p.aspect}`] ?? null, style);
        const r = rectAt(it, Math.max(it.f0, Math.min(it.f1 - 1, f))) || it.segments[0].r;
        const item = it.item;
        let target = null;
        let itemPx = item;
        if (item.kind === 'card' && item.target) {
          target = [item.target[0] * srcW * s - camX, item.target[1] * srcH * s];
          // in a 9:16 crop the thing may be off the frame: then the card shows the zoom only, no arrow or ring
          if (target[0] < 0 || target[0] > layout.W || target[1] < 0 || target[1] > layout.H) target = null;
          if (item.ring) itemPx = {...item, ring: [item.ring[0] * srcW * s, item.ring[1] * srcH * s]};
        }
        let series = null;
        if (it.kind === 'steps') {
          const sib = layout.items.filter((x: any) => x.kind === 'steps' && (x.item.series || 'steps') === (item.series || 'steps'));
          series = {index: sib.indexOf(it), total: sib.length};
        }
        return (
          <Sequence key={it.id} from={it.f0} durationInFrames={it.f1 - it.f0} layout="none">
            <Local G={G} it={itemPx} r={r} f0={it.f0} dur={it.f1 - it.f0} st={style} ink={c.ink} scrim={c.scrim} u={u} fps={layout.fps} target={target} series={series} video={{src: data.meta.file, srcW, srcH, scale: s, camX, startFrame: it.f0}} />
          </Sequence>
        );
      })}
      {p.showWords && <WordStrip data={data} t={f / layout.fps} u={u} W={layout.W} H={layout.H} />}
      {p.guides && <Guides layout={layout} data={data} f={f} u={u} />}
    </AbsoluteFill>
  );
};

const Local: React.FC<any> = ({G, f0, ...rest}) => {
  const lf = useCurrentFrame();
  return <G {...rest} lf={lf} />;
};

const Post: React.FC<{p: FMProps}> = ({p}) => {
  const lf = useCurrentFrame();
  const {layout, data} = p as any;
  return <EndCard it={layout.post} lf={lf} dur={layout.postFrames} st={getStyle(data.info?.style)} u={layout.u} W={layout.W} H={layout.H} info={data.info} />;
};

export const FaceMotion: React.FC<FMProps> = (p) => {
  const {layout} = p as any;
  if (!layout) return null;
  return (
    <AbsoluteFill style={{background: p.mode === 'overlay' ? 'transparent' : '#000'}}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={layout.mainFrames}>
          <Main p={p} />
        </TransitionSeries.Sequence>
        {layout.post ? <TransitionSeries.Transition presentation={fade()} timing={linearTiming({durationInFrames: END_FADE})} /> : null}
        {layout.post ? (
          <TransitionSeries.Sequence durationInFrames={layout.postFrames}>
            <Post p={p} />
          </TransitionSeries.Sequence>
        ) : null}
      </TransitionSeries>
    </AbsoluteFill>
  );
};
