// Pillar 1b: the kit knows where the whole person is (face, shoulders, arms, hands), not only the face.
// work/body.json (from lib/adapters/vision-body.swift on macOS, or the MediaPipe adapter, or nothing):
//   {width, height, fps, source, step, grid:{w,h}, samples:[{t, joints:{name:[x,y,c]}, hands:[{side,conf,pts:{name:[x,y,c]}}],
//     person:{bbox, cover, rows:[hex]} | null}], matte?:{dir,w,h,fps,count,pattern}}
// Pure JavaScript, no DOM: the same code runs in check (Node) and in the Remotion render.
//
// Safety contract (Codex review 11-20): a sample where the person was NOT measured is never read as "empty".
// It borrows the union of its known neighbours and is marked unsure; graphics there are hidden when nothing is known.

const hexBits = (row, gw) => {
  const out = new Uint8Array(gw);
  for (let i = 0; i < row.length && i * 4 < gw; i++) {
    const v = parseInt(row[i], 16) || 0;
    for (let b = 0; b < 4; b++) if (v & (8 >> b)) out[i * 4 + b] = 1;
  }
  return out;
};

/** Build a fast query object from body.json. */
export function makeBody(body) {
  if (!body || !Array.isArray(body.samples) || !body.samples.length) return null;
  const GW = body.grid?.w || 64, GH = body.grid?.h || 36;
  const W = body.width, H = body.height;
  const cw = W / GW, ch = H / GH;
  const S = body.samples;
  // raw grid per sample (null = not measured)
  const raw = S.map((s) => {
    if (!s.person || !Array.isArray(s.person.rows)) return null;
    const g = new Uint8Array(GW * GH);
    s.person.rows.forEach((row, y) => g.set(hexBits(row, GW), y * GW));
    return g;
  });
  const known = raw.map((g) => !!g);
  const anyKnown = known.some(Boolean);
  // conservative grid per sample: OR of itself and its neighbours (covers the motion between samples), dilated 1 cell
  const pre = raw.map((_, i) => {
    const g = new Uint8Array(GW * GH);
    let n = 0;
    for (const j of [i - 1, i, i + 1]) {
      let k = j;
      if (k < 0 || k >= S.length) continue;
      if (!raw[k]) {
        // unknown: borrow the nearest known samples on both sides
        let a = k, b = k;
        while (a >= 0 && !raw[a]) a--;
        while (b < S.length && !raw[b]) b++;
        for (const q of [a, b]) if (q >= 0 && q < S.length && raw[q]) { orInto(g, raw[q]); n++; }
        continue;
      }
      orInto(g, raw[k]);
      n++;
    }
    return dilate(g, GW, GH, 1);
  });
  const sat = pre.map((g) => summed(g, GW, GH));
  const step = body.step || (S.length > 1 ? S[1].t - S[0].t : 1 / 15);
  const idxAt = (t) => {
    if (t <= S[0].t) return 0;
    if (t >= S[S.length - 1].t) return S.length - 1;
    let lo = 0, hi = S.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (S[m].t <= t) lo = m; else hi = m; }
    return t - S[lo].t < S[hi].t - t ? lo : hi;
  };
  const countIn = (si, x0, y0, x1, y1) => {
    // cells [x0,x1) x [y0,y1)
    const A = sat[si], w = GW + 1;
    x0 = Math.max(0, Math.min(GW, x0)); x1 = Math.max(0, Math.min(GW, x1));
    y0 = Math.max(0, Math.min(GH, y0)); y1 = Math.max(0, Math.min(GH, y1));
    if (x1 <= x0 || y1 <= y0) return 0;
    return A[y1 * w + x1] - A[y0 * w + x1] - A[y1 * w + x0] + A[y0 * w + x0];
  };
  return {
    W, H, GW, GH, cw, ch, S, step, known, anyKnown, source: body.source || 'body.json', matte: body.matte || null,
    idxAt,
    /** person cells touched by a source-pixel rect at time t (0 = clear) */
    hitAt(rect, t) {
      const si = idxAt(t);
      return countIn(si, Math.floor(rect[0] / cw), Math.floor(rect[1] / ch), Math.ceil((rect[0] + rect[2]) / cw), Math.ceil((rect[1] + rect[3]) / ch));
    },
    unsureAt(t0, t1) {
      if (!anyKnown) return false;
      for (let i = idxAt(t0); i <= idxAt(t1); i++) if (!known[i]) {
        // unsure only if no known neighbour within 0.5 s
        let ok = false;
        for (let j = Math.max(0, i - 8); j <= Math.min(S.length - 1, i + 8); j++) if (known[j]) ok = true;
        if (!ok) return true;
      }
      return false;
    },
    /** person bbox (source px) unioned over [t0,t1], from the conservative grids */
    bboxOver(t0, t1) {
      let x0 = GW, y0 = GH, x1 = -1, y1 = -1;
      for (let i = idxAt(t0); i <= idxAt(t1); i++) {
        const g = pre[i];
        for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) if (g[y * GW + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      }
      return x1 < 0 ? null : [x0 * cw, y0 * ch, (x1 - x0 + 1) * cw, (y1 - y0 + 1) * ch];
    },
    gridAt(t) { return pre[idxAt(t)]; },
    rawAt(t) { return raw[idxAt(t)]; },
    // is this source point on the measured person at time t (no safety growth): for thin lines drawn around him
    rawHit(x, y, t) { const g = raw[idxAt(t)]; if (!g) return 0; const cx = Math.floor(x / cw), cy = Math.floor(y / ch); return cx < 0 || cy < 0 || cx >= GW || cy >= GH ? 0 : g[cy * GW + cx]; },
    /** top silhouette of the person (head + shoulders + arms) pushed out by `gap` source px: [[x,y],...] source px */
    // outline for drawing: the measured grid of this moment (not the grown safety grid), pushed out by `gap`
    skylineAt(t, gap) { const g = raw[idxAt(t)] || pre[idxAt(t)]; return g ? skyline(g, GW, GH, cw, ch, gap) : []; },
  };
}

