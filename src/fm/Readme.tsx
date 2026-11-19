// The three README / lesson demos. Each one shows a real run of the kit, nothing staged by hand.
// 1. CompareFixed: the same plan with fixed positions (left) vs face-aware places (right); guides shown, then hidden.
// 2. CheckLoop: a plan that covers the face on purpose -> check catches it (its real message) -> fixed -> PASS.
// 3. BothShapes: one plan, 16:9 and 9:16 playing together.
import React from 'react';
import {AbsoluteFill, CalculateMetadataFunction, interpolate, useCurrentFrame} from 'remotion';
import {calcFaceMotion, FaceMotion} from './FaceMotion';
import {FONT} from '../brand';
import {Grain} from '../parts/Atmos';

type Pane = {data: any; aspect: '16x9' | '9x16'; guides?: boolean; layout?: any};
type RP = {kind: 'compare' | 'check' | 'both'; a: Pane; b: Pane; msg?: string; pass?: string};

const calcPane = async (p: Pane) => {
  const r: any = await calcFaceMotion({props: {data: p.data, aspect: p.aspect, mode: 'final'}} as any);
  return {...p, layout: r.props.layout};
};
export const calcReadme: CalculateMetadataFunction<RP> = async ({props}) => {
  const a = await calcPane(props.a), b = await calcPane(props.b);
  const d = props.kind === 'check' ? 300 : Math.max(a.layout.mainFrames, b.layout.mainFrames);
  return {durationInFrames: d, fps: 30, width: 1920, height: 1080, props: {...props, a, b}};
};

const PaneView: React.FC<{p: Pane; x: number; y: number; w: number; guides: boolean; label: string; frame?: number; tint?: string}> = ({p, x, y, w, guides, label, tint}) => {
  const L = p.layout, k = w / L.W, h = L.H * k;
  return (
    <div style={{position: 'absolute', left: x, top: y, width: w}}>
      <div style={{position: 'relative', width: w, height: h, overflow: 'hidden', outline: `1px solid ${tint || 'rgba(235,226,210,0.18)'}`}}>
        <div style={{position: 'absolute', width: L.W, height: L.H, transform: `scale(${k})`, transformOrigin: '0 0'}}>
          <FaceMotion data={p.data} layout={L} aspect={p.aspect} mode="final" guides={guides} showWords={p.aspect === '16x9'} />
        </div>
      </div>
      <div style={{marginTop: 14, fontFamily: FONT, fontWeight: 300, fontSize: 26, letterSpacing: '0.14em', textTransform: 'uppercase', color: tint || '#EBE2D2'}}>{label}</div>
    </div>
  );
};

export const Readme: React.FC<RP> = (p) => {
  const f = useCurrentFrame();
  if (!p.a.layout) return null;
  const bg = (
    <>
      <AbsoluteFill style={{background: '#0B0A09'}} />
      <Grain opacity={0.05} />
    </>
  );
  if (p.kind === 'compare') {
    const guides = f < p.a.layout.mainFrames * 0.45;
    return (
      <AbsoluteFill>
        {bg}
        <PaneView p={p.a} x={48} y={250} w={888} guides={guides} label="Fixed position" tint="#E0605A" />
        <PaneView p={p.b} x={984} y={250} w={888} guides={guides} label="Face-aware" tint="#D6892A" />
        <div style={{position: 'absolute', left: 48, top: 120, fontFamily: FONT, fontWeight: 200, fontSize: 64, color: '#EBE2D2', letterSpacing: '-0.02em'}}>Same plan. Different place.</div>
        <div style={{position: 'absolute', left: 50, top: 205, fontFamily: FONT, fontWeight: 300, fontSize: 22, color: 'rgba(235,226,210,0.55)', letterSpacing: '0.12em'}}>{guides ? 'GUIDES ON · RED = FACE · ORANGE = BODY' : 'GUIDES OFF'}</div>
      </AbsoluteFill>
    );
  }
  if (p.kind === 'both') {
    return (
      <AbsoluteFill>
        {bg}
        <PaneView p={p.a} x={60} y={190} w={1240} guides={false} label="16:9" />
        <PaneView p={p.b} x={1400} y={60} w={460} guides={false} label="9:16 · same plan" />
        <div style={{position: 'absolute', left: 60, top: 80, fontFamily: FONT, fontWeight: 200, fontSize: 64, color: '#EBE2D2', letterSpacing: '-0.02em'}}>One plan. Two shapes.</div>
      </AbsoluteFill>
    );
  }
  // check loop: 0-150 broken + message, 150-300 fixed + PASS
  const broken = f < 150;
  const pane = broken ? p.a : p.b;
  const at = broken ? 196 : 196; // show the frame where the forced title sits on the face
  const typed = Math.floor(interpolate(f % 150, [20, 80], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) * (broken ? p.msg || '' : p.pass || '').length);
  const L = pane.layout, w = 1100, k = w / L.W;
  return (
    <AbsoluteFill>
      {bg}
      <div style={{position: 'absolute', left: 60, top: 150, width: w, height: L.H * k, overflow: 'hidden', outline: `2px solid ${broken ? '#E0605A' : '#5DBB63'}`}}>
        <div style={{position: 'absolute', width: L.W, height: L.H, transform: `scale(${k})`, transformOrigin: '0 0'}}>
          <FrozenFM pane={pane} at={at} />
        </div>
      </div>
      <div style={{position: 'absolute', left: 60, top: 60, fontFamily: FONT, fontWeight: 200, fontSize: 56, color: '#EBE2D2'}}>{broken ? 'Broken on purpose' : 'Fixed: remove "pos"'}</div>
      <div style={{position: 'absolute', left: 1210, top: 150, width: 650, fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 25, lineHeight: 1.5, color: broken ? '#F08A84' : '#8FD694', whiteSpace: 'pre-wrap'}}>
        {'$ npx video-motion check\n\n'}
        {(broken ? p.msg || '' : p.pass || '').slice(0, typed)}
      </div>
    </AbsoluteFill>
  );
};

import {Freeze} from 'remotion';
const FrozenFM: React.FC<{pane: Pane; at: number}> = ({pane, at}) => (
  <Freeze frame={at}>
    <FaceMotion data={pane.data} layout={pane.layout} aspect={pane.aspect} mode="final" guides />
  </Freeze>
);
