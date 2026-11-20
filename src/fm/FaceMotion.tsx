// The main composition: your video + the graphics the plan asks for, placed by the layout engine.
// mode "final" = video + graphics (out/final.mp4), "overlay" = graphics only on transparent (out/overlay.mov).
import React from 'react';
import {AbsoluteFill, CalculateMetadataFunction, Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {TransitionSeries, linearTiming} from '@remotion/transitions';
import {fade} from '@remotion/transitions/fade';
import {layoutPlan, rectAt, layoutAlpha, END_FADE, FACE_MARGIN, bodyBox} from '../core/layout.mjs';
import {makeBody} from '../core/body.mjs';
import {kindOf} from '../core/catalog.mjs';
import {REGISTRY} from '../catalog/registry.generated';
import {USER} from '../catalog/user.generated';
import {HyperFramesBlock} from '../adapters/HyperFrames';
import {LottieFile} from '../adapters/Lottie';
import {faceAt, inflate} from '../core/face.mjs';
import {toWords} from '../core/words.mjs';
import {pickInk} from '../core/contrast.mjs';
import {getStyle} from '../styles/presets.mjs';
import {EndCard} from './graphics';
import {FONT} from '../brand';
import {FontGate} from '../parts/FontGate';

export type FMData = {meta: any; face: any; body?: any; words: any; plan: any; info: any; contrast?: Record<string, number>};

// one graphic component for a plan line, from any source
export const componentFor = (it: any): React.FC<any> | null => {
  const kind = kindOf(it.kind);
  if (kind === 'custom') return USER[it.item?.component ?? it.component] || null;
  if (kind === 'hyperframes') return HyperFramesBlock;
  if (kind === 'lottie') return LottieFile;
  return REGISTRY[kind] || null;
};
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
    data = {meta: await get('meta.json'), face: await get('face.json'), body: await get('body.json'), words: await get('words.json', {tier: 'C', captions: []}), plan: await get('plan.json', {items: []}), info: await get('my-info.json', {}), contrast: await get('contrast.json', {})};
  }
  if (!data?.meta) throw new Error('No project loaded. Run: npx connect-ai-video-motion demo');
  const style = getStyle(data.info?.style);
  const layout = layoutPlan({meta: data.meta, face: data.face, body: data.body, words: data.words, plan: data.plan, info: data.info, style, aspect: props.aspect, outWidth: props.outWidth});
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
      {layout.hasPerson ? <PersonGuide data={data} layout={layout} f={f} u={u} /> : (() => { const bb = bodyBox(b, layout.W, layout.H, layout.body, layout.aspect === '9x16'); return bb ? box(bb, 'rgba(224,160,90,0.8)', true, 'BODY (estimated)') : null; })()}
      {layout.items.filter((it: any) => !it.hidden && f >= it.f0 && f < it.f1).map((it: any) => {
        const r = rectAt(it, f);
        return r ? <React.Fragment key={it.id}>{box(r, 'rgba(143,183,224,0.9)', false, it.id)}</React.Fragment> : null;
      })}
    </AbsoluteFill>
  );
};

