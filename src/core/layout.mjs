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
import {makeBody, handTrack} from './body.mjs';
import {metaFor, kindOf, DEFAULT_SIZE} from './catalog.mjs';

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

const ADV = (ch) => (/[가-힣ㄱ-ㅎ一-鿿ぁ-ヿ]/.test(ch) ? 0.92 : /[A-Z]/.test(ch) ? 0.66 : /[a-z]/.test(ch) ? 0.53 : /[0-9]/.test(ch) ? 0.6 : ch === ' ' ? 0.27 : 0.34);
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
      // "text": "Visual\nVibe Coding" stacks the words; the size comes from the longest line
      const lines = String(it.text ?? '').split('\n');
      const longest = lines.reduce((p, c) => (textW(c, 1, st.tracking) > textW(p, 1, st.tracking) ? c : p), '');
      const fs = fsFor(longest, F, maxW, lines.length > 1 ? 0.1 : 0.14, 0.2, st.tracking);
      return [box(F, 0.28, 0.4, textW(longest, fs, st.tracking) + fs * 0.3), fs * 1.14 * lines.length + fs * 0.34];
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
 * @param {{meta:{width:number,height:number,fps:number,duration:number}, face:any, body?:any, words:{source?:string,tier?:string,captions?:any[]}, plan:{items:any[], body?:any, protect?:any[]}, info?:any, style:any, aspect?:'16x9'|'9x16', outWidth?:number, metas?:any}} input
 */
