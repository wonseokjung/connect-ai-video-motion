// Face adapter (c): stills every second with a pixel grid, so an agent can read the head box and write face.json.
import React from 'react';
import {AbsoluteFill, CalculateMetadataFunction, Freeze, OffthreadVideo, staticFile} from 'remotion';
import {FONT} from '../brand';

type P = {meta: any; cols?: number; cellW?: number; step?: number};
export const calcFaceSheet: CalculateMetadataFunction<P> = async ({props}) => {
  const cols = props.cols || 4, cellW = props.cellW || 480, step = props.step || 1;
  const n = Math.max(1, Math.floor(props.meta.duration / step));
  const cellH = Math.round((cellW * props.meta.height) / props.meta.width);
  return {durationInFrames: Math.round(props.meta.duration * props.meta.fps), fps: props.meta.fps, width: cols * cellW + (cols + 1) * 12, height: 60 + Math.ceil(n / cols) * (cellH + 40), props: {...props, cols, cellW, step}};
};
export const FaceSheet: React.FC<P> = ({meta, cols = 4, cellW = 480, step = 1}) => {
  const n = Math.max(1, Math.floor(meta.duration / step));
  const k = cellW / meta.width, cellH = Math.round(meta.height * k);
  const grid: React.ReactNode[] = [];
  for (let x = 0; x <= meta.width; x += 100) grid.push(<div key={'x' + x} style={{position: 'absolute', left: x * k, top: 0, bottom: 0, width: 1, background: x % 500 ? 'rgba(255,255,255,0.12)' : 'rgba(242,180,90,0.6)'}} />);
  for (let y = 0; y <= meta.height; y += 100) grid.push(<div key={'y' + y} style={{position: 'absolute', top: y * k, left: 0, right: 0, height: 1, background: y % 500 ? 'rgba(255,255,255,0.12)' : 'rgba(242,180,90,0.6)'}} />);
  return (
    <AbsoluteFill style={{background: '#0B0A09', fontFamily: FONT, color: '#EBE2D2'}}>
      <div style={{position: 'absolute', left: 12, top: 16, fontSize: 22}}>face sheet · {meta.width}x{meta.height} px · thin lines every 100 px, gold every 500 px</div>
      {Array.from({length: n}, (_, i) => {
        const t = i * step;
        const x = 12 + (i % cols) * (cellW + 12), y = 60 + Math.floor(i / cols) * (cellH + 40);
        return (
          <div key={i} style={{position: 'absolute', left: x, top: y, width: cellW}}>
            <div style={{position: 'relative', width: cellW, height: cellH, overflow: 'hidden'}}>
              <Freeze frame={Math.round(t * meta.fps)}>
                <OffthreadVideo src={staticFile(meta.file)} muted style={{width: cellW, height: cellH}} />
              </Freeze>
              {grid}
            </div>
            <div style={{fontSize: 16, marginTop: 6, opacity: 0.8}}>t = {t.toFixed(1)} s</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
