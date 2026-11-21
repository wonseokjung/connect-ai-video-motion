// Showcase: one catalog graphic on a real talking-head clip, as a short loop for the catalog page.
//   Showcase     one plan line on one clip, placed by the same layout engine as a normal render (face, body and hands avoided)
//   ShowcaseCut  a @remotion/transitions presentation between two clips (the transition-* items)
// Used by tools/make-showcase.mjs. Several clips live in one public folder: <id>/video.mp4, <id>/matte/.
import React, {useEffect, useState} from 'react';
import {AbsoluteFill, CalculateMetadataFunction, OffthreadVideo, Sequence, continueRender, delayRender, staticFile} from 'remotion';
import {TransitionSeries, linearTiming, springTiming} from '@remotion/transitions';
import {clockWipe} from '@remotion/transitions/clock-wipe';
import {flip} from '@remotion/transitions/flip';
import {iris} from '@remotion/transitions/iris';
import {pushCut} from '@remotion/transitions/push-cut';
import {slide} from '@remotion/transitions/slide';
import {wipe} from '@remotion/transitions/wipe';
import {layoutPlan, END_FADE} from '../core/layout.mjs';
import {getStyle} from '../styles/presets.mjs';
import {FaceMotion} from './FaceMotion';

export type ShowcaseProps = {
  data?: any; // one clip: {meta, face, body, contrast}
  item?: any; // one plan line: {kind, at, dur, text ...}
  more?: any[]; // further plan lines in the same clip (a 1 · 2 · 3 series)
  protect?: any[]; // things that are not the person (mic arm)
  lead?: number; // seconds of plain video before the graphic
  tail?: number; // seconds after it
  layout?: any;
  start?: number;
  measure?: boolean; // stills only: log the real size of the type on screen (tools/make-showcase.mjs --measure)
};

const FPS = 30;

export const showcaseLayout = (p: ShowcaseProps) => {
  const style = getStyle(p.data?.info?.style, p.data?.info);
  const plan = {version: 1, protect: p.protect || [], items: [{id: 'g', ...p.item}, ...(p.more || []).map((x: any, i: number) => ({id: 'g' + (i + 2), ...x}))]};
  return layoutPlan({meta: p.data.meta, face: p.data.face, body: p.data.body, words: {tier: 'C', captions: []}, plan, info: p.data.info || {}, style, aspect: '16x9', outWidth: 1920});
};

// frames of the clip that the loop shows: [start, end) on the clip's own timeline (end may run into the end card)
export const showcaseRange = (L: any, lead = 0.5, tail = 0.4) => {
  if (L.post) {
    const start = Math.max(0, L.mainFrames - Math.round(Math.max(lead, 1.6) * FPS));
    return {start, frames: L.total - start};
  }
  const g = L.items.find((x: any) => x.id === 'g') || L.items[0];
  const start = Math.max(0, g.f0 - Math.round(lead * FPS));
  const end = Math.min(L.mainFrames, Math.max(...L.items.map((x: any) => x.f1)) + Math.round(tail * FPS));
  return {start, frames: Math.max(1, end - start)};
};

export const calcShowcase: CalculateMetadataFunction<ShowcaseProps> = async ({props}) => {
  if (!props.data?.meta) return {durationInFrames: 30, fps: FPS, width: 1920, height: 1080, props};
  const L = showcaseLayout(props);
  if (L.errors.length) throw new Error(L.errors.map((e: any) => e.msg).join('; '));
  const g: any = L.items.find((x: any) => x.id === 'g');
  if (!L.post && (!g || g.hidden)) throw new Error(`${props.item?.kind}: ${g?.reason || 'not placed'}`);
  const {start, frames} = showcaseRange(L, props.lead, props.tail);
  return {durationInFrames: frames, fps: FPS, width: L.W, height: L.H, props: {...props, layout: L, start}};
};