export function layoutPlan(input) {
  const {meta, face, words, plan, style} = input;
  const body = bodyOpt(plan, input.info);
  const B = body ? makeBody(input.body) : null; // the measured person (joints, hands, person grid); null = estimate from the face
  const aspect = input.aspect || '16x9';
  const tall = aspect === '9x16';
  const fps = meta.fps || 30;
  const mainFrames = Math.max(1, Math.round(meta.duration * fps));
  const srcW = meta.width, srcH = meta.height;
  const fsx = face?.width ? srcW / face.width : 1, fsy = face?.height ? srcH / face.height : 1; // face.json may be measured on a smaller sheet
  const bx = B ? srcW / B.W : 1, by = B ? srcH / B.H : 1; // body.json px -> source px

  let W, H, s, camera = null;
  if (tall) {
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
  const camAt = (f) => (camera ? camera[Math.min(camera.length - 1, Math.max(0, f))] : 0);

  // face box (output px) at a main frame
  const faceOut = (f) => {
    if (!face) return null;
    const b = faceAt(face, f / fps);
    if (!b) return null;
    const ox = camAt(f);
    return [b[0] * fsx * s - ox, b[1] * fsy * s, b[2] * fsx * s, b[3] * fsy * s];
  };
  const lowConf = (f0, f1) => {
    if (!face?.samples?.some((x) => typeof x.conf === 'number')) return false;
    const t0 = f0 / fps, t1 = f1 / fps;
    return face.samples.some((x) => x.t >= t0 - 0.5 && x.t <= t1 + 0.5 && typeof x.conf === 'number' && x.conf < 0.5);
  };
  // output rect -> body.json px rect at frame f
  const toBody = (r, f, pad = 0) => {
    const ox = camAt(f);
    return [((r[0] - pad + ox) / s) / bx, ((r[1] - pad) / s) / by, ((r[2] + 2 * pad) / s) / bx, ((r[3] + 2 * pad) / s) / by];
  };
  // first frame in [f0,f1) where the rect (grown by pad) touches the measured person, or -1
  const personHit = (r, f0, f1, pad = margin) => {
    if (!B?.anyKnown) return -1;
    for (let f = f0; f < f1; f += 2) if (B.hitAt(toBody(r, f, pad), f / fps) > 0) return f;
    if (f1 - 1 > f0 && B.hitAt(toBody(r, f1 - 1, pad), (f1 - 1) / fps) > 0) return f1 - 1;
    return -1;
  };
  const personIn = (f0, f1) => !!(B?.anyKnown && B.bboxOver(f0 / fps, f1 / fps));
  const bodyPt = (p, f) => [p[0] * bx * s - camAt(f), p[1] * by * s]; // body px point -> output px

  const zones = tall ? platformZones(W, H) : [];
  // usable band: in 9:16, between the app top bar and the caption area (facecammaxxing zones)
  const area = tall ? {top: zones[0].r[3] + 12 * u, bottom: zones[2].r[1] - 14 * u, low: 0} : {top: m, bottom: H - m, low: 0.03 * H};
  const wordList = toWords(words);

  // plan.protect: screen areas to keep clear that are NOT the person (a microphone arm, the thing you show).
  // The person (face, body, hands) is found by the body adapter; no need to mark hands any more.
  const protect = (plan.protect || []).map((p) => ({from: p.from ?? 0, to: p.to ?? 1e9, box: p.box}));
  const protAt = (f0, f1) =>
    protect.filter((p) => p.from * fps < f1 && p.to * fps > f0).flatMap((p) => {
      // in 9:16 the crop moves: take the box at the start and at the end of the window
      const at = (f) => [p.box[0] * srcW * s - camAt(f), p.box[1] * srcH * s, p.box[2] * srcW * s, p.box[3] * srcH * s];
      return camera ? [at(f0), at(Math.max(f0, f1 - 1))] : [at(f0)];
    });
  const notes = [];
  const items = [];
  const placed = []; // {f0,f1,r}
  const tier = words?.tier || 'C';
  const metas = input.metas;

  // 1. time every item
  const raw = (plan.items || []).map((it, idx) => {
    const kind = kindOf(it.kind);
    const mt = metaFor({...it, kind}, metas || undefined);
    const id = it.id || `${String(it.kind).replace(/\//g, '-')}-${idx + 1}`;
    if (!mt) return {id, kind: it.kind, error: `unknown kind "${it.kind}" (see \`connect-ai-video-motion catalog\`, or use kind "custom" with "component")`};
    if (mt.status && mt.status !== 'ok') return {id, kind, error: `"${kind}" is in the catalog but not usable yet (${mt.status}${mt.why ? ': ' + mt.why : ''})`};
    const k = mt.legacy ? KINDS[mt.legacy] : null;
    const dur = it.dur || k?.dur || mt.dur || 2.6;
    if (mt.place === 'post' || k?.post) return {...it, kind, meta: mt, id, post: true, dur};
    let t, itTier = tier, word = null;
    try {
      const r = resolveAt(it.at, wordList);
      t = r.t; word = r.word;
      if (r.manual) itTier = 'C';
    } catch (e) {
      return {id, kind, error: 'plan: ' + e.message};
    }
    const delay = itTier === 'C' ? 0 : WORD_DELAY;
    const f0 = Math.max(0, Math.round((t + delay) * fps));
    return {...it, kind, meta: mt, id, word: word?.w, wordT: t, tier: itTier, f0, dur};
  });

  // steps in one series end when the next one starts
  const seriesOf = (it) => (it.kind === 'kit/steps' ? it.series || 'steps' : it.series);
  for (const it of raw) {
    if (it.error || it.post) continue;
    let f1 = it.f0 + Math.round(it.dur * fps);
    const ser = seriesOf(it);
    if (ser && it.kind === 'kit/steps') {
      const next = raw.filter((x) => !x.error && !x.post && x.kind === it.kind && seriesOf(x) === ser && x.f0 > it.f0).sort((a, b) => a.f0 - b.f0)[0];
      if (next) f1 = Math.min(f1, next.f0);
    }
    it.f1 = Math.min(mainFrames, f1);
  }

  // generic size for catalog items: width from the frame, height from the aspect
  const sizeOf = (it, mt) => {
    const k = mt.legacy ? KINDS[mt.legacy] : null;
    if (k) return k.size(it, u, style, {W, H, tall});
    const z = {...DEFAULT_SIZE, ...(mt.size || {})};
    // size.fitText: the box takes the shape of the word itself, so a short word ("FREE") can be set tall
    const aspect = z.fitText && it.text ? Math.max(z.minAspect ?? 1.6, Math.min(z.aspect, String(it.text).length * 0.66)) : z.aspect;
    let w = W * (tall ? z.tallMaxW ?? 0.78 : z.maxW);
    let h = w / aspect;
    const hMax = (tall ? 0.34 : 0.46) * H;
    if (h > hMax) { h = hMax; w = h * aspect; }
    return [w, h];
  };
  const minWOf = (it, mt) => {
    if (mt.legacy) return W * (tall ? (mt.legacy === 'steps' ? 0.42 : 0.5) : 0.22);
    const z = {...DEFAULT_SIZE, ...(mt.size || {})};
    return W * (tall ? z.tallMinW ?? 0.5 : z.minW ?? z.maxW * 0.6);
  };
  const DEFAULT_SLOTS = {box: ['beside-right', 'beside-left', 'lower-band', 'top-banner'], edge: ['top-banner', 'lower-band', 'top-left', 'top-right', 'lower-left', 'lower-right']};

  // 2. place every item (time order). One series shares one position.
  const seriesSlot = {};
  const order = raw.filter((x) => !x.error && !x.post).sort((a, b) => a.f0 - b.f0);
  for (const it of order) {
    const mt = it.meta;
    // plan line "behind": true puts a box graphic in a wide band behind you (needs the person matte);
    // "head" lifts the band to head height, so only the head covers a few letters
    const place = it.behind && (mt.place || 'box') === 'box' ? 'behind' : mt.place || 'box';
    const k = mt.legacy ? KINDS[mt.legacy] : {slots: mt.slots || DEFAULT_SLOTS[place] || DEFAULT_SLOTS.box};
    let [w, h] = sizeOf(it, mt);
    // plan line "scale": 1.2 = this graphic 20 % bigger than its catalog size (0.5-3; 3 is for a part of the video with
    // nobody in it, or a big empty panel). The person is still avoided: if the bigger box has no room it steps down
    // like any other graphic.
    const big = Math.max(0.5, Math.min(3, Number(it.scale) || 1));
    w *= big; h *= big;
    const minW = Math.min(minWOf(it, mt), w);
    const scales = [1, 0.88, 0.77, 0.68, 0.6, 0.52, 0.45, 0.39, 0.34].filter((sc, i) => i === 0 || w * sc >= minW);
    const out = {id: it.id, kind: it.kind, place, attach: mt.attach || null, family: mt.family || it.kind, f0: it.f0, f1: it.f1, tier: it.tier, word: it.word, wordT: it.wordT, delayMs: it.tier === 'C' ? 0 : Math.round(WORD_DELAY * 1000), item: it, segments: [], w, h};
    if (lowConf(it.f0, it.f1) || (B && B.unsureAt(it.f0 / fps, it.f1 / fps))) {
      out.hidden = true;
      out.reason = 'face or body detection unsure here, graphic hidden';
      notes.push(`${it.id}: hidden ${fmt(it.f0 / fps)}-${fmt(it.f1 / fps)} s (face or body detection unsure)`);
      items.push(out);
      continue;
    }
    if (place === 'full' && (face || personIn(it.f0, it.f1))) {
      out.hidden = true;
      out.reason = 'full-frame graphic on a video with a person';
      out.blocked = true;
      notes.push(`${it.id}: "${it.kind}" fills the whole frame, which would cover the person. Use it on a part without a person, or pick a box graphic.`);
      items.push(out);
      continue;
    }
    if (place === 'behind') {
      placeBehind(out, it, w, h, mt);
      if (it.behind && !out.hidden) straddle(out, it);
      items.push(out);
      continue;
    }
    if (place === 'attach' && mt.attach !== 'point') {
      placeAttach(out, it, mt, w, h, scales);
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
    const ser = seriesOf(it);
    const want = it.slot ? [it.slot, ...k.slots.filter((x) => x !== it.slot)] : ser && seriesSlot[ser] ? [seriesSlot[ser], ...k.slots] : k.slots;
    // split the life of the graphic only where the face moves a lot; then, if the person (hands, arms) leaves no
    // fixed place for the whole piece, cut the piece in halves (at least 1.2 s each) that fade from one place to the next
    let segs = splitByFace(it.f0, it.f1, faceOut, margin).map((sg) => decorate(sg));
    const done = [];
    let lastSlot = null, failed = false;
    while (segs.length) {
      const sg = segs.shift();
      const got = tryPlace(it, mt, sg, w, h, scales, want, lastSlot);
      if (got) {
        commitGiveWay(got.r, sg.f0);
        lastSlot = got.slot;
        if (got.sc !== 1) { out.w = w * got.sc; out.h = h * got.sc; }
        done.push({f0: sg.f0, f1: sg.f1, slot: got.slot, r: got.r.map((v) => Math.round(v)), cut: !!sg.cut});
        continue;
      }
      if (sg.f1 - sg.f0 >= Math.round(2.4 * fps) && B?.anyKnown) {
        const mid = Math.round((sg.f0 + sg.f1) / 2);
        segs.unshift(decorate({f0: mid, f1: sg.f1, keep: sg.rawKeep, cut: true}));
        segs.unshift(decorate({f0: sg.f0, f1: mid, keep: sg.rawKeep, cut: true}));
        continue;
      }
      failed = true;
      break;
    }
    if (failed || !done.length) {
      out.hidden = true;
      out.reason = `no free place next to the person for ${w.toFixed(0)}x${h.toFixed(0)} px`;
      notes.push(`${it.id}: no room at ${fmt(it.f0 / fps)} s, hidden. Shorten the text, pick another moment, or a smaller graphic.`);
      items.push(out);
      continue;
    }
    // neighbouring pieces in the same place become one
    for (const d of done) {
      const prev = out.segments[out.segments.length - 1];
      if (prev && prev.r.join() === d.r.join() && prev.f1 === d.f0) prev.f1 = d.f1;
      else out.segments.push(d);
    }
    if (mt.attach === 'point') addPointer(out, it);
    if (it.side && out.segments.length === 1) placeSide(out, it);
    if (ser && out.segments[0]) seriesSlot[ser] = out.segments[0].slot;
    for (const sg of out.segments) placed.push({f0: sg.f0, f1: sg.f1, r: sg.r, seg: sg, out});
    items.push(out);
  }

  const errors = raw.filter((x) => x.error).map((x) => ({id: x.id, kind: x.kind, msg: x.error}));
  const post = raw.filter((x) => x.post);
  const postFrames = post.length ? Math.round(post[0].dur * fps) : 0;
  const needsMatte = items.some((x) => x.place === 'behind' && !x.hidden);
  return {
    body, bodySource: B ? B.source : null, hasPerson: !!B?.anyKnown, needsMatte, matte: B?.matte || null,
    protect: protect.map((p) => ({...p, r: protAt(Math.round(p.from * fps), Math.round(p.from * fps) + 1)[0]})),
    W, H, u, fps, aspect, mainFrames, postFrames, total: mainFrames + (postFrames ? postFrames - END_FADE : 0), camera, zones, margin, items, post: post[0] || null, errors, notes, tier, scale: s, bodyScale: [bx, by],
  };

  // ---- helpers that need the closure ----
  function decorate(sg) {
    const rawKeep = sg.rawKeep || sg.keep;
    if (!rawKeep) return {...sg, rawKeep};
    // the face itself (keep minus margin), the body under it, and a side gap of at least 0.3 face widths
    const F = inflate(rawKeep, -margin);
    const extra = Math.max(0, FACE_GAP * F[2] - margin);
    // with a measured person the estimated body box is not needed (the person grid is exact, hands included)
    const est = B?.anyKnown && personIn(sg.f0, sg.f1) ? null : bodyBox(F, W, H, body, tall);
    return {...sg, rawKeep, face: F, keep: [rawKeep[0] - extra, rawKeep[1], rawKeep[2] + 2 * extra, rawKeep[3]], body: est};
  }

  function blockedBy(r, sg, it, busy) {
    if (!inside(r, W, H, m * 0.5)) return 'outside';
    if (sg.keep && overlapArea(r, sg.keep) > 0) return 'face';
    if (sg.body && overlapArea(r, sg.body) > 0) return 'body';
    if (zones.some((z) => overlapArea(r, z.r) > 0)) return 'zone';
    if (protAt(sg.f0, sg.f1).some((b) => overlapArea(r, b) > 0)) return 'protect';
    if (busy.some((b) => overlapArea(r, inflate(b, 12 * u)) > 0)) return 'busy';
    if (personHit(r, sg.f0, sg.f1) >= 0) return 'person';
    if (it.kind === 'kit/card' && it.target) {
      const tgt = mapPoint(it.target, sg.f0);
      if (tgt[0] >= 0 && tgt[0] <= W && tgt[1] >= 0 && tgt[1] <= H) {
        // the card must not hide the thing it points at, and its arrow must not cross the face
        const half = it.ring ? [it.ring[0] * srcW * s * 0.5 + 30 * u, it.ring[1] * srcH * s * 0.5 + 30 * u] : [40 * u, 40 * u];
        if (overlapArea(r, [tgt[0] - half[0], tgt[1] - half[1], half[0] * 2, half[1] * 2]) > 0) return 'target';
        if (sg.keep && segHitsRect(arrowFrom(r, tgt), tgt, sg.keep)) return 'arrow';
      }
    }
    return null;
  }

  function tryPlace(it, mt, sg, w, h, scales, want, lastSlot) {
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
    // a slot you asked for is tried at every allowed size before any other slot; named slots before the free search
    const steps = [];
    const scs = it.kind === 'kit/card' ? [1] : scales;
    if (it.slot) for (const sc of scs) steps.push([sc, [it.slot]]);
    for (const sc of scs) steps.push([sc, it.slot ? tries.filter((x) => x !== it.slot) : tries]);
    for (const [sc, slotList] of steps) {
      for (const slot of slotList) {
        for (const r of slotRects(slot, sg.keep, w * sc, h * sc, W, H, m, u, area)) {
          const why = blockedBy(r, sg, it, busy);
          if (globalThis.VM_DEBUG) (it.__tried ||= []).push(slot + ' ' + r.map(Math.round).join(',') + ' ' + why);
          if (!why) return {slot, r, sc};
        }
      }
    }
    // free search: scan the frame for the best empty rectangle (near the face height, beside the person)
    if (it.slot === undefined || it.slot === 'free') {
      for (const sc of scs) {
        const ww = w * sc, hh = h * sc;
        const stepX = Math.max(8, W * 0.025), stepY = Math.max(8, H * 0.025);
        let best = null;
        const fc = sg.keep ? [sg.keep[0] + sg.keep[2] / 2, sg.keep[1] + sg.keep[3] / 2] : [W / 2, H * 0.4];
        for (let y = area.top; y + hh <= area.bottom; y += stepY) {
          for (let x = m; x + ww <= W - m; x += stepX) {
            const r = [x, y, ww, hh];
            const cy = y + hh / 2, cx = x + ww / 2;
            // cheap score first, check only promising spots
            const score = Math.abs(cy - fc[1]) / H + 0.35 * Math.abs(Math.abs(cx - fc[0]) / W - 0.3) + (tall ? 0 : 0.1 * Math.abs(cx / W - 0.5));
            if (best && score >= best.score) continue;
            if (blockedBy(r, sg, it, busy)) continue;
            best = {score, r};
          }
        }
        if (best) return {slot: 'free', r: best.r, sc};
      }
    }
    return null;
  }

  function commitGiveWay(r, f) {
    for (const p of placed) if (p.f1 > f && f - p.f0 >= fps && overlapArea(r, inflate(p.r, 12 * u)) > 0) {
      p.f1 = f;
      if (p.seg) p.seg.f1 = f;
      if (p.out) p.out.f1 = Math.min(p.out.f1, f);
    }
  }

  function mapPoint(p, f) {
    return [p[0] * srcW * s - camAt(f), p[1] * srcH * s];
  }

  // behind the person: a wide band at shoulder height. Drawn under the person matte, so the person stays on top.
  function placeBehind(out, it, w, h, mt = {}) {
    const fb = faceOut(it.f0);
    const cy = fb ? fb[1] + fb[3] * (it.behind === 'head' ? 0.42 : 0.7) : H * 0.45;
    const ww = Math.min(W - 2 * m, Math.max(w, W * (tall ? 0.9 : 0.86)));
    const hh = Math.min(h * (ww / w), H * (tall ? 0.22 : 0.4));
    // meta.band "full": the whole frame behind the person (light, rays); otherwise a wide band at chest height
    const r = (mt.band === 'full' ? [0, 0, W, H] : [(W - ww) / 2, Math.max(area.top, Math.min(area.bottom - hh, cy - hh / 2)), ww, hh]).map((v) => Math.round(v));
    out.segments.push({f0: it.f0, f1: it.f1, slot: 'behind', r});
    out.needsMatte = true;
    if (!B?.anyKnown) {
      out.hidden = true;
      out.reason = 'needs the person matte (body detector)';
      notes.push(`${it.id}: "${it.kind}" goes behind the person and needs the person matte. On macOS it is made automatically; elsewhere see README "body on Windows".`);
    }
  }

  // columns (output px) the person takes up between two heights, over a stretch of frames: [x0, x1] or null
  function personSpan(y0, y1, f0, f1, exact = false) {
    if (!B?.anyKnown) return null;
    let lo = Infinity, hi = -Infinity;
    for (let f = f0; f < f1; f += 2) {
      const g = (exact && B.rawAt(f / fps)) || B.gridAt(f / fps), ox = camAt(f); // exact = the measured outline, not the safety area around it
      const r0 = Math.max(0, Math.floor(y0 / s / by / B.ch)), r1 = Math.min(B.GH - 1, Math.floor(y1 / s / by / B.ch));
      for (let gy = r0; gy <= r1; gy++) for (let gx = 0; gx < B.GW; gx++) if (g[gy * B.GW + gx]) {
        lo = Math.min(lo, gx * B.cw * bx * s - ox);
        hi = Math.max(hi, (gx + 1) * B.cw * bx * s - ox);
      }
    }
    return hi > lo ? [lo, hi] : null;
  }

  // Type behind the person must stay readable: the words are split at a word boundary and set on both sides of him,
  // tucked a little behind his outline (at most a fifth of the edge letter). One word goes whole to the wider side.
  // out.parts = [{text, r: [x, y, w, h], align}], out.fs = one type size for both sides. Graphics that know
  // out.parts (kit/keyword, remotion/gsap-letters, body/behind-text) draw them; check measures what he still covers.
  function straddle(out, it) {
    const words = String(it.text ?? '').split(/\s+/).filter(Boolean);
    if (!words.length) return;
    const band = out.segments[0].r;
    const fb = faceOut(it.f0);
    const cy = fb ? fb[1] + fb[3] * (it.behind === 'head' ? 0.45 : 0.8) : band[1] + band[3] / 2;
    const tr = style.tracking ?? -0.02;
    let fs = Math.min(band[3] * 0.8, H * 0.24), parts = null;
    for (let pass = 0; pass < 3; pass++) {
      const span = personSpan(cy - fs * 0.5, cy + fs * 0.45, it.f0, it.f1, true) || [W / 2 - 1, W / 2 + 1];
      const tuck = fs * (it.tuck ?? 0.28); // how far the edge letter slips behind his outline: it reads as "behind him", check keeps it under 25 %
      const L = [m, span[0] + tuck], R = [span[1] - tuck, W - m];
      const wl = Math.max(0, L[1] - L[0]), wr = Math.max(0, R[1] - R[0]);
      let best = null;
      // every word boundary (0 = all on the right, n = all on the left)
      for (let k = 0; k <= words.length; k++) {
        const a = words.slice(0, k).join(' '), c = words.slice(k).join(' ');
        const need = Math.max(a ? textW(a, 1, tr) / Math.max(1, wl) : 0, c ? textW(c, 1, tr) / Math.max(1, wr) : 0);
        const lone = k === 0 || k === words.length;
        const score = need * (lone && words.length > 1 ? 1.35 : 1); // both sides in use reads as "behind him"
        if (!best || score < best.score) best = {k, a, c, need, score};
      }
      const fit = Math.min(H * 0.24, band[3] * 0.8, 0.97 / best.need);
      parts = [];
      // each side gets a box as wide as its words (graphics set type a little under the box height: 0.85)
      const tw = (t) => Math.min(textW(t, fit, tr) * 1.04, t === best.a ? wl : wr);
      if (best.a) parts.push({text: best.a, align: 'right', r: [L[1] - tw(best.a), cy - fit * 0.72, tw(best.a), fit * 1.45].map((v) => Math.round(v))});
      if (best.c) parts.push({text: best.c, align: 'left', r: [R[0], cy - fit * 0.72, tw(best.c), fit * 1.45].map((v) => Math.round(v))});
      if (Math.abs(fit - fs) < 2) { fs = fit; break; }
      fs = fit;
    }
    out.parts = parts;
    out.fs = Math.round(fs);
  }

  // "side": "minutes" = one plain word on the other side of the person, level with the graphic: number on the left,
  // word on the right. The pair reads across the whole frame and still never touches him.
  function placeSide(out, it) {
    const r = out.segments[0].r;
    const left = r[0] + r[2] / 2 < W / 2;
    const span = personSpan(r[1], r[1] + r[3], it.f0, it.f1) || [W * 0.4, W * 0.6];
    const x0 = left ? span[1] + margin * 1.5 : m, x1 = left ? W - m : span[0] - margin * 1.5;
    const ww = x1 - x0;
    const tr = style.tracking ?? -0.02;
    const fs = Math.min(r[3] * 0.62, H * 0.16, ww / Math.max(0.5, textW(it.side, 1, tr)));
    if (ww < W * 0.12 || fs < H * 0.05) { notes.push(`${it.id}: no room for the side word "${it.side}" on the other side, left out`); return; }
    const tw = textW(it.side, fs, tr);
    const sr = [left ? x0 : x1 - tw, r[1] + r[3] / 2 - fs * 0.6, tw, fs * 1.2].map((v) => Math.round(v));
    if (personHit(sr, it.f0, it.f1) >= 0) { notes.push(`${it.id}: the side word "${it.side}" would touch the person, left out`); return; }
    out.side = {text: String(it.side), r: sr, fs: Math.round(fs), align: left ? 'left' : 'right'};
  }

  // graphics on the body: a per-frame track that follows the hand (or outlines the person), fixed offset per run
  function placeAttach(out, it, mt, w, h, scales) {
    const n = it.f1 - it.f0;
    if (!B?.anyKnown) {
      out.hidden = true;
      out.reason = 'needs the body detector (hands are not known)';
      notes.push(`${it.id}: "${it.kind}" follows the body and needs body.json (macOS Vision, or MediaPipe models).`);
      return;
    }
    if (mt.attach === 'contour') {
      // the line runs along the top of the person (head, shoulders, arms) pushed out by the margin
      const gap = (margin * 0.9) / s / bx;
      out.contour = [];
      for (let f = it.f0; f < it.f1; f++) out.contour.push(B.skylineAt(f / fps, gap).map((p) => bodyPt(p, f).map((v) => Math.round(v))));
      out.segments.push({f0: it.f0, f1: it.f1, slot: 'contour', r: [0, 0, W, H]});
      return;
    }
    const side = it.hand || 'any';
    const tr = handTrack(B, side, it.f0, it.f1, fps);
    const sc = scales[Math.min(scales.length - 1, 2)];
    const ww = w * sc, hh = h * sc;
    const gap = 18 * u;
    // candidate offsets around the hand: outward (away from the body centre), above, inward-above
    const track = new Array(n).fill(null);
    let shown = 0, hiddenBy = {lost: 0, person: 0, face: 0, edge: 0, protect: 0}, lastO = -1;
    for (let i = 0; i < n; i++) {
      const f = it.f0 + i, p = tr[i];
      if (!p || !p.ok) { hiddenBy.lost++; continue; }
      const hb = [p.box[0] * bx * s - camAt(f), p.box[1] * by * s, p.box[2] * bx * s, p.box[3] * by * s];
      const fb = faceOut(f);
      const centre = fb ? fb[0] + fb[2] / 2 : W / 2;
      const out1 = hb[0] + hb[2] / 2 > centre ? 1 : -1;
      const opts = [
        [out1 > 0 ? hb[0] + hb[2] + gap : hb[0] - gap - ww, hb[1] + hb[3] / 2 - hh / 2],
        [hb[0] + hb[2] / 2 - ww / 2, hb[1] - gap - hh],
        [out1 > 0 ? hb[0] + hb[2] + gap : hb[0] - gap - ww, hb[1] - hh],
      ];
      // a hand in front of the body: step outward at the same height until clear of the person (the leader line
      // gets longer, the tag still belongs to the hand), at most about a third of the frame away
      for (let d = 1; d <= 6; d++) {
        const dx = d * ww * 0.35;
        if (dx > W * 0.34) break;
        opts.push([out1 > 0 ? hb[0] + hb[2] + gap + dx : hb[0] - gap - ww - dx, hb[1] + hb[3] / 2 - hh / 2]);
        opts.push([out1 > 0 ? hb[0] + hb[2] + gap + dx : hb[0] - gap - ww - dx, hb[1] - hh * 1.2]);
      }
      let got = null, why = 'edge', gotO = -1;
      // keep the side it was on while that side still works: no jumping from side to side
      const order = lastO >= 0 ? [lastO, ...opts.map((_, o) => o).filter((o) => o !== lastO)] : opts.map((_, o) => o);
      for (const o of order) {
        const [x, y] = opts[o];
        const r = [x, y, ww, hh];
        if (!inside(r, W, H, m * 0.3)) { why = 'edge'; continue; }
        if (fb && overlapArea(r, inflate(fb, margin)) > 0) { why = 'face'; continue; }
        if (B.hitAt(toBody(r, f, margin * 0.5), f / fps) > 0) { why = 'person'; continue; }
        if (zones.some((z) => overlapArea(r, z.r) > 0)) { why = 'edge'; continue; }
        // things that are not the person but must stay clear (plan "protect": a mic arm): a hand graphic avoids them too
        if (protAt(f, f + 1).some((b) => overlapArea(r, b) > 0)) { why = 'protect'; continue; }
        got = r;
        gotO = o;
        break;
      }
      if (!got) { hiddenBy[why]++; continue; }
      lastO = gotO;
      track[i] = {r: got.map((v) => Math.round(v)), count: p.count, anchor: [Math.round(hb[0] + hb[2] / 2), Math.round(hb[1] + hb[3] / 2)]};
      shown++;
    }
    // no single-frame pops: a visible run shorter than 6 frames is dropped
    for (let i = 0; i < n; ) {
      if (!track[i]) { i++; continue; }
      let j = i;
      while (j < n && track[j]) j++;
      if (j - i < 6) for (let q = i; q < j; q++) { track[q] = null; shown--; hiddenBy.lost++; }
      i = j;
    }
    out.track = track;
    out.trackShown = shown / n;
    out.hiddenBy = hiddenBy;
    const first = track.find(Boolean);
    if (!first) {
      out.hidden = true;
      out.reason = `the hand is not seen clear of the body here (${Object.entries(hiddenBy).filter((e) => e[1]).map((e) => e.join(' ')).join(', ')} frames)`;
      notes.push(`${it.id}: hidden, ${out.reason}. Pick a moment where a hand is up and away from the body.`);
      return;
    }
    out.segments.push({f0: it.f0, f1: it.f1, slot: 'hand', r: first.r});
    if (shown / n < 0.6) notes.push(`${it.id}: shown ${Math.round((shown / n) * 100)} % of its time (the hand was lost or too close to the body)`);
  }

  // pointer: the card is placed like a box; the line starts at the index finger tip, frame by frame
  function addPointer(out, it) {
    const tr = handTrack(B, it.hand || 'any', it.f0, it.f1, fps);
    if (!tr) return;
    out.tips = tr.map((p, i) => {
      if (!p || !p.ok) return null;
      const f = it.f0 + i;
      const hb = [p.box[0] * bx * s - camAt(f), p.box[1] * by * s, p.box[2] * bx * s, p.box[3] * by * s];
      const tp = p.tip ? [p.tip[0] * bx * s - camAt(f), p.tip[1] * by * s] : [hb[0] + hb[2] / 2, hb[1]];
      return tp.map((v) => Math.round(v));
    });
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

// Position of an item at frame f (main timeline). Fixed inside a segment, one eased move between segments
// that came from a face move; pieces cut because of the person (cut: true) fade out and in instead of sliding.
// Graphics on the body (track) give their own box per frame (null = hidden at that frame).
export function rectAt(item, f) {
  if (item.track) {
    const t = item.track[f - item.f0];
    return t ? t.r : null;
  }
  const sg = item.segments;
  if (!sg.length) return null;
  for (let i = 0; i < sg.length; i++) {
    const s = sg[i];
    if (f < s.f0 || f >= s.f1) continue;
    if (i > 0 && !s.cut && f < s.f0 + MOVE_FRAMES) {
      const p = sg[i - 1].r, q = s.r;
      const x = (f - s.f0) / MOVE_FRAMES;
      const e = x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
      return p.map((v, k) => v + (q[k] - v) * e);
    }
    return s.r;
  }
  return null;
}

// Opacity of an item at frame f from the layout alone: fades at cut pieces (6 frames out, 6 in) and around
// hidden frames of body-attached graphics. The graphic's own entry and exit motion comes on top.
export const CUT_FADE = 6;
export function layoutAlpha(item, f) {
  if (item.track) {
    let a = 1;
    for (let k = 1; k <= CUT_FADE; k++) {
      if (!item.track[f - item.f0 - k] && f - item.f0 - k >= 0) a = Math.min(a, k / (CUT_FADE + 1));
      if (!item.track[f - item.f0 + k] && f - item.f0 + k < item.track.length) a = Math.min(a, k / (CUT_FADE + 1));
    }
    return item.track[f - item.f0] ? a : 0;
  }
  const sg = item.segments;
  for (let i = 0; i < sg.length; i++) {
    const s = sg[i];
    if (f < s.f0 || f >= s.f1) continue;
    let a = 1;
    if (s.cut && i > 0) a = Math.min(a, Math.min(1, (f - s.f0 + 1) / (CUT_FADE + 1)));
    if (sg[i + 1]?.cut) a = Math.min(a, Math.min(1, (s.f1 - f) / (CUT_FADE + 1)));
    return a;
  }
  return 0;
}

export const fmt = (t) => (Math.round(t * 10) / 10).toFixed(1);
