// The room turns into data: a scan line sweeps across the frame and the real room behind you becomes a grid of big
// pixels (sampled from the video itself), with hairline cells and live scan readouts. You stay real: it all happens
// behind the person matte, so the scan passes behind you and your pixels never change. Our "real / virtual" look.
import React from 'react';
import {OffthreadVideo, staticFile} from 'remotion';
import {GraphicProps, HUE, caps, exitK, hueOf, k01, OUT, IN} from '../../../src/catalog/ui';

const RoomToData: React.FC<GraphicProps & {video?: any}> = ({it, lf, dur, st, u, W, H, video}) => {
  if (!video?.src) return null;
  const B = Math.round(26 * u); // one data pixel
  const col = hueOf(it, HUE.teal), gold = HUE.goldHi;
  const inK = k01(lf, 0, 34, OUT), outK = k01(lf, dur - 22, dur - 2, IN);
  const fromRight = it.from === 'right';
  // the scan goes across, holds, and goes back at the end
  const p = inK * (1 - outK);
  const xLine = fromRight ? W * (1 - p) : W * p;
  const mask = fromRight ? `linear-gradient(90deg, transparent ${xLine - 2}px, black ${xLine + 2}px)` : `linear-gradient(90deg, black ${xLine - 2}px, transparent ${xLine + 2}px)`;
  const sw = video.srcW * video.scale, sh = video.srcH * video.scale;
  const readX = Math.round((xLine / W) * 1000);
  const rows = [0.18, 0.42, 0.66];
  return (
    <div style={{position: 'absolute', inset: 0}}>
      <svg width={0} height={0} style={{position: 'absolute'}}>
        <filter id="rtdPx" x="0" y="0" width="100%" height="100%" filterUnits="userSpaceOnUse">
          <feFlood x={B / 2} y={B / 2} width={1} height={1} />
          <feComposite width={B} height={B} />
          <feTile result="dots" />
          <feComposite in="SourceGraphic" in2="dots" operator="in" />
          <feMorphology operator="dilate" radius={B / 2} />
        </filter>
      </svg>
      <div style={{position: 'absolute', inset: 0, WebkitMaskImage: mask, maskImage: mask}}>
        <div style={{position: 'absolute', left: -video.camX, top: 0, width: sw, height: sh, filter: 'url(#rtdPx) saturate(1.35) contrast(1.15) brightness(1.05)'}}>
          <OffthreadVideo src={staticFile(video.src)} startFrom={video.startFrame} muted style={{width: '100%', height: '100%'}} />
        </div>
        {/* a data tint and the cell lines */}
        <div style={{position: 'absolute', inset: 0, background: `linear-gradient(180deg, rgba(63,183,166,0.20), rgba(155,123,216,0.16))`, mixBlendMode: 'screen'}} />
        <div style={{position: 'absolute', inset: 0, backgroundImage: `linear-gradient(90deg, rgba(11,10,9,0.55) 1px, transparent 1px), linear-gradient(0deg, rgba(11,10,9,0.55) 1px, transparent 1px)`, backgroundSize: `${B}px ${B}px`}} />
        <div style={{position: 'absolute', inset: 0, backgroundImage: `linear-gradient(90deg, ${col} 1px, transparent 1px), linear-gradient(0deg, ${col} 1px, transparent 1px)`, backgroundSize: `${B * 4}px ${B * 4}px`, opacity: 0.35}} />
      </div>
      {/* the scan line */}
      {p > 0.002 && p < 0.998 && (
        <>
          <div style={{position: 'absolute', left: xLine - 60 * u, top: 0, width: 120 * u, height: H, background: `linear-gradient(90deg, transparent, rgba(242,180,90,0.25), transparent)`}} />
          <div style={{position: 'absolute', left: xLine - 1.5 * u, top: 0, width: 3 * u, height: H, background: gold, boxShadow: `0 0 ${20 * u}px ${gold}, 0 0 ${50 * u}px ${gold}`}} />
          {rows.map((y, q) => (
            <div key={q} style={{position: 'absolute', left: xLine + (fromRight ? -190 * u : 14 * u), top: H * y, width: 176 * u, textAlign: fromRight ? 'right' : 'left', ...caps(st, 15 * u, gold), fontVariantNumeric: 'tabular-nums'}}>
              {['SCAN X ' + String(readX).padStart(4, '0'), 'CELL ' + B + ' PX', 'ROOM > DATA'][q]}
            </div>
          ))}
        </>
      )}
      {it.text && (
        <div style={{position: 'absolute', left: fromRight ? W * 0.62 : 60 * u, top: H * 0.1, ...caps(st, 34 * u, '#FFFFFF'), letterSpacing: '0.4em', textShadow: `0 0 ${18 * u}px ${col}`, opacity: k01(lf, 18, 30) * (1 - outK)}}>{String(it.text)}</div>
      )}
    </div>
  );
};
export default RoomToData;
