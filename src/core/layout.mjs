// The heart of the kit: plan.json + face.json + words.json -> where and when every graphic sits.
// Pure JavaScript, no DOM: the same code runs in the Remotion preview, in the renderer and in `check`.
//
// Rules (all enforced here, then measured again by check):
//  - a graphic never enters the detected face box + 24 px (scaled) margin
//  - a graphic keeps one position while it is on screen; it moves once, smoothly, only if the face moves a lot
//  - if the side space is too narrow (close-up, vertical) it moves to the lower band or top banner instead of shrinking
//  - a graphic appears 40 ms after its word (0-80 ms window), never before
//  - in 9:16, the app buttons and caption area of Reels / Shorts / TikTok are no-go zones (numbers from facecammaxxing, MIT)
// Two rules here follow AhsanAyaz/ossclip (MIT, 49660fc, packages/scenes/src/overlay-rect.ts): one box for a graphic's
// whole window (never re-placed per frame), and a graphic with no room is dropped and reported, never squeezed.

import {faceAt, followTrack, inflate, overlapArea, union} from './face.mjs';
import {resolveAt, toWords} from './words.mjs';
import {platformZones} from '../vendor/facecam.mjs';

export const FACE_MARGIN = 24; // px at 1080p, scaled with the frame
export const WORD_DELAY = 0.04; // s after the word starts
export const MOVE_FRAMES = 12; // one smooth move when the face moves a lot
export const END_FADE = 12;
export const FACE_GAP = 0.3; // graphics stay at least 0.3 face widths away from the face box

// Body keep-out, estimated from the face box: shoulders and torso under the face.
// plan.body or my-info.json "body": false (off), a number (width in face widths) or {width, top, tallDepth}.
//   width: body width in face widths (3), centred on the face
//   top: where the body starts, as a fraction of the face height from the face top (0.75 = shoulder line)
//   tallDepth: 9:16 only, how far down the body box goes, in face heights from its top (0.55 = shoulders + upper chest);
//              below that the lower chest band may be used, because in a 9:16 crop the body fills the whole width
export function bodyOpt(plan, info) {
  const v = plan?.body ?? info?.body;
  if (v === false || v === 0) return null;
  const o = typeof v === 'number' ? {width: v} : v && typeof v === 'object' ? v : {};
  return {width: o.width ?? 3, top: o.top ?? 0.75, tallDepth: o.tallDepth ?? 0.55};
}
export function bodyBox(b, W, H, opt, tall) {
  if (!b || !opt) return null;
  const w = b[2] * opt.width, cx = b[0] + b[2] / 2, y = b[1] + b[3] * opt.top;
  const h = tall ? Math.min(H - y, b[3] * opt.tallDepth) : H - y;
  return h > 0 ? [cx - w / 2, y, w, h] : null;
} // video -> end card cross fade (@remotion/transitions)

const ADV = (ch) => (/[A-Z]/.test(ch) ? 0.66 : /[a-z]/.test(ch) ? 0.53 : /[0-9]/.test(ch) ? 0.6 : ch === ' ' ? 0.27 : 0.34);
export const textW = (s, fs, tracking = 0) => {
  const str = String(s ?? '');
  let w = 0;
  for (const ch of str) w += ADV(ch);
  return (w + tracking * str.length) * fs * 1.04;
};