// the measured person: grid cells (orange), shoulders and arms (lines), hands (boxes)
export const PersonGuide: React.FC<{data: FMData; layout: any; f: number; u: number}> = ({data, layout, f, u}) => {
  const B = React.useMemo(() => makeBody(data.body), [data.body]);
  if (!B) return null;
  const t = f / layout.fps;
  const g = B.rawAt(t) || B.gridAt(t);
  const s = layout.scale, [bx, by] = layout.bodyScale, ox = layout.camera ? layout.camera[Math.min(layout.camera.length - 1, f)] : 0;
  const P = (p: number[]) => [p[0] * bx * s - ox, p[1] * by * s];
  const cells: React.ReactNode[] = [];
  for (let y = 0; y < B.GH; y++) for (let x = 0; x < B.GW; x++) if (g[y * B.GW + x]) {
    const a = P([x * B.cw, y * B.ch]);
    cells.push(<rect key={x + '_' + y} x={a[0]} y={a[1]} width={B.cw * bx * s} height={B.ch * by * s} fill="rgba(224,160,90,0.16)" stroke="rgba(224,160,90,0.55)" strokeWidth={1} />);
  }
  const sm = B.S[B.idxAt(t)];
  const J = sm.joints || {};
  const bones = [['leftShoulder', 'rightShoulder'], ['leftShoulder', 'leftElbow'], ['leftElbow', 'leftWrist'], ['rightShoulder', 'rightElbow'], ['rightElbow', 'rightWrist'], ['nose', 'neck']];
  return (
    <svg style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}} width={layout.W} height={layout.H}>
      {cells}
      {bones.map(([a, b2]) => (J[a] && J[b2] && J[a][2] > 0.3 && J[b2][2] > 0.3 ? <line key={a + b2} x1={P(J[a])[0]} y1={P(J[a])[1]} x2={P(J[b2])[0]} y2={P(J[b2])[1]} stroke="#7FE0D1" strokeWidth={3 * u} /> : null))}
      {Object.entries(J).map(([k, p]: any) => (p[2] > 0.3 ? <circle key={k} cx={P(p)[0]} cy={P(p)[1]} r={5 * u} fill="#7FE0D1" /> : null))}
      {(sm.hands || []).map((h: any, i: number) =>
        Object.values(h.pts).map((p: any, j: number) => (p[2] > 0.3 ? <circle key={i + '_' + j} cx={P(p)[0]} cy={P(p)[1]} r={3.2 * u} fill="#8FB7E0" /> : null)),
      )}
      <text x={12 * u} y={layout.H - 14 * u} fill="rgba(224,160,90,0.9)" fontSize={18 * u} fontFamily={FONT}>PERSON (measured: {B.source})</text>
    </svg>
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

