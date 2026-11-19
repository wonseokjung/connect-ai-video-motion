// check: measure the plan the way a picky editor would. Two grades:
//   ERROR (must fix): face overlap, outside the frame, more than 4 words, contrast too low, plan points to a missing word
//   ADVICE (list only): same graphic kind twice (a 1 · 2 · 3 series counts once), 3 s+ with nothing changing, no room
// Every line says what, when, and how to fix. The agent fixes plan.json and runs check again.
import path from 'node:path';
import fs from 'node:fs';
import {layoutPlan, rectAt, segHitsRect, arrowFrom, TEXT_FIELDS, wordCount, FACE_MARGIN, fmt, bodyBox} from '../src/core/layout.mjs';
import {faceAt, inflate, overlapPx} from '../src/core/face.mjs';
import {pickInk, luminanceOfRgb, TARGET} from '../src/core/contrast.mjs';
import {getStyle} from '../src/styles/presets.mjs';
import {meanRgb} from './ffmpeg.mjs';
import {readJson, writeJson} from './analyze.mjs';

export function loadData(P) {
  const w = (f, d) => readJson(path.join(P.work, f), d);
  return {meta: w('meta.json'), face: w('face.json'), words: w('words.json', {tier: 'C', captions: []}), plan: w('plan.json', {items: []}), info: w('my-info.json', {}), contrast: w('contrast.json', {})};
}

const TIER_TEXT = {A: 'A: word times (graphic 40 ms after the word)', B: 'B: sentence subtitles, word times snapped to the voice (about +-0.2 s)', C: 'C: times written by hand'};