// Each kind: default length (s), slot order, and its box size at this frame unit u (1 = 1080 px short side).
// Each kind: default length (s), slot order, and its box size. Sizes are fractions of the frame, not pixels:
// 16:9 main graphics 28-40 % of the width, big type 14-22 % of the height; 9:16 graphics 55-80 % of the width.
// F = {W, H, tall}. "U" = the type unit: frame height in 16:9, 0.7 x width in 9:16.
const box = (F, minF, maxF, want) => Math.min(F.W * (F.tall ? 0.8 : maxF), Math.max(F.W * (F.tall ? 0.55 : minF), want));
const fsFor = (text, F, maxW, lo, hi, tr = -0.02) => {
  const U = F.tall ? F.W * 0.95 : F.H;
  const per = textW(text || 'X', 1, tr) || 1;
  return Math.max(U * lo, Math.min(U * hi, maxW / per));
};
export const KINDS = {
  nametag: {
    dur: 3.6,
    slots: ['lower-left', 'lower-right', 'lower-band', 'top-banner'],
    size: (it, u, st, F) => {
      const maxW = F.W * (F.tall ? 0.74 : 0.32);
      const fs = fsFor(it.text, F, maxW, 0.055, 0.085, st.tracking);
      const w = box(F, 0.26, 0.34, textW(it.text, fs, st.tracking) + fs * 0.6);
      return [w, fs * 1.2 + fs * 0.42 * 1.7 + fs * 0.5];
    },
  },
  keyword: {
    dur: 1.9,
    slots: ['beside-right', 'beside-left', 'lower-band', 'top-banner'],
    size: (it, u, st, F) => {
      const maxW = F.W * (F.tall ? 0.76 : 0.38);
      const fs = fsFor(it.text, F, maxW, 0.14, 0.2, st.tracking);
      return [box(F, 0.28, 0.4, textW(it.text, fs, st.tracking) + fs * 0.3), fs * 1.14 + fs * 0.34];
    },
  },
  counter: {
    dur: 2.8,
    slots: ['beside-right', 'beside-left', 'lower-band', 'top-banner'],
    size: (it, u, st, F) => {
      const num = Number(String(it.value ?? 0).replace(/[^\d.]/g, '') || 0).toLocaleString('en-US');
      const maxW = F.W * (F.tall ? 0.76 : 0.38);
      const fs = fsFor(num + 'MM', F, maxW, 0.14, 0.21, st.tracking);
      return [box(F, 0.3, 0.4, textW(num, fs, st.tracking) + fs * 0.9), fs * 1.06 + fs * 0.42];
    },
  },
  steps: {
    dur: 2.2,
    slots: ['beside-left', 'beside-right', 'lower-band', 'top-banner'],
    size: (it, u, st, F) => {
      const U = F.tall ? F.W * 0.95 : F.H;
      const fs = U * 0.2, ts = U * 0.045;
      return [box(F, 0.28, 0.4, Math.max(textW('03', fs, -0.04), textW(it.text || '', ts, st.tracking)) + ts), fs * 1.0 + (it.text ? ts * 1.6 : 0) + ts * 1.4];
    },
  },
  card: {
    dur: 3.4,
    slots: ['beside-left', 'beside-right', 'lower-band', 'top-banner'],
    size: (it, u, st, F) => {
      const w = F.W * (F.tall ? 0.7 : 0.38);
      return [w, it.zoom || it.image ? w * 0.6 : w * 0.24];
    },
  },
  chapter: {
    dur: 2.6,
    slots: ['top-left', 'top-right', 'top-banner', 'lower-band'],
    size: (it, u, st, F) => {
      const U = F.tall ? F.W * 0.95 : F.H;
      const fs = Math.min(U * 0.075, (F.W * (F.tall ? 0.78 : 0.38)) / (textW(it.text || 'X', 1, st.tracking) || 1));
      return [box(F, 0.3, 0.4, textW(it.text || '', fs, st.tracking) + fs * 1.2), fs * 2.6];
    },
  },
  endcard: {dur: 3.0, post: true, slots: [], size: () => [0, 0]},
};

export const TEXT_FIELDS = ['text', 'sub', 'label', 'unit'];
export const wordCount = (s) => String(s ?? '').trim().split(/\s+/).filter(Boolean).length;

/**
 * @param {{meta:{width:number,height:number,fps:number,duration:number}, face:any, words:{source?:string,tier?:string,words:any[]}, plan:{items:any[], body?:any}, info?:any, style:any, aspect?:'16x9'|'9x16', outWidth?:number}} input
 */