const orInto = (a, b) => { for (let i = 0; i < a.length; i++) a[i] |= b[i]; };
function dilate(g, w, h, r) {
  if (r <= 0) return g;
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!g[y * w + x]) continue;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const X = x + dx, Y = y + dy;
      if (X >= 0 && X < w && Y >= 0 && Y < h) out[Y * w + X] = 1;
    }
  }
  return out;
}
function summed(g, w, h) {
  const A = new Int32Array((w + 1) * (h + 1));
  for (let y = 1; y <= h; y++) {
    let row = 0;
    for (let x = 1; x <= w; x++) {
      row += g[(y - 1) * w + (x - 1)];
      A[y * (w + 1) + x] = A[(y - 1) * (w + 1) + x] + row;
    }
  }
  return A;
}

// For each column: top of the person grown by `gap`. Columns with no person (after growing) are skipped.
function skyline(g, GW, GH, cw, ch, gap) {
  const rx = Math.ceil(gap / cw), ry = Math.ceil(gap / ch);
  const tops = new Array(GW).fill(null);
  for (let x = 0; x < GW; x++) {
    for (let y = 0; y < GH; y++) if (g[y * GW + x]) { tops[x] = y * ch; break; }
  }
  const grown = new Array(GW).fill(null);
  for (let x = 0; x < GW; x++) {
    let best = null;
    for (let k = -rx; k <= rx; k++) {
      const v = tops[x + k];
      if (v == null) continue;
      const dx = Math.max(0, Math.abs(k) * cw - cw * 0.5);
      const dy = Math.sqrt(Math.max(0, gap * gap - dx * dx));
      const y = v - dy;
      if (best == null || y < best) best = y;
    }
    grown[x] = best;
  }
  const pts = [];
  for (let x = 0; x < GW; x++) if (grown[x] != null) pts.push([x * cw + cw / 2, Math.max(0, grown[x])]);
  return pts;
}

// ---------- hands ----------
const P = (h, n, min = 0.25) => (h?.pts?.[n] && h.pts[n][2] >= min ? h.pts[n] : null);
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** Number of straight fingers (0-5) of one hand sample, or null when unsure. */
export function fingerCount(h) {
  const w = P(h, 'wrist');
  if (!w) return null;
  let n = 0, seen = 0;
  for (const f of ['index', 'middle', 'ring', 'little']) {
    const tip = P(h, f + 'Tip'), pip = P(h, f + 'PIP'), mcp = P(h, f + 'MCP');
    if (!tip || !pip || !mcp) continue;
    seen++;
    if (dist(w, tip) > dist(w, pip) * 1.18 && dist(mcp, tip) > dist(mcp, pip) * 1.4) n++;
  }
  const tt = P(h, 'thumbTip'), ti = P(h, 'thumbIP'), im = P(h, 'indexMCP'), lm = P(h, 'littleMCP');
  if (tt && ti && im) {
    seen++;
    const palm = lm ? dist(im, lm) : dist(w, im) * 0.8;
    if (dist(tt, im) > palm * 0.9 && dist(tt, w) > dist(ti, w) * 1.05) n++;
  }
  return seen >= 4 ? n : null;
}