export async function check(P, {aspects = ['16x9'], measure = true} = {}) {
  const data = loadData(P);
  const style = getStyle(data.info?.style);
  const errors = [], advice = [], facts = [];
  const contrast = {...(data.contrast || {})};
  const layouts = {};
  for (const aspect of aspects) {
    const L = layoutPlan({meta: data.meta, face: data.face, words: data.words, plan: data.plan, info: data.info, style, aspect});
    layouts[aspect] = L;
    const tag = aspect === '9x16' ? ' [9:16]' : '';
    for (const e of L.errors) errors.push({id: e.id, t: null, what: 'plan', msg: `${e.id}${tag}: ${e.msg}. Fix the "at" of this line in plan.json.`});
    for (const n of L.notes) advice.push({id: n.split(':')[0], what: 'room', msg: n + tag});
    const fb = (f) => {
      const b = faceAt(data.face, f / L.fps);
      if (!b) return null;
      const ox = L.camera ? L.camera[Math.min(L.camera.length - 1, f)] : 0;
      const sx = data.face.width ? data.meta.width / data.face.width : 1, sy = data.face.height ? data.meta.height / data.face.height : 1;
      return [b[0] * sx * L.scale - ox, b[1] * sy * L.scale, b[2] * sx * L.scale, b[3] * sy * L.scale];
    };
    let maxStep = 0;
    for (const it of L.items) {
      const item = it.item;
      for (const k of TEXT_FIELDS) {
        const n = wordCount(item[k]);
        if (n > 4 && !(aspect !== aspects[0])) errors.push({id: it.id, t: it.f0 / L.fps, what: 'words', msg: `${it.id}: "${item[k]}" has ${n} words. Keep 1-4 words: the key word, number or thing, not the sentence.`});
      }
      if (it.hidden) continue;
      const minW = aspect === '9x16' ? 0.5 : 0.22;
      const gw = Math.max(...it.segments.map((s) => s.r[2]));
      if (gw < L.W * minW) advice.push({id: it.id, what: 'small', msg: `${it.id}${tag}: only ${Math.round((gw / L.W) * 100)} % of the frame width (aim for ${Math.round(minW * 100)} % or more). Use a side with more room (slot) or a band.`});
      let bodyWorst = 0, bodyF = -1, worst = 0, worstF = -1, off = 0, offF = -1, arrowHit = -1, protHit = -1, prev = null;
      for (let f = it.f0; f < it.f1; f++) {
        const r = rectAt(it, f);
        if (!r) continue;
        if (prev) maxStep = Math.max(maxStep, Math.hypot(r[0] - prev[0], r[1] - prev[1]));
        prev = r;
        const b = fb(f);
        if (b) {
          const o = overlapPx(r, inflate(b, FACE_MARGIN * L.u));
          const bb = bodyBox(b, L.W, L.H, L.body, aspect === '9x16');
          const ob = bb ? overlapPx(r, bb) : 0;
          if (ob > bodyWorst) { bodyWorst = ob; bodyF = f; }
          if (o > worst) { worst = o; worstF = f; }
          if (item.kind === 'card' && item.target && arrowHit < 0) {
            const ox = L.camera ? L.camera[Math.min(L.camera.length - 1, f)] : 0;
            const tgt = [item.target[0] * data.meta.width * L.scale - ox, item.target[1] * data.meta.height * L.scale];
            if (tgt[0] >= 0 && tgt[0] <= L.W && tgt[1] >= 0 && tgt[1] <= L.H && segHitsRect(arrowFrom(r, tgt), tgt, b)) arrowHit = f;
          }
        }
        for (const pr of data.plan.protect || []) {
          if (f < (pr.from ?? 0) * L.fps || f >= (pr.to ?? 1e9) * L.fps) continue;
          const ox = L.camera ? L.camera[Math.min(L.camera.length - 1, f)] : 0;
          const pb = [pr.box[0] * data.meta.width * L.scale - ox, pr.box[1] * data.meta.height * L.scale, pr.box[2] * data.meta.width * L.scale, pr.box[3] * data.meta.height * L.scale];
          if (overlapPx(r, pb) > 0 && protHit < 0) protHit = f;
        }
        const o2 = Math.max(0, -r[0], -r[1], r[0] + r[2] - L.W, r[1] + r[3] - L.H);
        if (o2 > off) { off = o2; offF = f; }
      }
      if (worst > 0) errors.push({id: it.id, t: worstF / L.fps, what: 'face', msg: `${it.id}${tag}: covers the face area (face box + ${FACE_MARGIN} px) by ${worst} px at ${fmt(worstF / L.fps)} s. ${it.forced ? 'Remove "pos" so the kit places it beside the face.' : 'Use another slot or shorter text.'}`});
      if (bodyWorst > 0 && !(worst > 0)) errors.push({id: it.id, t: bodyF / L.fps, what: 'body', msg: `${it.id}${tag}: covers the body (shoulders and torso under the face) by ${bodyWorst} px at ${fmt(bodyF / L.fps)} s. ${it.forced ? 'Remove "pos" so the kit places it in an empty area.' : 'Use another slot or shorter text.'} To change the body area use "body" in my-info.json.`});
      if (off > 0) errors.push({id: it.id, t: offF / L.fps, what: 'frame', msg: `${it.id}${tag}: ${Math.round(off)} px outside the frame at ${fmt(offF / L.fps)} s. ${it.forced ? 'Move "pos" inward or remove it.' : 'Shorten the text.'}`});
      if (protHit >= 0) errors.push({id: it.id, t: protHit / L.fps, what: 'protect', msg: `${it.id}${tag}: covers an area you asked to keep clear (plan.protect) at ${fmt(protHit / L.fps)} s. Remove "pos" or pick another slot.`});
      if (arrowHit >= 0) errors.push({id: it.id, t: arrowHit / L.fps, what: 'face', msg: `${it.id}${tag}: the arrow crosses the face at ${fmt(arrowHit / L.fps)} s. Put the card on the other side (slot) or pick another target.`});
      // contrast: how bright is the video under the box?
      if (measure && data.meta && fs.existsSync(path.join(P.work, data.meta.file))) {
        const mid = Math.round((it.f0 + it.f1) / 2);
        const r = rectAt(it, mid) || it.segments[0].r;
        const ox = L.camera ? L.camera[Math.min(L.camera.length - 1, mid)] : 0;
        const sx = Math.max(0, (r[0] + ox) / L.scale), sy = Math.max(0, r[1] / L.scale);
        const sw = Math.min(data.meta.width - sx, r[2] / L.scale), sh = Math.min(data.meta.height - sy, r[3] / L.scale);
        if (sw > 4 && sh > 4) {
          const rgb = await meanRgb(path.join(P.work, data.meta.file), mid / L.fps, [sw, sh, sx, sy]);
          contrast[`${it.id}@${aspect}`] = +luminanceOfRgb(rgb).toFixed(4);
        }
      }
      const lum = contrast[`${it.id}@${aspect}`];
      if (lum != null) {
        const c = pickInk(lum, style);
        facts.push(`${it.id}${tag}: backing ${Math.round(c.scrim * 100)} %, contrast ${c.contrast}:1`);
        if (c.contrast < TARGET) errors.push({id: it.id, t: it.f0 / L.fps, what: 'contrast', msg: `${it.id}${tag}: text contrast ${c.contrast}:1 (needs ${TARGET}). Pick a darker spot (slot) or the "clean" style.`});
      }
    }
    facts.push(`${aspect}: graphics keep one place while shown; biggest move per frame ${maxStep.toFixed(2)} px (only during a planned move)` + (L.camera ? `; 9:16 crop camera max ${maxCam(L.camera).toFixed(2)} px/frame` : ''));
    if (aspect === aspects[0]) {
      // advice: repeats and still stretches
      const seen = {};
      for (const it of L.items) {
        if (it.hidden) continue;
        const key = it.kind === 'steps' ? 'steps:' + (it.item.series || 'steps') : it.item.series ? `${it.kind}:${it.item.series}` : it.kind;
        (seen[key] ||= []).push(it.id);
      }
      const byKind = {};
      for (const k of Object.keys(seen)) (byKind[k.split(':')[0]] ||= []).push(...(k.includes(':') ? [seen[k][0]] : seen[k]));
      for (const [k, ids] of Object.entries(byKind)) if (ids.length > 1) advice.push({what: 'repeat', msg: `"${k}" is used ${ids.length} times (${ids.join(', ')}). Each look once per video reads better; a 1 · 2 · 3 series counts once.`});
      const ev = [0, L.mainFrames];
      for (const it of L.items) if (!it.hidden) ev.push(it.f0, it.f1);
      ev.sort((a, b) => a - b);
      for (let i = 1; i < ev.length; i++) {
        const gap = (ev[i] - ev[i - 1]) / L.fps;
        const covered = L.items.some((it) => !it.hidden && it.f0 <= ev[i - 1] && it.f1 >= ev[i]);
        if (gap > 3 && !covered) advice.push({what: 'still', msg: `${fmt(ev[i - 1] / L.fps)}-${fmt(ev[i] / L.fps)} s: ${gap.toFixed(1)} s without any graphic change. Fine if the picture itself moves; otherwise add one beat.`});
      }
      facts.unshift(`speech timing tier ${TIER_TEXT[L.tier] || L.tier}`);
      const est = {};
      for (const it of L.items) if (it.tier) est[it.tier] = (est[it.tier] || 0) + 1;
      facts.unshift(`face: ${data.face?.source || 'none'} (graphics are kept off the DETECTED face box + ${FACE_MARGIN} px${L.body ? " and the body under it" : ""})`);
    }
  }
  writeJson(path.join(P.work, 'contrast.json'), contrast);
  const res = {ok: errors.length === 0, errors, advice, facts, layouts};
  writeReport(P, res, data);
  return res;
}