export function layoutPlan(input) {
  const {meta, face, words, plan, style} = input;
  const body = bodyOpt(plan, input.info);
  const aspect = input.aspect || '16x9';
  const fps = meta.fps || 30;
  const mainFrames = Math.max(1, Math.round(meta.duration * fps));
  const srcW = meta.width, srcH = meta.height;
  const fsx = face?.width ? srcW / face.width : 1, fsy = face?.height ? srcH / face.height : 1; // face.json may be measured on a smaller sheet

  let W, H, s, camera = null;
  if (aspect === '9x16') {
    W = 1080; H = 1920;
    s = H / srcH;
    const cx = [];
    for (let f = 0; f < mainFrames; f++) {
      const b = face ? faceAt(face, f / fps) : null;
      cx.push(b ? (b[0] + b[2] / 2) * fsx * s : (srcW * s) / 2);
    }
    const follow = followTrack(cx, {deadband: 70, ease: 0.05, maxStep: 5});
    const maxOff = Math.max(0, srcW * s - W);
    camera = follow.map((c) => +Math.max(0, Math.min(maxOff, c - W / 2)).toFixed(2));
  } else {
    W = input.outWidth || srcW; H = Math.round((W / srcW) * srcH);
    s = W / srcW;
  }
  const u = Math.min(W, H) / 1080;
  const m = Math.round(0.05 * Math.min(W, H)) + 8 * u; // title-safe edge
  const margin = FACE_MARGIN * u;

  // face box (output px) + confidence at a main frame
  const faceOut = (f) => {
    if (!face) return null;
    const b = faceAt(face, f / fps);
    if (!b) return null;
    const ox = camera ? camera[Math.min(camera.length - 1, Math.max(0, f))] : 0;
    return [b[0] * fsx * s - ox, b[1] * fsy * s, b[2] * fsx * s, b[3] * fsy * s];
  };
  const lowConf = (f0, f1) => {
    if (!face?.samples?.some((x) => typeof x.conf === 'number')) return false;
    const t0 = f0 / fps, t1 = f1 / fps;
    return face.samples.some((x) => x.t >= t0 - 0.5 && x.t <= t1 + 0.5 && typeof x.conf === 'number' && x.conf < 0.5);
  };

  const zones = aspect === '9x16' ? platformZones(W, H) : [];
  // usable band: in 9:16, between the app top bar and the caption area (facecammaxxing zones)
  const area = aspect === '9x16' ? {top: zones[0].r[3] + 12 * u, bottom: zones[2].r[1] - 14 * u, low: 0} : {top: m, bottom: H - m, low: 0.03 * H};
  const wordList = toWords(words);

  // plan.protect: screen areas to keep clear (what you are showing), [{box:[x,y,w,h] 0..1 of the source, from?, to?}]
  const protect = (plan.protect || []).map((p) => ({from: p.from ?? 0, to: p.to ?? 1e9, box: p.box}));
  const protAt = (f0, f1) =>
    protect.filter((p) => p.from * fps < f1 && p.to * fps > f0).map((p) => {
      const ox = camera ? camera[Math.min(camera.length - 1, f0)] : 0;
      return [p.box[0] * srcW * s - ox, p.box[1] * srcH * s, p.box[2] * srcW * s, p.box[3] * srcH * s];
    });
  const notes = [];
  const items = [];
  const placed = []; // {f0,f1,r}
  const tier = words?.tier || 'C';

  // 1. time every item
  const raw = (plan.items || []).map((it, idx) => {
    const k = KINDS[it.kind];
    const id = it.id || `${it.kind}-${idx + 1}`;
    if (!k) return {id, kind: it.kind, error: `unknown kind "${it.kind}" (use: ${Object.keys(KINDS).join(', ')})`};
    if (k.post) return {...it, id, post: true, dur: it.dur || k.dur};
    let t, itTier = tier, word = null;
    try {
      const r = resolveAt(it.at, wordList);
      t = r.t; word = r.word;
      if (r.manual) itTier = 'C';
    } catch (e) {
      return {id, kind: it.kind, error: 'plan: ' + e.message};
    }
    const delay = itTier === 'C' ? 0 : WORD_DELAY;
    const f0 = Math.max(0, Math.round((t + delay) * fps));
    return {...it, id, word: word?.w, wordT: t, tier: itTier, f0, dur: it.dur || k.dur};
  });

  // steps in one series end when the next one starts
  const seriesOf = (it) => (it.kind === 'steps' ? it.series || 'steps' : it.series);
  for (const it of raw) {
    if (it.error || it.post) continue;
    let f1 = it.f0 + Math.round(it.dur * fps);
    if (it.kind === 'steps') {
      const next = raw.filter((x) => x.kind === 'steps' && seriesOf(x) === seriesOf(it) && x.f0 > it.f0).sort((a, b) => a.f0 - b.f0)[0];
      if (next) f1 = Math.min(f1, next.f0);
    }
    it.f1 = Math.min(mainFrames, f1);
  }

  // 2. place every item (time order). One series shares one position.
  const seriesSlot = {};
  const order = raw.filter((x) => !x.error && !x.post).sort((a, b) => a.f0 - b.f0);
  for (const it of order) {
    const k = KINDS[it.kind];
    const tall = aspect === '9x16';
    let [w, h] = k.size(it, u, style, {W, H, tall});
    // if the full size has no free place, the same graphic may come smaller, never under the "too small" line
    const minW = W * (tall ? (it.kind === 'steps' ? 0.42 : 0.5) : 0.22);
    const scales = [1, 0.88, 0.77, 0.68, 0.6].filter((sc, i) => i === 0 || w * sc >= minW);
    const out = {id: it.id, kind: it.kind, f0: it.f0, f1: it.f1, tier: it.tier, word: it.word, wordT: it.wordT, delayMs: it.tier === 'C' ? 0 : Math.round(WORD_DELAY * 1000), item: it, segments: [], w, h};
    if (lowConf(it.f0, it.f1)) {
      out.hidden = true;
      out.reason = 'face detection unsure here, graphic hidden';
      notes.push(`${it.id}: hidden ${fmt(it.f0 / fps)}-${fmt(it.f1 / fps)} s (face detection unsure)`);
      items.push(out);
      continue;
    }
    if (it.pos) {
      // forced position (normalised top-left). The layout does not protect it; check will judge it.
      out.forced = true;
      out.segments.push({f0: it.f0, f1: it.f1, slot: 'forced', r: [it.pos[0] * W, it.pos[1] * H, w, h]});
      items.push(out);
      placed.push({f0: it.f0, f1: it.f1, r: out.segments[0].r});
      continue;
    }
    // split the life of the graphic only where the face moves a lot
    const ser = seriesOf(it);
    const segs = splitByFace(it.f0, it.f1, faceOut, margin).map((sg) => {
      if (!sg.keep) return sg;
      // the face itself (keep minus margin), the body under it, and a side gap of at least 0.3 face widths
      const F = inflate(sg.keep, -margin);
      const extra = Math.max(0, FACE_GAP * F[2] - margin);
      return {...sg, face: F, keep: [sg.keep[0] - extra, sg.keep[1], sg.keep[2] + 2 * extra, sg.keep[3]], body: bodyBox(F, W, H, body, aspect === '9x16')};
    });
    const want = it.slot ? [it.slot, ...k.slots.filter((x) => x !== it.slot)] : ser && seriesSlot[ser] ? [seriesSlot[ser], ...k.slots] : k.slots;
    let lastSlot = null;
    for (const sg of segs) {
      // the newest word wins: a graphic that has been up for 1 s or more gives way and ends where this one starts
      const giveWay = placed.filter((p) => p.f1 > sg.f0 && sg.f0 - p.f0 >= fps);
      const busy = placed.filter((p) => p.f0 < sg.f1 && p.f1 > sg.f0 && !giveWay.includes(p)).map((p) => p.r);
      let order = want;
      if (sg.keep && !it.slot) {
        // the bigger empty side first
        const leftFree = sg.keep[0], rightFree = W - (sg.keep[0] + sg.keep[2]);
        const first = leftFree > rightFree ? 'beside-left' : 'beside-right', second = first === 'beside-left' ? 'beside-right' : 'beside-left';
        order = want.map((x) => (x === 'beside-right' ? first : x === 'beside-left' ? second : x));
        if (want.indexOf('beside-left') < want.indexOf('beside-right') && want.includes('beside-left')) order = want.map((x) => (x === 'beside-left' ? first : x === 'beside-right' ? second : x));
      }
      const tries = lastSlot ? [lastSlot, ...order.filter((x) => x !== lastSlot)] : order;
      let got = null;
      // a slot you asked for is tried at every allowed size before any other slot
      const plan2 = [];
      const scs = it.kind === 'card' ? [1] : scales;
      if (it.slot) for (const sc of scs) plan2.push([sc, [it.slot]]);
      for (const sc of scs) plan2.push([sc, it.slot ? tries.filter((x) => x !== it.slot) : tries]);
      for (const [sc, slotList] of plan2) {
      for (const slot of slotList) {
        for (const r of slotRects(slot, sg.keep, w * sc, h * sc, W, H, m, u, area)) {
        const why = (x) => { if (globalThis.VM_DEBUG) (out.tried ||= []).push(slot + ' ' + r.map(Math.round).join(',') + ' ' + x); };
        if (!inside(r, W, H, m * 0.5)) { why('outside'); continue; }
        if (sg.keep && overlapArea(r, sg.keep) > 0) { why('face'); continue; }
        if (sg.body && overlapArea(r, sg.body) > 0) { why('body'); continue; }
        if (zones.some((z) => overlapArea(r, z.r) > 0)) { why('zone'); continue; }
        if (protAt(sg.f0, sg.f1).some((b) => overlapArea(r, b) > 0)) { why('protect'); continue; }
        if (busy.some((b) => overlapArea(r, inflate(b, 12 * u)) > 0)) { why('busy'); continue; }
        const tgtIn = it.kind === 'card' && it.target && (() => { const t = mapPoint(it.target, sg.f0, srcW, srcH, s, camera); return t[0] >= 0 && t[0] <= W && t[1] >= 0 && t[1] <= H; })();
        if (tgtIn) {
          // the card must not hide the thing it points at
          const tgt = mapPoint(it.target, sg.f0, srcW, srcH, s, camera);
          const half = it.ring ? [it.ring[0] * srcW * s * 0.5 + 30 * u, it.ring[1] * srcH * s * 0.5 + 30 * u] : [40 * u, 40 * u];
          if (overlapArea(r, [tgt[0] - half[0], tgt[1] - half[1], half[0] * 2, half[1] * 2]) > 0) continue;
        }
        if (tgtIn && sg.keep) {
          // the arrow must not cross the face either
          const tgt = mapPoint(it.target, sg.f0, srcW, srcH, s, camera);
          if (segHitsRect(arrowFrom(r, tgt), tgt, sg.keep)) continue;
        }
        got = {slot, r, sc};
        break;
        }
        if (got) break;
      }
      if (got) break;
      }
      if (!got) {
        out.hidden = true;
        out.reason = `no free place next to the face for ${w.toFixed(0)}x${h.toFixed(0)} px`;
        notes.push(`${it.id}: no room at ${fmt(sg.f0 / fps)} s, hidden. Shorten the text or pick another moment.`);
        break;
      }
      for (const p of giveWay) if (overlapArea(got.r, inflate(p.r, 12 * u)) > 0) { p.f1 = sg.f0; if (p.seg) p.seg.f1 = sg.f0; if (p.out) p.out.f1 = Math.min(p.out.f1, sg.f0); }
      lastSlot = got.slot;
      if (got.sc !== 1) { out.w = w * got.sc; out.h = h * got.sc; }
      out.segments.push({f0: sg.f0, f1: sg.f1, slot: got.slot, r: got.r.map((v) => Math.round(v))});
    }
    if (ser && out.segments[0]) seriesSlot[ser] = out.segments[0].slot;
    for (const sg of out.segments) placed.push({f0: sg.f0, f1: sg.f1, r: sg.r, seg: sg, out});
    items.push(out);
  }

  const errors = raw.filter((x) => x.error).map((x) => ({id: x.id, kind: x.kind, msg: x.error}));
  const post = raw.filter((x) => x.post);
  const postFrames = post.length ? Math.round(post[0].dur * fps) : 0;
  return {body, protect: protect.map((p) => ({...p, r: protAt(Math.round(p.from * fps), Math.round(p.from * fps) + 1)[0]})), W, H, u, fps, aspect, mainFrames, postFrames, total: mainFrames + (postFrames ? postFrames - END_FADE : 0), camera, zones, margin, items, post: post[0] || null, errors, notes, tier, scale: s};

  // helpers that need closure values
  function mapPoint(p, f, sw, sh, sc, cam) {
    const ox = cam ? cam[Math.min(cam.length - 1, f)] : 0;
    return [p[0] * sw * sc - ox, p[1] * sh * sc];
  }
}