// the person drawn again on top, from the same video frame, cut out by the person matte: graphics behind him stay behind
const PersonFront: React.FC<{data: FMData; layout: any; f: number; camX: number}> = ({data, layout, f, camX}) => {
  const dir = layout.matte?.dir || 'matte';
  const src = staticFile(`${dir}/m_${String(f).padStart(6, '0')}.png`);
  const s = layout.scale;
  const mask = `url(${src})`;
  return (
    <div style={{position: 'absolute', left: -camX, top: 0, width: data.meta.width * s, height: data.meta.height * s, WebkitMaskImage: mask, maskImage: mask, WebkitMaskSize: '100% 100%', maskSize: '100% 100%', WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat'}}>
      <Img src={src} style={{position: 'absolute', width: 1, height: 1, opacity: 0}} />
      <OffthreadVideo src={staticFile(data.meta.file)} muted style={{position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', maxWidth: 'none'}} />
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
  const draw = (it: any) => {
    if (it.hidden || !it.segments.length) return null;
    const G = componentFor(it.item);
    if (!G) return null;
    const c = pickInk(data.contrast?.[`${it.id}@${p.aspect}`] ?? null, style);
    const r = rectAt(it, Math.max(it.f0, Math.min(it.f1 - 1, f))) || (it.track ? null : it.segments[0].r);
    const item = {...it.item, meta: it.item.meta};
    let target = null;
    let itemPx = item;
    if (it.kind === 'kit/card' && item.target) {
      target = [item.target[0] * srcW * s - camX, item.target[1] * srcH * s];
      // in a 9:16 crop the thing may be off the frame: then the card shows the zoom only, no arrow or ring
      if (target[0] < 0 || target[0] > layout.W || target[1] < 0 || target[1] > layout.H) target = null;
      if (item.ring) itemPx = {...item, ring: [item.ring[0] * srcW * s, item.ring[1] * srcH * s]};
    }
    let series = null;
    if (it.item.series || it.kind === 'kit/steps') {
      const sib = layout.items.filter((x: any) => x.kind === it.kind && (x.item.series || 'steps') === (item.series || 'steps'));
      series = {index: sib.indexOf(it), total: sib.length};
    }
    const alpha = f >= it.f0 && f < it.f1 ? layoutAlpha(it, f) : 1;
    return (
      <Sequence key={it.id} from={it.f0} durationInFrames={Math.max(1, it.f1 - it.f0)} layout="none">
        <div style={{position: 'absolute', inset: 0, opacity: alpha}}>
          {it.parts ? (
            // type behind the person, split at a word boundary: the same graphic once per side, each with its own words
            it.parts.map((pt: any, i: number) => (
              <Local key={i} G={G} it={{...itemPx, text: pt.text, sub: i === 0 ? itemPx.sub : undefined}} r={pt.r} L={it} mainF={f} W={layout.W} H={layout.H} dur={it.f1 - it.f0} st={style} ink={c.ink} scrim={c.scrim} u={u} fps={layout.fps} target={null} series={series} video={null} />
            ))
          ) : r || it.contour ? <Local G={G} it={itemPx} r={r || [0, 0, layout.W, layout.H]} L={it} mainF={f} W={layout.W} H={layout.H} dur={it.f1 - it.f0} st={style} ink={c.ink} scrim={c.scrim} u={u} fps={layout.fps} target={target} series={series} video={{src: data.meta.file, srcW, srcH, scale: s, camX, startFrame: it.f0}} /> : null}
          {it.side ? <Local G={SideWord} it={it.side} r={it.side.r} dur={it.f1 - it.f0} st={style} ink={c.ink} u={u} /> : null}
        </div>
      </Sequence>
    );
  };
  const behind = layout.items.filter((it: any) => it.place === 'behind' && !it.hidden);
  const behindOn = behind.some((it: any) => f >= it.f0 && f < it.f1);
  return (
    <AbsoluteFill>
      {p.mode === 'final' && (
        <OffthreadVideo src={staticFile(data.meta.file)} style={{position: 'absolute', left: -camX, top: 0, width: srcW * s, height: srcH * s, maxWidth: 'none'}} />
      )}
      {behind.map(draw)}
      {/* the person on top again, twice: the matte is soft (0.9 inside is common), two layers make him solid (0.99) so nothing behind shows through his face */}
      {behindOn && p.mode === 'final' ? <PersonFront data={data} layout={layout} f={f} camX={camX} /> : null}
      {behindOn && p.mode === 'final' ? <PersonFront data={data} layout={layout} f={f} camX={camX} /> : null}
      {layout.items.filter((it: any) => it.place !== 'behind').map(draw)}
      {p.showWords && <WordStrip data={data} t={f / layout.fps} u={u} W={layout.W} H={layout.H} />}
      {p.guides && <Guides layout={layout} data={data} f={f} u={u} />}
    </AbsoluteFill>
  );
};

// the plain word on the other side of the person (plan line "side"): thin type, rises once, leaves with the graphic
const SideWord: React.FC<any> = ({it, r, lf, dur, st, ink}) => {
  const k = Math.min(1, Math.max(0, (lf - 6) / 12)), e = 1 - Math.pow(1 - k, 3);
  const out = Math.min(1, Math.max(0, (lf - (dur - 9)) / 9));
  return (
    <div style={{position: 'absolute', left: r[0], top: r[1], width: r[2], height: r[3], overflow: 'hidden', opacity: 1 - out, textAlign: it.align}}>
      <div style={{fontFamily: FONT, fontSize: it.fs, fontWeight: st.weight, letterSpacing: `${st.tracking}em`, lineHeight: 1.2, color: ink, whiteSpace: 'nowrap', transform: `translateY(${(1 - e) * 105}%)`, textShadow: '0 2px 24px rgba(0,0,0,0.35)'}}>{it.text}</div>
    </div>
  );
};

const Local: React.FC<any> = ({G, ...rest}) => {
  const lf = useCurrentFrame();
  return <G {...rest} lf={lf} />;
};

const Post: React.FC<{p: FMProps}> = ({p}) => {
  const lf = useCurrentFrame();
  const {layout, data} = p as any;
  const G = (layout.post && kindOf(layout.post.kind) !== 'kit/endcard' && componentFor(layout.post)) || EndCard;
  return <G it={layout.post} lf={lf} dur={layout.postFrames} st={getStyle(data.info?.style)} u={layout.u} W={layout.W} H={layout.H} info={data.info} r={[0, 0, layout.W, layout.H]} ink={getStyle(data.info?.style).ink} scrim={0} fps={layout.fps} />;
};

export const FaceMotion: React.FC<FMProps> = (p) => {
  const {layout} = p as any;
  if (!layout) return null;
  return (
    <AbsoluteFill style={{background: p.mode === 'overlay' ? 'transparent' : '#000'}}>
      <FontGate>
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
      </FontGate>
    </AbsoluteFill>
  );
};