/** Pointing direction of the index finger [dx,dy] (unit), when the hand points with one finger; else null. */
export function pointDir(h) {
  const tip = P(h, 'indexTip', 0.3), mcp = P(h, 'indexMCP', 0.3);
  if (!tip || !mcp || fingerCount(h) == null || fingerCount(h) > 2) return null;
  const d = dist(tip, mcp);
  if (d < 8) return null;
  return [(tip[0] - mcp[0]) / d, (tip[1] - mcp[1]) / d];
}

/** Box around all confident points of a hand (source px). */
export function handBox(h) {
  const pts = Object.values(h?.pts || {}).filter((p) => p[2] >= 0.25);
  if (pts.length < 5) return null;
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs), y0 = Math.min(...ys);
  return [x0, y0, Math.max(...xs) - x0, Math.max(...ys) - y0];
}

/**
 * A smooth track of one hand over frames [f0,f1): per frame {x,y,box,count,dir,ok}.
 * side: 'left' | 'right' | 'any' (the hand with the best confidence). Gaps shorter than 0.3 s are bridged,
 * longer gaps are ok=false (the graphic hides). Smoothing: centred moving average over +-3 frames.
 */
export function handTrack(B, side, f0, f1, fps) {
  if (!B) return null;
  const raw = [];
  for (let f = f0; f < f1; f++) {
    const s = B.S[B.idxAt(f / fps)];
    const hs = (s.hands || []).filter((h) => (side === 'any' || h.side === side) && h.conf >= 0.3);
    const h = hs.sort((a, b) => b.conf - a.conf)[0];
    const box = h ? handBox(h) : null;
    const tip = h ? P(h, 'indexTip', 0.3) : null;
    raw.push(box ? {x: box[0] + box[2] / 2, y: box[1] + box[3] / 2, box, tip: tip ? [tip[0], tip[1]] : null, count: fingerCount(h), dir: pointDir(h), conf: h.conf} : null);
  }
  const gap = Math.round(0.3 * fps);
  const out = raw.map((r) => (r ? {...r, ok: true} : null));
  // bridge short gaps
  for (let i = 0; i < out.length; i++) {
    if (out[i]) continue;
    let j = i;
    while (j < out.length && !out[j]) j++;
    const a = out[i - 1], b = out[j];
    if (a && b && j - i <= gap) for (let k = i; k < j; k++) {
      const u = (k - i + 1) / (j - i + 1);
      out[k] = {x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, box: a.box.map((v, q) => v + (b.box[q] - v) * u), tip: a.tip && b.tip ? [a.tip[0] + (b.tip[0] - a.tip[0]) * u, a.tip[1] + (b.tip[1] - a.tip[1]) * u] : a.tip || b.tip, count: a.count, dir: a.dir, conf: Math.min(a.conf, b.conf), ok: true, bridged: true};
    }
    i = j;
  }
  const R = 3;
  return out.map((o, i) => {
    if (!o) return {ok: false};
    let sx = 0, sy = 0, n = 0;
    for (let k = i - R; k <= i + R; k++) if (out[k]) { sx += out[k].x; sy += out[k].y; n++; }
    // finger count: most common value in +-5 frames (no flicker)
    const votes = {};
    for (let k = i - 5; k <= i + 5; k++) if (out[k] && out[k].count != null) votes[out[k].count] = (votes[out[k].count] || 0) + 1;
    const count = Object.keys(votes).length ? +Object.entries(votes).sort((a, b) => b[1] - a[1])[0][0] : null;
    return {...o, x: sx / n, y: sy / n, count};
  });
}

/**
 * The whole measured rig per video frame over [f0,f1): {joints: {name: [x,y]}, hands: [{side, pts: {name: [x,y]}, box, count, pinch}]}
 * in body.json px. Samples (often 15 per second) are interpolated to every frame, then smoothed over +-2 frames,
 * so lines drawn from a fingertip or a shoulder glide with the real body. Points under 0.3 confidence are left out.
 * A hand that is not seen for longer than 0.3 s is simply absent at those frames (the graphic decides what to do).
 */