// Cut [f0,f1) into pieces where the (face box + margin) stays compact. Each piece = one fixed position.
function splitByFace(f0, f1, faceOut, margin) {
  const segs = [];
  let a = f0, keep = null, base = null;
  for (let f = f0; f < f1; f++) {
    const b = faceOut(f);
    if (!b) continue;
    const k = inflate(b, margin);
    if (!base) base = k;
    const next = union(keep, k);
    const moved = next[2] > base[2] * 1.45 || next[3] > base[3] * 1.35;
    if (moved && f - a >= 24 && f1 - f >= 24) {
      segs.push({f0: a, f1: f, keep});
      a = f; keep = k; base = k;
    } else keep = next;
  }
  segs.push({f0: a, f1, keep});
  return segs;
}

// bands try three spots (away from the face, centre, near side) before giving up
function slotRects(slot, K, w, h, W, H, m, u, area) {
  const r = slotRect(slot, K, w, h, W, H, m, u, area);
  if (!r) return [];
  const gap = 40 * u;
  const clampY = (y) => Math.max(area.top, Math.min(area.bottom - h, y));
  const clampX = (x) => Math.max(m, Math.min(W - m - w, x));
  const uniq = (list) => {
    const seen = new Set();
    return list.filter((q) => { const key = q.map((v) => Math.round(v)).join(','); if (seen.has(key)) return false; seen.add(key); return true; });
  };
  if (slot === 'beside-left' || slot === 'beside-right') {
    // next to the face first, then slide along the free side (up/down, out to the edge)
    if (!K) return [r];
    const xs = [r[0], slot === 'beside-left' ? m : W - m - w];
    const ys = [r[1], clampY(K[1]), clampY(K[1] + K[3] - h), clampY(area.bottom - h - area.low), clampY(area.top)];
    const out = [];
    for (const y of ys) for (const x of xs) out.push([x, y, w, h]);
    return uniq(out);
  }
  if (slot !== 'lower-band' && slot !== 'top-banner') return [r];
  const xs = [r[0], (W - w) / 2, K && K[0] + K[2] / 2 > W / 2 ? W - m - w : m].map(clampX);
  const ys = [r[1]];
  if (slot === 'lower-band' && K) {
    // the chest band right under the face (used a lot in 9:16), then halfway down
    const chest = K[1] + K[3] + gap * 0.5;
    if (chest + h <= area.bottom) ys.push(chest, (chest + r[1]) / 2);
  }
  const out = [];
  for (const y of ys) for (const x of xs) out.push([x, y, w, h]);
  return uniq(out);
}

