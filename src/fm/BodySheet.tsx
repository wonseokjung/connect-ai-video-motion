// Body sheet: what the body detector really found, on stills of your video: the person area (orange cells,
// hands and arms included), shoulders and arms (lines), hand points (blue), and per hand the finger count.
import React from 'react';
import {AbsoluteFill, CalculateMetadataFunction, Freeze, OffthreadVideo, staticFile} from 'remotion';
import {PersonGuide} from './FaceMotion';
import {makeBody, handTrack, bodyFacts} from '../core/body.mjs';
import {FONT} from '../brand';

export type BodySheetProps = {data?: any; times?: number[]; cols?: number; cellW?: number};

export const calcBodySheet: CalculateMetadataFunction<BodySheetProps> = async ({props}) => {
  const d = props.data;
  const n = props.times?.length || 6;
  const times = props.times || Array.from({length: n}, (_, i) => +(((i + 0.5) / n) * (d?.meta?.duration || 6)).toFixed(2));
  const cols = props.cols || 3, cellW = props.cellW || 640;
  const cellH = Math.round((cellW * (d?.meta?.height || 1080)) / (d?.meta?.width || 1920));
  const rows = Math.ceil(times.length / cols);
  return {durationInFrames: 1, fps: 30, width: cols * cellW + (cols + 1) * 14, height: 70 + rows * (cellH + 40) + 14, props: {...props, times, cols, cellW}};
};

export const BodySheet: React.FC<BodySheetProps> = ({data, times = [], cols = 3, cellW = 640}) => {
  if (!data?.meta) return null;
  const B = makeBody(data.body);
  const Wv = data.meta.width, Hv = data.meta.height, k = cellW / Wv, cellH = Math.round(cellW * (Hv / Wv));
  const facts = bodyFacts(B);
  const layout = {fps: 30, scale: 1, bodyScale: [B ? Wv / B.W : 1, B ? Hv / B.H : 1], camera: null, W: Wv, H: Hv};
  return (
    <AbsoluteFill style={{background: '#0B0A09', fontFamily: FONT, color: '#EBE2D2'}}>
      <div style={{position: 'absolute', left: 14, top: 18, fontSize: 24, fontWeight: 300}}>
        body detector: {B ? B.source : 'none'}{facts ? ` · person in ${facts.person} % of looks · shoulders ${facts.shoulders} % · a hand ${facts.hands} % · both hands ${facts.twoHands} %` : ''}
      </div>
      {times.map((t, i) => {
        const f = Math.round(t * 30);
        const x = 14 + (i % cols) * (cellW + 14), y = 70 + Math.floor(i / cols) * (cellH + 40);
        const hands = B ? ['left', 'right'].map((side) => ({side, p: handTrack(B, side, f, f + 1, 30)?.[0]})).filter((h) => h.p?.ok) : [];
        return (
          <div key={i} style={{position: 'absolute', left: x, top: y, width: cellW}}>
            <div style={{width: cellW, height: cellH, overflow: 'hidden', position: 'relative'}}>
              <div style={{width: Wv, height: Hv, transform: `scale(${k})`, transformOrigin: '0 0', position: 'absolute'}}>
                <Freeze frame={f}>
                  <OffthreadVideo src={staticFile(data.meta.file)} muted style={{position: 'absolute', width: Wv, height: Hv}} />
                  <PersonGuide data={data} layout={layout} f={f} u={Hv / 1080} />
                </Freeze>
                {hands.map((h: any) => (
                  <div key={h.side} style={{position: 'absolute', left: h.p.box[0] * layout.bodyScale[0], top: h.p.box[1] * layout.bodyScale[1] - 46, fontFamily: FONT, fontSize: 30, color: '#8FB7E0', whiteSpace: 'nowrap'}}>
                    {h.side} hand · {h.p.count == null ? '?' : h.p.count} finger{h.p.count === 1 ? '' : 's'}
                  </div>
                ))}
              </div>
            </div>
            <div style={{marginTop: 6, fontSize: 16, color: 'rgba(235,226,210,0.7)'}}>{t.toFixed(2)} s</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
