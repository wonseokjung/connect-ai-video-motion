// check: measure the plan the way a picky editor would. Two grades:
//   ERROR (must fix): face overlap, outside the frame, more than 4 words, contrast too low, plan points to a missing word
//   ADVICE (list only): same graphic kind twice (a 1 · 2 · 3 series counts once), 3 s+ with nothing changing, no room
// Every line says what, when, and how to fix. The agent fixes plan.json and runs check again.
import path from 'node:path';
import fs from 'node:fs';
import {layoutPlan, rectAt, layoutAlpha, segHitsRect, arrowFrom, TEXT_FIELDS, wordCount, FACE_MARGIN, fmt, bodyBox} from '../src/core/layout.mjs';
import {makeBody, bodyFacts} from '../src/core/body.mjs';
import {METAS} from '../src/catalog/metas.generated.mjs';
import {kindOf} from '../src/core/catalog.mjs';
import {faceAt, inflate, overlapPx} from '../src/core/face.mjs';
import {pickInk, luminanceOfRgb, TARGET} from '../src/core/contrast.mjs';
import {getStyle} from '../src/styles/presets.mjs';
import {meanRgb} from './ffmpeg.mjs';
import {readJson, writeJson} from './analyze.mjs';

export function loadData(P) {
  const w = (f, d) => readJson(path.join(P.work, f), d);
  return {meta: w('meta.json'), face: w('face.json'), body: w('body.json'), words: w('words.json', {tier: 'C', captions: []}), plan: w('plan.json', {items: []}), info: w('my-info.json', {}), contrast: w('contrast.json', {})};
}

const TIER_TEXT = {A: 'A: word times (graphic 40 ms after the word)', B: 'B: sentence subtitles, word times snapped to the voice (about +-0.2 s)', C: 'C: times written by hand'};