function slotRect(slot, K, w, h, W, H, m, u, area) {
  const gap = 40 * u;
  const cy = K ? K[1] + K[3] * 0.5 : H / 2;
  const clampY = (y) => Math.max(area.top, Math.min(area.bottom - h, y));
  const clampX = (x) => Math.max(m, Math.min(W - m - w, x));
  const fcx = K ? K[0] + K[2] / 2 : W / 2;
  switch (slot) {
    case 'beside-right': return K ? [K[0] + K[2] + gap, clampY(cy - h / 2), w, h] : [W - m - w, clampY(H / 2 - h / 2), w, h];
    case 'beside-left': return K ? [K[0] - gap - w, clampY(cy - h / 2), w, h] : [m, clampY(H / 2 - h / 2), w, h];
    case 'lower-left': return [m, area.bottom - h - area.low, w, h];
    case 'lower-right': return [W - m - w, area.bottom - h - area.low, w, h];
    case 'lower-band': {
      const y = area.bottom - h - area.low;
      const x = K ? (fcx > W / 2 ? m : W - m - w) : (W - w) / 2;
      return [clampX(x), y, w, h];
    }
    case 'top-left': return [m, area.top, w, h];
    case 'top-right': return [W - m - w, area.top, w, h];
    case 'top-banner': return [clampX((W - w) / 2), area.top, w, h];
    default: return null;
  }
}

