// Still sheet for self-QA: every graphic at enter / peak / exit, with the face box and graphic boxes drawn.
// Idea of "render -> stills -> look -> fix" from VideoZero/skills (Apache-2.0, idea only, no code).
import React from 'react';
import {AbsoluteFill, CalculateMetadataFunction, Freeze} from 'remotion';
import {calcFaceMotion, FaceMotion, FMProps} from './FaceMotion';
import {FONT} from '../brand';

export type SheetProps = FMProps & {cells?: {f: number; label: string; bad?: boolean}[]; bad?: string[]; only?: string; cols?: number; cellW?: number; title?: string};

export const calcSheet: CalculateMetadataFunction<SheetProps> = async (args) => {
  const base: any = await calcFaceMotion(args as any);
  const p = {...args.props, ...base.props};
  const layout = p.layout;
  let cells = p.cells;
  if (!cells || !cells.length) {
    cells = [];
    for (const it of layout.items) {
      if (it.hidden || (p.only && it.id !== p.only)) continue;
      const bad = (p.bad || []).includes(it.id);
      const mid = Math.round((it.f0 + it.f1) / 2);
      cells.push({f: it.f0 + 5, label: `${it.id} · enter · ${(it.f0 / layout.fps).toFixed(1)}s`, bad});
      cells.push({f: mid, label: `${it.id} · peak · ${(mid / layout.fps).toFixed(1)}s`, bad});
      cells.push({f: Math.max(it.f0, it.f1 - 5), label: `${it.id} · exit · ${(it.f1 / layout.fps).toFixed(1)}s`, bad});
    }
    if (layout.post && !p.only) cells.push({f: layout.total - 20, label: 'endcard'});
  }
  const cols = p.cols || 3;
  const cellW = p.cellW || (layout.W > layout.H ? 640 : 300);
  const cellH = Math.round((cellW * layout.H) / layout.W);
  const rows = Math.ceil(cells.length / cols);
  return {durationInFrames: layout.total, fps: layout.fps, width: cols * cellW + (cols + 1) * 16, height: 70 + rows * (cellH + 46) + 16, props: {...p, cells, cols, cellW}};
};

export const Sheet: React.FC<SheetProps> = (p) => {
  const {layout} = p as any;
  if (!layout) return null;
  const cellW = p.cellW!, cellH = Math.round((cellW * layout.H) / layout.W), k = cellW / layout.W;
  return (
    <AbsoluteFill style={{background: '#0B0A09', fontFamily: FONT, color: '#EBE2D2'}}>
      <div style={{position: 'absolute', left: 16, top: 18, fontSize: 26, fontWeight: 300}}>{p.title || 'video-motion · still sheet'}</div>
      {p.cells!.map((c, i) => {
        const x = 16 + (i % p.cols!) * (cellW + 16), y = 70 + Math.floor(i / p.cols!) * (cellH + 46);
        return (
          <div key={i} style={{position: 'absolute', left: x, top: y, width: cellW}}>
            <div style={{width: cellW, height: cellH, overflow: 'hidden', position: 'relative', outline: c.bad ? '3px solid #E0605A' : '1px solid #2a2622'}}>
              <div style={{width: layout.W, height: layout.H, transform: `scale(${k})`, transformOrigin: '0 0', position: 'absolute'}}>
                <Freeze frame={Math.max(0, Math.min(layout.total - 1, c.f))}>
                  <FaceMotion {...p} guides={p.guides !== false} />
                </Freeze>
              </div>
            </div>
            <div style={{marginTop: 8, fontSize: 17, color: c.bad ? '#E0605A' : 'rgba(235,226,210,0.75)', whiteSpace: 'nowrap', overflow: 'hidden'}}>{c.label}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