export async function check(P, {aspects = ['16x9'], measure = true} = {}) {
  const data = loadData(P);
  const style = getStyle(data.info?.style, data.info);
  const errors = [], advice = [], facts = [];
  const contrast = {...(data.contrast || {})};
  const layouts = {};
  for (const aspect of aspects) {
    const L = layoutPlan({meta: data.meta, face: data.face, body: data.body, words: data.words, plan: data.plan, info: data.info, style, aspect});
    const B = L.body ? makeBody(data.body) : null;
    const [bxs, bys] = L.bodyScale || [1, 1];
    // output rect -> body px at frame f, then: how many person cells does it touch (0 = clear)
    const personCells = (r, f) => {
      if (!B?.anyKnown) return 0;
      const ox = L.camera ? L.camera[Math.min(L.camera.length - 1, f)] : 0;
      return B.hitAt([(r[0] + ox) / L.scale / bxs, r[1] / L.scale / bys, r[2] / L.scale / bxs, r[3] / L.scale / bys], f / L.fps);
    };
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
        if (n > 4 && aspect === aspects[0] && !(item.meta?.words > 4)) errors.push({id: it.id, t: it.f0 / L.fps, what: 'words', msg: `${it.id}: "${item[k]}" has ${n} words. Keep 1-4 words: the key word, number or thing, not the sentence.`});
      }
      if (it.parts && B?.anyKnown && aspect === aspects[0]) {
        // type behind the person: share of the words' boxes that the measured person covers, worst moment
        let worstCover = 0, at = it.f0;
        for (let f = it.f0; f < it.f1; f += 3) {
          const g = B.rawAt(f / L.fps) || B.gridAt(f / L.fps);
          let all = 0, hit = 0;
          for (const pt of it.parts) {
            const ox = L.camera ? L.camera[Math.min(L.camera.length - 1, f)] : 0;
            const x0 = (pt.r[0] + ox) / L.scale / bxs / B.cw, x1 = (pt.r[0] + pt.r[2] + ox) / L.scale / bxs / B.cw;
            const y0 = (pt.r[1] + pt.r[3] * 0.2) / L.scale / bys / B.ch, y1 = (pt.r[1] + pt.r[3] * 0.8) / L.scale / bys / B.ch;
            for (let gy = Math.max(0, Math.floor(y0)); gy <= Math.min(B.GH - 1, Math.floor(y1)); gy++) for (let gx = Math.max(0, Math.floor(x0)); gx <= Math.min(B.GW - 1, Math.floor(x1)); gx++) { all++; if (g[gy * B.GW + gx]) hit++; }
          }
          const c = all ? hit / all : 0;
          if (c > worstCover) { worstCover = c; at = f; }
        }
        it.covered = +worstCover.toFixed(3);
        facts.push(`${it.id}: type behind you, covered at most ${Math.round(worstCover * 100)} % (at ${fmt(at / L.fps)} s)`);
        if (worstCover > 0.25) errors.push({id: it.id, t: at / L.fps, what: 'covered', msg: `${it.id}: ${Math.round(worstCover * 100)} % of the words behind you are hidden by you at ${fmt(at / L.fps)} s (limit 25 %). Use fewer or shorter words, or another moment.`});
      }
      if (it.side && personCells(it.side.r, it.f0) + personCells(it.side.r, it.f1 - 1) > 0) errors.push({id: it.id, t: it.f0 / L.fps, what: 'person', msg: `${it.id}: the side word "${it.side.text}" touches you. Shorten it or drop "side".`});
      if (it.blocked) errors.push({id: it.id, t: it.f0 / L.fps, what: 'full', msg: `${it.id}${tag}: "${it.kind}" fills the whole frame and would cover the person at ${fmt(it.f0 / L.fps)} s. Use a box graphic here, or this one on a part with no person.`});
      if (it.hidden) continue;
      if (it.place === 'behind' || it.attach === 'contour') {
        // behind the person (drawn under the matte) or a line around the person: checked for the matte / the line only
        if (it.place === 'behind' && !B?.anyKnown) errors.push({id: it.id, t: it.f0 / L.fps, what: 'matte', msg: `${it.id}${tag}: goes behind the person but there is no person matte. Run analyze on macOS, or add the MediaPipe models (README "body on Windows").`});
        if (it.contour) {
          let worst = -1;
          for (let i = 0; i < it.contour.length && worst < 0; i += 2) for (const p of it.contour[i]) if (B.rawHit((p[0] + (L.camera ? L.camera[Math.min(L.camera.length - 1, it.f0 + i)] : 0)) / L.scale / bxs, p[1] / L.scale / bys, (it.f0 + i) / L.fps)) { worst = it.f0 + i; break; }
          if (worst >= 0) errors.push({id: it.id, t: worst / L.fps, what: 'person', msg: `${it.id}${tag}: the outline line touches the person at ${fmt(worst / L.fps)} s. Use a bigger "gap" or another moment.`});
        }
        continue;
      }
      const minW = aspect === '9x16' ? 0.5 : 0.22;
      const gw = it.track ? Math.max(0, ...it.track.filter(Boolean).map((x) => x.r[2])) : Math.max(...it.segments.map((s) => s.r[2]));
      if (gw < L.W * minW && !it.track && !(it.item.meta?.size?.minW < minW)) advice.push({id: it.id, what: 'small', msg: `${it.id}${tag}: only ${Math.round((gw / L.W) * 100)} % of the frame width (aim for ${Math.round(minW * 100)} % or more). Use a side with more room (slot) or a band.`});
      let bodyWorst = 0, bodyF = -1, worst = 0, worstF = -1, off = 0, offF = -1, arrowHit = -1, protHit = -1, prev = null, pers = 0, persF = -1, rayHit = -1, rayBody = -1;
      for (let f = it.f0; f < it.f1; f++) {
        const r = rectAt(it, f);
        if (!r || layoutAlpha(it, f) <= 0) { prev = null; continue; }
        if (prev && !it.track) maxStep = Math.max(maxStep, Math.hypot(r[0] - prev[0], r[1] - prev[1]));
        prev = r;
        const pc = personCells(r, f);
        if (pc > pers) { pers = pc; persF = f; }
        if (it.tips && it.tips[f - it.f0]) {
          const b0 = fb(f);
          const tip = it.tips[f - it.f0];
          if (b0 && rayHit < 0 && segHitsRect(tip, arrowFrom(r, tip), inflate(b0, FACE_MARGIN * L.u * 0.5))) rayHit = f;
          // the line may start on the hand itself (the first 150 px from the fingertip); after that it must stay off the person
          if (rayBody < 0 && B?.anyKnown) {
            const a = arrowFrom(r, tip), len = Math.hypot(a[0] - tip[0], a[1] - tip[1]), free = 150 * L.u;
            for (let q = 0; q <= 24 && len > free; q++) {
              const k = (q / 24) * (1 - free / len);
              if (personCells([a[0] + (tip[0] - a[0]) * k - 2, a[1] + (tip[1] - a[1]) * k - 2, 4, 4], f) > 0) { rayBody = f; break; }
            }
          }
        }
        const b = fb(f);
        if (b) {
          const o = overlapPx(r, inflate(b, FACE_MARGIN * L.u));
          const bb = B?.anyKnown ? null : bodyBox(b, L.W, L.H, L.body, aspect === '9x16');
          const ob = bb ? overlapPx(r, bb) : 0;
          if (ob > bodyWorst) { bodyWorst = ob; bodyF = f; }
          if (o > worst) { worst = o; worstF = f; }
          if (it.kind === 'kit/card' && item.target && arrowHit < 0) {
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
      if (pers > 0 && !(worst > 0)) errors.push({id: it.id, t: persF / L.fps, what: 'person', msg: `${it.id}${tag}: covers the person (body, arms or hands, measured) at ${fmt(persF / L.fps)} s (${pers} cell${pers > 1 ? 's' : ''}). ${it.forced ? 'Remove "pos" so the kit finds an empty place.' : 'Pick another moment or a smaller graphic.'}`});
      if (rayBody >= 0 && rayHit < 0) errors.push({id: it.id, t: rayBody / L.fps, what: 'person', msg: `${it.id}${tag}: the pointer line crosses your body at ${fmt(rayBody / L.fps)} s. Pick a moment where the hand is out to the side, or the other hand ("hand").`});
      if (rayHit >= 0) errors.push({id: it.id, t: rayHit / L.fps, what: 'face', msg: `${it.id}${tag}: the pointer line crosses the face at ${fmt(rayHit / L.fps)} s. Use the other hand ("hand") or another moment.`});
      if (it.track && it.trackShown < 0.6) advice.push({id: it.id, what: 'hand', msg: `${it.id}${tag}: follows the hand but is shown only ${Math.round(it.trackShown * 100)} % of its time (hand lost or too close to the body: ${Object.entries(it.hiddenBy || {}).filter((e) => e[1]).map((e) => `${e[0]} ${e[1]}`).join(', ')} frames). Pick a moment where a hand is up and away from the body.`});
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
    // two graphics on top of each other (a forced "pos", or a hand graphic passing a box)
    const vis = L.items.filter((it) => !it.hidden && it.place !== 'behind' && it.attach !== 'contour' && it.segments.length);
    for (let a = 0; a < vis.length; a++) for (let b = a + 1; b < vis.length; b++) {
      const A = vis[a], Bi = vis[b];
      const f0 = Math.max(A.f0, Bi.f0), f1 = Math.min(A.f1, Bi.f1);
      for (let f = f0; f < f1; f += 3) {
        const ra = rectAt(A, f), rb = rectAt(Bi, f);
        if (ra && rb && overlapPx(ra, rb) > 0) {
          errors.push({id: Bi.id, t: f / L.fps, what: 'overlap', msg: `${Bi.id}${tag}: lies on top of ${A.id} at ${fmt(f / L.fps)} s. Move one of them in time, or remove "pos" so the kit finds its own place.`});
          break;
        }
      }
    }
    if (aspect === aspects[0]) {
      // advice: repeats and still stretches
      const seen = {};
      for (const it of L.items) {
        if (it.hidden) continue;
        const fam = it.family || it.kind;
        const key = it.item.series ? `${fam}:${it.item.series}` : it.kind === 'kit/steps' ? `${fam}:steps` : fam;
        (seen[key] ||= []).push(it.id);
      }
      const byFam = {};
      for (const k of Object.keys(seen)) (byFam[k.split(':')[0]] ||= []).push(...(k.includes(':') ? [seen[k][0]] : seen[k]));
      for (const [k, ids] of Object.entries(byFam)) if (ids.length > 1) advice.push({what: 'repeat', msg: `the design "${k}" is used ${ids.length} times (${ids.join(', ')}). Each design once per video reads better (a 1 · 2 · 3 series counts once); the catalog has ${Object.keys(METAS).length} others.`});
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
      const bf = bodyFacts(B);
      facts.unshift(B?.anyKnown ? `body: ${B.source}, person found in ${bf.person} % of looks, shoulders ${bf.shoulders} %, a hand ${bf.hands} %, both hands ${bf.twoHands} %${bf.unknown ? `, not measured ${bf.unknown} %` : ''} (graphics are kept off the MEASURED person: face, body, arms, hands)` : `body: estimated from the face box${L.body ? '' : ' (off)'}; hands are not known, mark them in plan.protect`);
      facts.unshift(`face: ${data.face?.source || 'none'} (graphics are kept off the DETECTED face box + ${FACE_MARGIN} px)`);
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