const inside = (r, W, H, e) => r[0] >= e && r[1] >= e && r[0] + r[2] <= W - e && r[1] + r[3] <= H - e;

// the arrow leaves the card from the edge facing the target
export function arrowFrom(r, t) {
  const cx = r[0] + r[2] / 2, cy = r[1] + r[3] / 2;
  const dx = t[0] - cx, dy = t[1] - cy;
  if (Math.abs(dx) / r[2] > Math.abs(dy) / r[3]) return [dx > 0 ? r[0] + r[2] : r[0], cy];
  return [cx, dy > 0 ? r[1] + r[3] : r[1]];
}

export function segHitsRect(a, b, r) {
  for (let i = 0; i <= 40; i++) {
    const x = a[0] + ((b[0] - a[0]) * i) / 40, y = a[1] + ((b[1] - a[1]) * i) / 40;
    if (x > r[0] && x < r[0] + r[2] && y > r[1] && y < r[1] + r[3]) return true;
  }
  return false;
}

// Position of an item at frame f (main timeline). Fixed inside a segment, one eased move between segments.
export function rectAt(item, f) {
  const sg = item.segments;
  if (!sg.length) return null;
  for (let i = 0; i < sg.length; i++) {
    const s = sg[i];
    if (f < s.f0 || f >= s.f1) continue;
    if (i > 0 && f < s.f0 + MOVE_FRAMES) {
      const p = sg[i - 1].r, q = s.r;
      const x = (f - s.f0) / MOVE_FRAMES;
      const e = x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
      return p.map((v, k) => v + (q[k] - v) * e);
    }
    return s.r;
  }
  return null;
}

export const fmt = (t) => (Math.round(t * 10) / 10).toFixed(1);