export function rigTrack(B, f0, f1, fps) {
  if (!B) return null;
  const S = B.S;
  const lerpPts = (a, b, u) => {
    const out = {};
    for (const k of new Set([...Object.keys(a || {}), ...Object.keys(b || {})])) {
      const p = a?.[k] && a[k][2] >= 0.3 ? a[k] : null, q = b?.[k] && b[k][2] >= 0.3 ? b[k] : null;
      if (p && q) out[k] = [p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u];
      else if (p && u < 0.5) out[k] = [p[0], p[1]];
      else if (q && u >= 0.5) out[k] = [q[0], q[1]];
    }
    return out;
  };
  const handOf = (s, side) => (s?.hands || []).filter((h) => h.side === side && h.conf >= 0.3).sort((a, b) => b.conf - a.conf)[0] || null;
  const raw = [];
  for (let f = f0; f < f1; f++) {
    const t = f / fps;
    let lo = B.idxAt(t);
    if (S[lo].t > t && lo > 0) lo--;
    const hi = Math.min(S.length - 1, lo + 1);
    const span = S[hi].t - S[lo].t;
    const u = span > 0 ? Math.max(0, Math.min(1, (t - S[lo].t) / span)) : 0;
    const joints = lerpPts(S[lo].joints, S[hi].joints, u);
    const hands = [];
    for (const side of ['left', 'right']) {
      const a = handOf(S[lo], side), b = handOf(S[hi], side);
      if (!a && !b) continue;
      // one side only: keep it if that sample is close in time (bridges a single missed look)
      if (!a && Math.abs(S[hi].t - t) > 0.3) continue;
      if (!b && Math.abs(t - S[lo].t) > 0.3) continue;
      const pts = a && b ? lerpPts(a.pts, b.pts, u) : lerpPts((a || b).pts, (a || b).pts, 0);
      if (Object.keys(pts).length < 5) continue;
      hands.push({side, pts, count: fingerCount(u < 0.5 ? a || b : b || a)});
    }
    raw.push({joints, hands});
  }
  // smoothing: centred average over +-2 frames, per named point
  const R = 2;
  const avg = (get) => (i) => {
    let sx = 0, sy = 0, n = 0;
    for (let k = i - R; k <= i + R; k++) { const p = k >= 0 && k < raw.length ? get(raw[k]) : null; if (p) { sx += p[0]; sy += p[1]; n++; } }
    return n ? [sx / n, sy / n] : null;
  };
  return raw.map((r, i) => {
    const joints = {};
    for (const k of Object.keys(r.joints)) joints[k] = avg((x) => x.joints[k])(i);
    const hands = r.hands.map((h) => {
      const pts = {};
      for (const k of Object.keys(h.pts)) pts[k] = avg((x) => x.hands.find((q) => q.side === h.side)?.pts[k])(i);
      const xs = Object.values(pts).map((p) => p[0]), ys = Object.values(pts).map((p) => p[1]);
      const box = [Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)];
      const palm = pts.indexMCP && pts.littleMCP ? dist(pts.indexMCP, pts.littleMCP) : Math.max(box[2], box[3]) * 0.4;
      const pinch = pts.thumbTip && pts.indexTip ? Math.max(0, Math.min(1, 1 - dist(pts.thumbTip, pts.indexTip) / (palm * 1.6 || 1))) : null;
      return {side: h.side, pts, box, count: h.count, pinch};
    });
    return {joints, hands};
  });
}

/**
 * Beats of a hand: indexes where a height series (y grows downward, null = not seen) reaches a lowest point on screen
 * right after a down stroke of at least `drop` px within 9 frames, at least `gap` frames after the last beat.
 */
export function downBeats(ys, drop, gap = 7) {
  const beats = [];
  for (let q = 3; q < ys.length - 2; q++) {
    const y = ys[q];
    if (y == null) continue;
    if ([ys[q - 1], ys[q + 1], ys[q + 2]].some((v) => v == null || v > y)) continue;
    let top = y;
    for (let b = Math.max(0, q - 9); b < q; b++) if (ys[b] != null) top = Math.min(top, ys[b]);
    if (y - top < drop) continue;
    if (beats.length && q - beats[beats.length - 1] < gap) continue;
    beats.push(q);
  }
  return beats;
}

/** Which joints were seen (share of samples with conf >= 0.3), for the report. */
export function bodyFacts(B) {
  if (!B) return null;
  const n = B.S.length;
  const share = (fn) => Math.round((B.S.filter(fn).length / n) * 100);
  return {
    samples: n,
    person: share((s) => s.person && s.person.cover > 0),
    shoulders: share((s) => (s.joints?.leftShoulder?.[2] ?? 0) >= 0.3 && (s.joints?.rightShoulder?.[2] ?? 0) >= 0.3),
    hands: share((s) => (s.hands || []).some((h) => h.conf >= 0.3)),
    twoHands: share((s) => (s.hands || []).filter((h) => h.conf >= 0.3).length >= 2),
    unknown: share((s) => !s.person),
  };
}
