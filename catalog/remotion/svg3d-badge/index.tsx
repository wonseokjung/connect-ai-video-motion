// A thick hexagon badge turns in 3D and lands facing you (@remotion/svg-3d-engine extrude + @remotion/shapes), its word beside it.
import React from 'react';
import {centerPath, getBoundingBox, parsePath} from '@remotion/paths';
import {makePolygon} from '@remotion/shapes';
import {extrudeAndTransformElement, reduceMatrices, rotateX, rotateY, threeDIntoSvgPath, transformPath, translateZ, MatrixTransform4D} from '@remotion/svg-3d-engine';
import type {FaceType} from '@remotion/svg-3d-engine';
import {Box, GraphicProps, HUE, OUT, caps, exitK, fit, hueOf, k01, type} from '../../../src/catalog/ui';

type V4 = [number, number, number, number];
const mul = (m: MatrixTransform4D, p: V4): V4 => {
  const r: V4 = [0, 0, 0, 0];
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) r[i] += m[i * 4 + j] * p[j];
  return r;
};
const shade = (c: string, k: number) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  return `rgb(${Math.round(r * k)},${Math.round(g * k)},${Math.round(b * k)})`;
};
const faceZ = (f: FaceType) => f.points.reduce((a, p) => a + p.point[2], 0) / f.points.length;
const light = (f: FaceType) => {
  let nx = 0, ny = 0, nz = 0;
  const pts = f.points.map((p) => p.point);
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    nx += (a[1] - b[1]) * (a[2] + b[2]);
    ny += (a[2] - b[2]) * (a[0] + b[0]);
    nz += (a[0] - b[0]) * (a[1] + b[1]);
  }
  const l = Math.hypot(nx, ny, nz) || 1;
  return 0.35 + 0.45 * Math.abs(nz / l) + 0.25 * Math.abs(ny / l);
};

const Svg3dBadge: React.FC<GraphicProps> = ({it, r, lf, dur, st, ink, scrim, u}) => {
  const D = Math.min(r[3], r[2] * 0.42);
  const col = hueOf(it, HUE.gold);
  const d = centerPath(makePolygon({points: 6, radius: D * 0.4, cornerRadius: D * 0.04}).path);
  const k = k01(lf, 0, 30, OUT), out = exitK(lf, dur);
  const m = reduceMatrices([rotateY((1 - k) * Math.PI * 1.4 + Math.sin(lf / 22) * 0.18), rotateX(-0.22 + (1 - k) * 0.5)]);
  const depth = D * 0.16;
  const sides = extrudeAndTransformElement({depth, pressInDepth: 0, sideColor: col, points: parsePath(d), crispEdges: false, transformations: m});
  const faces = sides.map((f) => ({d: threeDIntoSvgPath(f.points), z: faceZ(f), fill: shade(col, Math.min(1, light(f)) * 0.7)}));
  const bb = getBoundingBox(d);
  for (const [z, kk] of [[depth / 2, 0.5], [-depth / 2, 1]] as const) {
    const mm = reduceMatrices([translateZ(z), m]);
    const c = mul(mm, [(bb.x1 + bb.x2) / 2, (bb.y1 + bb.y2) / 2, 0, 1]);
    faces.push({d: transformPath({path: d, transformation: mm}), z: c[2], fill: shade(col, kk)});
  }
  const text = String(it.text || 'Badge');
  const fs = fit(text, r[2] - D - 24 * u, D * 0.44, st.weight, st.tracking);
  return (
    <Box r={r} scrim={scrim} u={u} style={{opacity: Math.min(1, k * 3) * (1 - out)}}>
      <svg width={D} height={D} viewBox={`${-D / 2} ${-D / 2} ${D} ${D}`} style={{position: 'absolute', left: 0, top: (r[3] - D) / 2, overflow: 'visible'}}>
        {faces.sort((a, b) => b.z - a.z).map((f, i) => <path key={i} d={f.d} fill={f.fill} stroke={f.fill} strokeWidth={0.8} strokeLinejoin="round" />)}
      </svg>
      <div style={{position: 'absolute', left: D + 20 * u, top: r[3] / 2 - fs * 0.7, ...type(st, fs, ink), opacity: k01(lf, 14, 24)}}>{text}</div>
      {it.sub && <div style={{position: 'absolute', left: D + 22 * u, top: r[3] / 2 + fs * 0.5, ...caps(st, Math.max(10, fs * 0.26), st.accentHi), opacity: k01(lf, 18, 28)}}>{String(it.sub)}</div>}
    </Box>
  );
};
export default Svg3dBadge;