const maxCam = (c) => {
  let m = 0;
  for (let i = 1; i < c.length; i++) m = Math.max(m, Math.abs(c[i] - c[i - 1]));
  return m;
};

function writeReport(P, res, data) {
  const L = res.layouts['16x9'] || Object.values(res.layouts)[0];
  const rows = L.items.map((it) => `| ${it.id} | ${it.kind} | ${it.word ? `"${it.word}" ${it.wordT.toFixed(2)} s` : 'by hand'} | ${(it.f0 / L.fps).toFixed(2)}-${(it.f1 / L.fps).toFixed(2)} s | ${it.tier} | ${it.hidden ? 'hidden: ' + it.reason : it.segments.map((s) => s.slot).join(' > ')} |`);
  const md = [
    `# check report`,
    ``,
    res.ok ? `**PASS**: 0 errors, ${res.advice.length} advice.` : `**FAIL**: ${res.errors.length} error(s). Fix them, then run check again.`,
    ``,
    `## Errors (must fix)`,
    ...(res.errors.length ? res.errors.map((e) => `- ${e.msg}`) : ['- none']),
    ``,
    `## Advice (your call)`,
    ...(res.advice.length ? res.advice.map((e) => `- ${e.msg}`) : ['- none']),
    ``,
    `## Facts`,
    ...res.facts.map((f) => `- ${f}`),
    ``,
    `## Plan as placed`,
    `| id | kind | word | on screen | tier | place |`,
    `|---|---|---|---|---|---|`,
    ...rows,
    ``,
  ].join('\n');
  fs.writeFileSync(path.join(P.out, 'report.md'), md);
  writeJson(path.join(P.out, 'check.json'), {ok: res.ok, errors: res.errors, advice: res.advice, facts: res.facts});
}
