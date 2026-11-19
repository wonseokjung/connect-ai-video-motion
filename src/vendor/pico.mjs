// Pico face detector runtime, pure JavaScript, no native parts.
// From AhsanAyaz/ossclip (MIT), commit 49660fc2063467cf, packages/core/src/face.ts, which ports
// nenadmarkus/picojs (MIT). Licences: licenses/ossclip-MIT.txt, licenses/pico-MIT.txt.
// What we changed: TypeScript -> JavaScript, kept unpack / scan / cluster / tilt sweep as they are.
// The trained cascade file "facefinder" (nenadmarkus/pico, MIT, 239,632 bytes) is NOT shipped yet:
// put it at models/facefinder to turn this adapter on.

export function unpackCascade(bytes) {
  const dview = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let p = 8;
  const tdepth = dview.getInt32(p, true); p += 4;
  const ntrees = dview.getInt32(p, true); p += 4;
  const pow2tdepth = 2 ** tdepth;
  const tcodesLs = [], tpredsLs = [], threshLs = [];
  for (let t = 0; t < ntrees; t++) {
    tcodesLs.push(0, 0, 0, 0);
    for (let i = 0; i < 4 * pow2tdepth - 4; i++) tcodesLs.push(dview.getInt8(p + i));
    p += 4 * pow2tdepth - 4;
    for (let i = 0; i < pow2tdepth; i++) { tpredsLs.push(dview.getFloat32(p, true)); p += 4; }
    threshLs.push(dview.getFloat32(p, true)); p += 4;
  }
  const tcodes = new Int8Array(tcodesLs), tpreds = new Float32Array(tpredsLs), thresh = new Float32Array(threshLs);
  return (r, c, s, pixels, ldim) => {
    r *= 256; c *= 256;
    let root = 0, o = 0;
    for (let i = 0; i < ntrees; i++) {
      let idx = 1;
      for (let j = 0; j < tdepth; j++) {
        const p1 = pixels[((r + tcodes[root + 4 * idx] * s) >> 8) * ldim + ((c + tcodes[root + 4 * idx + 1] * s) >> 8)];
        const p2 = pixels[((r + tcodes[root + 4 * idx + 2] * s) >> 8) * ldim + ((c + tcodes[root + 4 * idx + 3] * s) >> 8)];
        idx = 2 * idx + (p1 <= p2 ? 1 : 0);
      }
      o += tpreds[pow2tdepth * i + idx - pow2tdepth];
      if (o <= thresh[i]) return -1;
      root += 4 * pow2tdepth;
    }
    return o - thresh[ntrees - 1];
  };
}

function runCascade(pixels, nrows, ncols, classify, {shiftfactor, minsize, maxsize, scalefactor}) {
  const dets = [];
  let scale = minsize;
  while (scale <= maxsize) {
    const step = Math.max(shiftfactor * scale, 1) | 0;
    const offset = (scale / 2 + 1) | 0;
    for (let r = offset; r <= nrows - offset; r += step)
      for (let c = offset; c <= ncols - offset; c += step) {
        const q = classify(r, c, scale, pixels, ncols);
        if (q > 0) dets.push([r, c, scale, q]);
      }
    scale *= scalefactor;
  }
  return dets;
}

function cluster(dets, thr) {
  dets = [...dets].sort((a, b) => b[3] - a[3]);
  const iou = (a, b) => {
    const oR = Math.max(0, Math.min(a[0] + a[2] / 2, b[0] + b[2] / 2) - Math.max(a[0] - a[2] / 2, b[0] - b[2] / 2));
    const oC = Math.max(0, Math.min(a[1] + a[2] / 2, b[1] + b[2] / 2) - Math.max(a[1] - a[2] / 2, b[1] - b[2] / 2));
    return (oR * oC) / (a[2] * a[2] + b[2] * b[2] - oR * oC);
  };
  const used = new Array(dets.length).fill(false), out = [];
  for (let i = 0; i < dets.length; i++) {
    if (used[i]) continue;
    let r = 0, c = 0, s = 0, q = 0, n = 0;
    for (let j = i; j < dets.length; j++)
      if (iou(dets[i], dets[j]) > thr) { used[j] = true; r += dets[j][0]; c += dets[j][1]; s += dets[j][2]; q += dets[j][3]; n++; }
    out.push([r / n, c / n, s / n, q]);
  }
  return out;
}

function rotateGray(px, w, h, deg) {
  const a = (deg * Math.PI) / 180, cos = Math.cos(a), sin = Math.sin(a), cx = (w - 1) / 2, cy = (h - 1) / 2;
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const dx = x - cx, dy = y - cy;
      const sx = Math.round(cx + cos * dx + sin * dy), sy = Math.round(cy - sin * dx + cos * dy);
      if (sx >= 0 && sx < w && sy >= 0 && sy < h) out[y * w + x] = px[sy * w + sx];
    }
  return out;
}

const MIN_SCORE = 5;
// Best face in a grayscale frame: [row, col, size, score] or null. Upright first, then a tilt sweep.
export function detectFace(classify, pixels, w, h) {
  const params = {shiftfactor: 0.1, minsize: Math.max(24, Math.round(h * 0.094)), maxsize: h, scalefactor: 1.1};
  const best = (px) => {
    const d = cluster(runCascade(px, h, w, classify, params), 0.2).filter((x) => x[3] >= MIN_SCORE);
    return d.length ? d.reduce((a, b) => (b[3] > a[3] ? b : a)) : null;
  };
  const up = best(pixels);
  if (up) return up;
  for (const deg of [-20, 20, -40, 40]) {
    const hit = best(rotateGray(pixels, w, h, deg));
    if (!hit) continue;
    const a = (deg * Math.PI) / 180, cx = (w - 1) / 2, cy = (h - 1) / 2, dx = hit[1] - cx, dy = hit[0] - cy;
    return [cy - Math.sin(a) * dx + Math.cos(a) * dy, cx + Math.cos(a) * dx + Math.sin(a) * dy, hit[2], hit[3]];
  }
  return null;
}