// The real size of every piece of type in the frame, as drawn (font size x any scale on the way), HyperFrames iframes included.
const probeFonts = () => {
  const out: {t: string; px: number}[] = [];
  const walk = (doc: Document, k: number) => {
    doc.querySelectorAll('body *').forEach((el: any) => {
      if (el.tagName === 'IFRAME') {
        try { if (el.contentDocument && el.offsetWidth) walk(el.contentDocument, (k * el.getBoundingClientRect().width) / el.offsetWidth); } catch {}
        return;
      }
      const text = [...el.childNodes].filter((n: any) => n.nodeType === 3).map((n: any) => n.textContent).join('').trim();
      if (!text || !el.offsetHeight) return;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return;
      const cs = (el.ownerDocument.defaultView as any).getComputedStyle(el);
      if (cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.3) return;
      out.push({t: text.slice(0, 28), px: +(parseFloat(cs.fontSize) * (r.height / el.offsetHeight) * k).toFixed(1)});
    });
  };
  walk(document, 1);
  return out.sort((a, b) => b.px - a.px).slice(0, 6);
};
const Probe: React.FC = () => {
  const [h] = useState(() => delayRender('measure type', {timeoutInMilliseconds: 25000}));
  useEffect(() => {
    const t = setTimeout(() => {
      try { console.log('VM_FONT ' + JSON.stringify(probeFonts())); } finally { continueRender(h); }
    }, 1500);
    return () => clearTimeout(t);
  }, [h]);
  return null;
};

export const Showcase: React.FC<ShowcaseProps> = (p) => {
  if (!p.layout) return <AbsoluteFill style={{background: '#0B0A09'}} />;
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Sequence from={-(p.start || 0)} layout="none">
        <FaceMotion data={p.data} layout={p.layout} aspect="16x9" mode="final" guides={false} />
      </Sequence>
      {p.measure ? <Probe /> : null}
    </AbsoluteFill>
  );
};

// ---- a transition between two clips ----
export type CutProps = {kind: string; a: {file: string; t: number}; b: {file: string; t: number}; secs?: number; cutAt?: number; frames?: number};

const W = 1920, H = 1080;
export const PRESENTATIONS: Record<string, {make: () => any; frames: number; spring?: boolean}> = {
  'remotion/transition-clock-wipe': {make: () => clockWipe({width: W, height: H}), frames: 26},
  'remotion/transition-flip': {make: () => flip({direction: 'from-bottom', perspective: 1600}), frames: 24},
  'remotion/transition-iris': {make: () => iris({width: W, height: H}), frames: 26},
  'remotion/transition-push-cut': {make: () => pushCut({flashColor: '#F2B45A', flashOpacity: 0.35}), frames: 16},
  'remotion/transition-slide': {make: () => slide({direction: 'from-right'}), frames: 22, spring: true},
  'remotion/transition-wipe': {make: () => wipe({direction: 'from-top-left'}), frames: 24},
};

export const calcShowcaseCut: CalculateMetadataFunction<CutProps> = async ({props}) => ({durationInFrames: Math.round((props.secs || 4) * FPS), fps: FPS, width: W, height: H, props});

const Clip: React.FC<{file: string; t: number}> = ({file, t}) => (
  <AbsoluteFill style={{background: '#000'}}>
    <OffthreadVideo src={staticFile(file)} startFrom={Math.round(t * FPS)} muted style={{width: '100%', height: '100%'}} />
  </AbsoluteFill>
);

export const ShowcaseCut: React.FC<CutProps> = (p) => {
  const total = Math.round((p.secs || 4) * FPS);
  const pr = PRESENTATIONS[p.kind];
  if (!pr || !p.a?.file) return <AbsoluteFill style={{background: '#0B0A09'}} />;
  const T = p.frames || pr.frames;
  const first = Math.round((p.cutAt ?? 0.5) * total + T / 2);
  // behind the move: the next shot, blurred and dimmed, so a flip or a slide never shows black around the frame
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <AbsoluteFill style={{filter: 'blur(36px) brightness(0.7) saturate(1.1)', transform: 'scale(1.12)'}}>
        <Clip file={p.b.file} t={Math.max(0, p.b.t - (first - T) / FPS)} />
      </AbsoluteFill>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={first}>
          <Clip file={p.a.file} t={p.a.t} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={pr.make()} timing={pr.spring ? springTiming({config: {damping: 200}, durationInFrames: T}) : linearTiming({durationInFrames: T})} />
        <TransitionSeries.Sequence durationInFrames={total - first + T}>
          <Clip file={p.b.file} t={p.b.t} />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};

export {END_FADE};
