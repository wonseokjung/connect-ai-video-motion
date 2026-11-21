// Tests: the layout keeps graphics off the face and body, and check catches a plan that covers the face on purpose.
// No rendering here (fast). Run: node tests/run.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {projectPaths, writeJson, readJson} from '../lib/analyze.mjs';
import {check} from '../lib/check.mjs';
import {draftPlan} from '../lib/plan-draft.mjs';
import {parseSrt} from '@remotion/captions';
import {spreadCues} from '../src/core/words.mjs';
import {installSkill, removeSkill} from '../lib/install.mjs';
import {scanCatalog, prepareProject} from '../lib/catalog-build.mjs';
import {validateMeta} from '../src/core/catalog.mjs';
import {checkBlock} from '../lib/hf-import.mjs';
import {layoutPlan} from '../src/core/layout.mjs';
import {makeBody, rigTrack, downBeats} from '../src/core/body.mjs';
import {getStyle} from '../src/styles/presets.mjs';
import {METAS} from '../src/catalog/metas.generated.mjs';

const KIT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const S = path.join(KIT, 'public', 'sample');
let n = 0;
const ok = (name) => console.log(`  ok ${++n} ${name}`);

function project(plan) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vm-test-'));
  const P = projectPaths(dir);
  const face = readJson(path.join(S, 'face.json'));
  const cues = parseSrt({input: fs.readFileSync(path.join(S, 'sample10.srt'), 'utf8')}).captions;
  writeJson(path.join(P.work, 'meta.json'), {file: 'video.mp4', width: 1280, height: 720, fps: 30, duration: 12.27, audio: true});
  writeJson(path.join(P.work, 'face.json'), face);
  writeJson(path.join(P.work, 'words.json'), {tier: 'B', source: 'sample10.srt', captions: spreadCues(cues)});
  writeJson(path.join(P.work, 'my-info.json'), readJson(path.join(S, 'my-info.json')));
  writeJson(path.join(P.work, 'plan.json'), plan || draftPlan(readJson(path.join(P.work, 'words.json')), readJson(path.join(S, 'my-info.json'))));
  return P;
}

// 1. the automatic draft only uses said words and passes check in both shapes
{
  const P = project();
  const plan = readJson(path.join(P.work, 'plan.json'));
  const said = readJson(path.join(P.work, 'words.json')).captions.map((c) => c.text.toLowerCase().replace(/[^a-z0-9]/g, ''));
  for (const it of plan.items) if (it.at) assert.ok(said.includes(it.at.text.toLowerCase()), `cue word "${it.at.text}" was said`);
  ok('draft plan cues only words that were said');
  const r = await check(P, {aspects: ['16x9', '9x16'], measure: false});
  assert.equal(r.errors.length, 0, JSON.stringify(r.errors));
  ok('draft plan passes check in 16:9 and 9:16 (0 face overlap, 0 outside frame)');
}
// 2. the broken plan is caught, with a sentence that says how to fix it
{
  const P = project(readJson(path.join(KIT, 'tests', 'face-cover.plan.json')));
  const r = await check(P, {aspects: ['16x9'], measure: false});
  assert.equal(r.ok, false);
  const face = r.errors.find((e) => e.id === 'title-on-face' && e.what === 'face');
  assert.ok(face && /Remove "pos"/.test(face.msg), 'face error with fix');
  ok(`face overlap caught: ${face.msg}`);
  const words = r.errors.find((e) => e.id === 'too-many-words' && e.what === 'words');
  assert.ok(words, 'word count error');
  ok(`word count caught: ${words.msg}`);
}
// 3. removing the forced position fixes it (the kit places it beside the face)
{
  const bad = readJson(path.join(KIT, 'tests', 'face-cover.plan.json'));
  delete bad.items[0].pos;
  bad.items[1].label = 'tools';
  const r = await check(project(bad), {aspects: ['16x9'], measure: false});
  assert.equal(r.errors.length, 0, JSON.stringify(r.errors));
  ok('after the fix: PASS');
}
// 4. a graphic on the chest (under the face, off the face box) is caught as covering the body; body: false turns the rule off
{
  const face = readJson(path.join(S, 'face.json'));
  const b = face.samples.find((x) => x.box).box, fw = face.width || 1280, fh = face.height || 720;
  const chest = {version: 1, items: [{id: 'on-chest', kind: 'keyword', at: {text: 'AI', near: 5.1}, text: 'AI', pos: [(b[0] + b[2] * 0.1) / fw, Math.min(0.8, (b[1] + b[3] * 1.35) / fh)]}]};
  const r = await check(project(chest), {aspects: ['16x9'], measure: false});
  const body = r.errors.find((e) => e.id === 'on-chest' && e.what === 'body');
  assert.ok(body && /covers the body/.test(body.msg), 'body error: ' + JSON.stringify(r.errors));
  assert.ok(!r.errors.some((e) => e.what === 'face'), 'not a face error');
  ok(`body overlap caught: ${body.msg}`);
  const r2 = await check(project({...chest, body: false}), {aspects: ['16x9'], measure: false});
  assert.ok(!r2.errors.some((e) => e.what === 'body'), 'body: false turns it off');
  ok('body: false turns the body rule off');
}
// 5. skill installer works in a temp HOME only
{
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'vm-home-'));
  fs.mkdirSync(path.join(home, '.claude'), {recursive: true});
  fs.mkdirSync(path.join(home, '.codex'), {recursive: true});
  fs.mkdirSync(path.join(home, '.gemini', 'config'), {recursive: true});
  const quiet = () => {};
  installSkill({agent: 'all', home, env: {}, log: quiet});
  for (const d of ['.claude/skills', '.agents/skills', '.gemini/config/skills']) assert.ok(fs.existsSync(path.join(home, d, 'connect-ai-video-motion', 'SKILL.md')), d);
  removeSkill({agent: 'all', home, env: {}, log: quiet});
  for (const d of ['.claude/skills', '.agents/skills', '.gemini/config/skills']) assert.ok(!fs.existsSync(path.join(home, d, 'connect-ai-video-motion')), d);
  ok('install-skill / remove-skill in a temp HOME (Claude Code, Codex, Antigravity)');
}
// ---------- 0.2: body, catalog, your own graphics ----------
// A made-up body.json for the sample video: the person around the face, an arm reaching out low on the left, and a
// right hand held up beside the body showing two fingers (from 4 s to 8 s; low confidence from 6 to 6.6 s).
const GW = 64, GH = 36;
function bodyFixture() {
  const face = readJson(path.join(S, 'face.json'));
  const W = face.width, H = face.height, cw = W / GW, ch = H / GH;
  const faceAt = (t) => face.samples.reduce((a, b) => (Math.abs(b.t - t) < Math.abs(a.t - t) && b.box ? b : a), face.samples.find((x) => x.box)).box;
  const samples = [];
  for (let t = 0; t < 12.27; t += 1 / 15) {
    const [fx, fy, fw, fh] = faceAt(t);
    const on = (x, y) => (x >= fx - 0.9 * fw && x <= fx + 1.9 * fw && y >= fy - 0.1 * fh) || (y >= 800 && x >= fx - 2.2 * fw && x <= fx + 2.4 * fw);
    const rows = [];
    for (let gy = 0; gy < GH; gy++) {
      let hex = '';
      for (let gx = 0; gx < GW; gx += 4) {
        let v = 0;
        for (let b = 0; b < 4; b++) if (on((gx + b + 0.5) * cw, (gy + 0.5) * ch)) v |= 8 >> b;
        hex += v.toString(16);
      }
      rows.push(hex);
    }
    const hands = [];
    if (t >= 4 && t < 8) {
      const wx = fx - 1.6 * fw + (t - 4) * 20, wy = fy + 1.3 * fh, c = t >= 6 && t < 6.6 ? 0.2 : 0.9;
      const pts = {wrist: [wx, wy, c]};
      ['index', 'middle', 'ring', 'little'].forEach((f, i) => {
        const x = wx - 22 + i * 15, up = i < 2;
        pts[f + 'MCP'] = [x, wy - 40, c];
        pts[f + 'PIP'] = [x, wy - 70, c];
        pts[f + 'DIP'] = [x, up ? wy - 90 : wy - 60, c];
        pts[f + 'Tip'] = [x, up ? wy - 110 : wy - 50, c];
      });
      Object.assign(pts, {thumbCMC: [wx - 20, wy - 10, c], thumbMP: [wx - 24, wy - 22, c], thumbIP: [wx - 24, wy - 32, c], thumbTip: [wx - 22, wy - 38, c]});
      hands.push({side: 'right', conf: c, pts});
    }
    samples.push({t: +t.toFixed(4), joints: {nose: [fx + fw / 2, fy + fh / 2, 0.9], leftShoulder: [fx + 1.6 * fw, fy + 1.5 * fh, 0.9], rightShoulder: [fx - 0.6 * fw, fy + 1.5 * fh, 0.9]}, hands, person: {bbox: [0, 0, 1, 1], cover: 0.3, rows}});
  }
  return {width: W, height: H, fps: 30, source: 'test-fixture', step: 1 / 15, grid: {w: GW, h: GH}, samples};
}
const withBody = (plan) => {
  const P = project(plan);
  writeJson(path.join(P.work, 'body.json'), bodyFixture());
  return P;
};
// 6. a graphic on the measured arm (far from the face, outside the old estimated body box) is caught
{
  const arm = {version: 1, items: [{id: 'on-arm', kind: 'keyword', at: {text: 'AI', near: 5.1}, text: 'AI', pos: [0.36, 0.84]}]};
  const r = await check(withBody(arm), {aspects: ['16x9'], measure: false});
  const e = r.errors.find((x) => x.id === 'on-arm' && x.what === 'person');
  assert.ok(e, 'person error: ' + JSON.stringify(r.errors));
  ok(`measured person overlap caught: ${e.msg}`);
  const auto = {version: 1, items: [{id: 'auto', kind: 'keyword', at: {text: 'AI', near: 5.1}, text: 'AI'}]};
  const r2 = await check(withBody(auto), {aspects: ['16x9', '9x16'], measure: false});
  assert.equal(r2.errors.length, 0, JSON.stringify(r2.errors));
  ok('the same graphic without "pos" is placed clear of face, body and arm: PASS in 16:9 and 9:16');
}
// 7. a tag on the hand follows the hand, keeps one side, stays off the person and hides while the hand is unsure
{
  const P = withBody({version: 1, items: []});
  const meta = readJson(path.join(P.work, 'meta.json')), face = readJson(path.join(P.work, 'face.json')), body = readJson(path.join(P.work, 'body.json'));
  const plan = {version: 1, items: [{id: 'tag', kind: 'body/hand-tag', at: 4.2, dur: 3.5, text: 'This one'}, {id: 'count', kind: 'body/finger-count', at: 4.2, dur: 1.5, text: 'One, Two, Three'}]};
  const L = layoutPlan({meta, face, body, words: {tier: 'C', captions: []}, plan, info: {}, style: getStyle('connect'), aspect: '16x9', outWidth: 1280, metas: METAS});
  const tag = L.items.find((x) => x.id === 'tag');
  assert.ok(tag.track && !tag.hidden, 'tag placed: ' + (tag.reason || ''));
  const shown = tag.track.map((x, i) => (x ? i : -1)).filter((i) => i >= 0);
  assert.ok(shown.length / tag.track.length > 0.5, `shown ${shown.length}/${tag.track.length}`);
  let jump = 0;
  for (let i = 1; i < tag.track.length; i++) if (tag.track[i] && tag.track[i - 1]) jump = Math.max(jump, Math.abs(tag.track[i].r[0] - tag.track[i - 1].r[0]), Math.abs(tag.track[i].r[1] - tag.track[i - 1].r[1]));
  assert.ok(jump < 12, `no jumps (biggest step ${jump} px)`);
  for (const i of shown) {
    const t = tag.track[i], cx = t.r[0] + t.r[2] / 2, cy = t.r[1] + t.r[3] / 2;
    assert.ok(Math.hypot(cx - t.anchor[0], cy - t.anchor[1]) < 1280 * 0.4, 'tag stays near the hand');
  }
  const unsure = tag.track.slice(Math.round(6.05 * 30) - tag.f0, Math.round(6.5 * 30) - tag.f0);
  assert.ok(unsure.every((x) => !x), 'hidden while the hand is unsure');
  ok(`hand tag follows the hand: shown ${Math.round((shown.length / tag.track.length) * 100)} %, biggest step ${jump} px, hidden while hand confidence is low`);
  const count = L.items.find((x) => x.id === 'count');
  assert.ok(count.track.filter(Boolean).every((x) => x.count === 2), 'two fingers');
  ok('finger count reads 2 raised fingers');
  const r = await check(withBody(plan), {aspects: ['16x9'], measure: false});
  assert.ok(!r.errors.some((e) => e.what === 'person' || e.what === 'face'), JSON.stringify(r.errors));
  ok('check: the hand graphics never touch the person or the face');
}
// 8. your own component: found, bundled through user.generated.tsx; a missing file is a clear sentence
{
  const P = project({version: 1, items: []});
  fs.mkdirSync(path.join(P.dir, 'my'), {recursive: true});
  fs.writeFileSync(path.join(P.dir, 'my', 'Thing.tsx'), "import React from 'react';\nexport default ({r}: any) => <div style={{position: 'absolute', left: r[0], top: r[1], width: r[2], height: r[3], background: 'teal'}} />;\n");
  const plan = {version: 1, items: [{id: 'mine', kind: 'custom', component: './my/Thing.tsx', at: 3, meta: {size: {aspect: 2, maxW: 0.2}}}]};
  const prep = prepareProject(P, plan, METAS);
  assert.equal(prep.errors.length, 0, prep.errors.join('; '));
  const gen = fs.readFileSync(path.join(KIT, 'src', 'catalog', 'user.generated.tsx'), 'utf8');
  assert.ok(gen.includes('Thing') && gen.includes('"./my/Thing.tsx"'), 'user component registered');
  const bad = prepareProject(P, {version: 1, items: [{id: 'gone', kind: 'custom', component: './my/Gone.tsx'}]}, METAS);
  assert.ok(bad.errors.some((e) => /component \.\/my\/Gone\.tsx not found/.test(e)), bad.errors.join('; '));
  prepareProject(P, {version: 1, items: []}, METAS); // leave the kit as it was
  ok('custom component: registered for the bundle; a missing file says which one');
}
// 9. every catalog meta.json follows the common contract; bad ones are refused with a reason
{
  const {metas, errors} = scanCatalog();
  assert.equal(errors.length, 0, errors.join('\n'));
  const all = Object.values(metas);
  const playable = all.filter((m) => !m.status || m.status === 'ok');
  for (const m of all) if (m.status && m.status !== 'ok') assert.ok(m.reasons?.length, `${m.kind} says why`);
  const fams = new Set(playable.map((m) => m.family));
  assert.ok(playable.length >= 40, `${playable.length} playable`);
  ok(`catalog: ${all.length} metas valid, ${playable.length} playable, ${fams.size} different designs, the rest say why not`);
  const bad = validateMeta({kind: 'remotion/x', title: 'x', description: 'x', source: {type: 'remotion'}, license: 'CC-BY-4.0', place: 'box', use: 'keyword', family: 'x', size: {aspect: 2, maxW: 0.3}}, 'x');
  assert.ok(bad.some((e) => /not allowed/.test(e)), 'CC BY refused');
  const bad2 = validateMeta({kind: 'remotion/y', title: 'y', description: 'y', source: {type: 'remotion'}, license: 'MIT', place: 'box', use: 'keyword', family: 'y', status: 'unsupported'}, 'y');
  assert.ok(bad2.some((e) => /reasons/.test(e)), 'unsupported needs reasons');
  ok('meta validation refuses CC BY and an unsupported item without reasons');
}
// 10. HyperFrames: a seekable GSAP block passes, a WebGL / CSS-animation block is listed with reasons
{
  const good = checkBlock('<div data-composition-id="a"></div><script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script><script>var tl=gsap.timeline({paused:true});window.__timelines={a:tl};</script>');
  assert.equal(good.reasons.length, 0, good.reasons.join('; '));
  const gl = checkBlock('<canvas></canvas><style>@keyframes x{}</style><script>requestAnimationFrame(f)</script>');
  assert.ok(gl.reasons.length >= 2 && gl.warnings.length >= 1, gl.reasons.join('; '));
  ok(`HyperFrames check: good block ok, bad block: ${gl.reasons.length} reasons`);
}
// 11. the same design twice in one video is flagged (no effect reuse)
{
  const twice = {version: 1, items: [{id: 'a', kind: 'remotion/rough-box', at: 2, text: 'One'}, {id: 'b', kind: 'remotion/rough-box', at: 8, text: 'Two'}]};
  const r = await check(withBody(twice), {aspects: ['16x9'], measure: false});
  assert.ok(r.advice.some((x) => x.what === 'repeat'), JSON.stringify(r.advice));
  ok('repeat design warning');
  const stacked = {version: 1, items: [{id: 'a', kind: 'remotion/rough-box', at: 2, text: 'One', pos: [0.05, 0.1]}, {id: 'b', kind: 'remotion/shapes-callout', at: 2.5, text: 'Two', pos: [0.07, 0.12]}]};
  const r2 = await check(withBody(stacked), {aspects: ['16x9'], measure: false});
  const e = r2.errors.find((x) => x.what === 'overlap');
  assert.ok(e, JSON.stringify(r2.errors));
  ok(`graphic on graphic caught: ${e.msg}`);
}
// 12. a plan line can ask for a bigger graphic ("scale") and stacked key words; the person is still never touched
{
  const lay = (items) => {
    const P = withBody({version: 1, items});
    const w = (f) => readJson(path.join(P.work, f));
    return layoutPlan({meta: w('meta.json'), face: w('face.json'), body: w('body.json'), words: w('words.json'), plan: {version: 1, items}, info: {}, style: getStyle('connect'), aspect: '16x9'});
  };
  const a = lay([{id: 'a', kind: 'remotion/rough-box', at: 2, text: 'One'}]).items[0];
  const b = lay([{id: 'a', kind: 'remotion/rough-box', at: 2, text: 'One', scale: 1.3}]).items[0];
  assert.ok(!a.hidden && !b.hidden, 'both placed');
  assert.ok(b.segments[0].r[2] > a.segments[0].r[2], `scaled box is wider (${a.segments[0].r[2]} -> ${b.segments[0].r[2]})`);
  const r = await check(withBody({version: 1, items: [{id: 'a', kind: 'remotion/rough-box', at: 2, text: 'One', scale: 1.6}]}), {aspects: ['16x9'], measure: false});
  assert.ok(!r.errors.some((x) => x.what === 'face' || x.what === 'person'), JSON.stringify(r.errors));
  ok(`"scale" makes a graphic bigger without touching the person (${a.segments[0].r[2]} -> ${b.segments[0].r[2]} px)`);
  // a fit-to-space word takes the shape of the word: a short word gets a taller box than a long one
  const short = lay([{id: 'a', kind: 'remotion/layout-fit-word', at: 2, text: 'FREE'}]).items[0];
  const long = lay([{id: 'a', kind: 'remotion/layout-fit-word', at: 2, text: 'Everything'}]).items[0];
  assert.ok(short.h / short.w > long.h / long.w, `short word box is taller for its width (${short.w}x${short.h} vs ${long.w}x${long.h})`);
  ok(`fit-to-space word: "FREE" box ${Math.round(short.w)}x${Math.round(short.h)}, "Everything" ${Math.round(long.w)}x${Math.round(long.h)}`);
  const one = lay([{id: 'k', kind: 'kit/keyword', at: 2, text: 'Visual Vibe Coding'}]).items[0];
  const two = lay([{id: 'k', kind: 'kit/keyword', at: 2, text: 'Visual\nVibe Coding'}]).items[0];
  assert.ok(!two.hidden && two.h / two.w > one.h / one.w, 'stacked key word is taller for its width');
  ok('key word stacks on a line break');
  assert.equal(getStyle('day').ink, '#14110E');
  ok('"day" style: dark ink for bright rooms');
}
// 13. text is never measured before the font is loaded (fitText keeps a wrong width for the whole render otherwise)
{
  const src = (f) => fs.readFileSync(path.join(KIT, 'src', f), 'utf8');
  assert.match(src('brand.ts'), /export const fontsReady[^\n]*waitUntilDone\(\)/, 'brand.ts exports fontsReady');
  assert.match(src('parts/FontGate.tsx'), /fontsReady\.then/, 'FontGate waits for the font');
  assert.match(src('parts/FontGate.tsx'), /delayRender/, 'FontGate holds the render');
  for (const f of ['fm/FaceMotion.tsx', 'fm/Gallery.tsx']) assert.ok((src(f).match(/<FontGate>/g) || []).length >= 1, `${f} draws its graphics inside <FontGate>`);
  // every composition that draws catalog graphics goes through FaceMotion or Gallery
  for (const f of ['fm/Showcase.tsx', 'fm/Sheet.tsx', 'fm/Readme.tsx']) assert.ok(/FaceMotion|FontGate/.test(src(f)), `${f} is gated`);
  ok('graphics wait for the font before they measure text');
}
// 14. the pointer line (body/point-ray) must stay off the body: two real moments, positions only (tests/fixtures)
{
  const fromFixture = (file, plan) => {
    const fx = readJson(path.join(KIT, 'tests', 'fixtures', file));
    const P = projectPaths(fs.mkdtempSync(path.join(os.tmpdir(), 'vm-test-')));
    writeJson(path.join(P.work, 'meta.json'), fx.meta);
    writeJson(path.join(P.work, 'face.json'), fx.face);
    writeJson(path.join(P.work, 'body.json'), fx.body);
    writeJson(path.join(P.work, 'words.json'), {tier: 'C', captions: []});
    writeJson(path.join(P.work, 'my-info.json'), {});
    writeJson(path.join(P.work, 'plan.json'), plan(fx));
    return P;
  };
  const ray = (fx) => ({version: 1, items: [{id: 'ray', kind: 'body/point-ray', at: fx.at, text: 'Word', sub: 'x'}]});
  const bad = await check(fromFixture('ray-crosses-body.json', ray), {aspects: ['16x9'], measure: false});
  const e = bad.errors.find((x) => x.id === 'ray' && x.what === 'person');
  assert.ok(e, 'a pointer line across the body is an error: ' + JSON.stringify(bad.errors));
  const good = await check(fromFixture('ray-clear.json', ray), {aspects: ['16x9'], measure: false});
  assert.ok(!good.errors.some((x) => x.id === 'ray'), JSON.stringify(good.errors));
  ok(`pointer line across the body caught: ${e.msg}`);
  // 15. type behind the person is split at a word boundary, set on both sides, and what he covers is measured
  const behind = (fx) => ({version: 1, items: [{id: 'b', kind: 'kit/keyword', at: fx.at, text: 'Open source', behind: 'head'}]});
  const Pb = fromFixture('ray-clear.json', behind);
  const w = (f) => readJson(path.join(Pb.work, f));
  const L = layoutPlan({meta: w('meta.json'), face: w('face.json'), body: w('body.json'), words: w('words.json'), plan: w('plan.json'), info: {}, style: getStyle('connect'), aspect: '16x9'});
  const it = L.items[0];
  assert.equal(it.place, 'behind');
  assert.ok(it.parts && it.parts.length >= 1 && it.parts.map((p) => p.text).join(' ') === 'Open source', JSON.stringify(it.parts));
  const rb = await check(Pb, {aspects: ['16x9'], measure: false});
  assert.ok(!rb.errors.some((x) => x.what === 'covered'), JSON.stringify(rb.errors));
  ok(`type behind the person is split around him: ${it.parts.map((p) => `"${p.text}" ${p.align === 'right' ? 'left' : 'right'}`).join(' + ')}`);
  // 16. "side": one plain word on the other side of the person, clear of him
  const Ps = fromFixture('ray-clear.json', (fx) => ({version: 1, items: [{id: 's', kind: 'remotion/shapes-pie', at: fx.at, value: '80', side: 'done'}]}));
  const ws = (f) => readJson(path.join(Ps.work, f));
  const Ls = layoutPlan({meta: ws('meta.json'), face: ws('face.json'), body: ws('body.json'), words: ws('words.json'), plan: ws('plan.json'), info: {}, style: getStyle('connect'), aspect: '16x9'});
  const sd = Ls.items[0];
  assert.ok(!sd.hidden, sd.reason);
  if (sd.side) {
    const r = sd.segments[0].r;
    assert.ok(sd.side.r[0] + sd.side.r[2] <= r[0] || sd.side.r[0] >= r[0] + r[2], 'the side word is not on the graphic');
    const rs = await check(Ps, {aspects: ['16x9'], measure: false});
    assert.ok(!rs.errors.some((x) => x.what === 'person' || x.what === 'face'), JSON.stringify(rs.errors));
  }
  ok(`side word ${sd.side ? `"${sd.side.text}" placed ${sd.side.align === 'left' ? 'right' : 'left'} of him, ${sd.side.fs} px` : 'left out (no room), with a note'}`);
  // 17. --overlay asks Remotion for ProRes 4444 with alpha (the option is "proResProfile"; a misspelt key is ignored and gives HQ, no alpha)
  const rsrc = fs.readFileSync(path.join(KIT, 'lib', 'render.mjs'), 'utf8');
  assert.ok(/proResProfile: '4444'/.test(rsrc) && !/proresProfile/.test(rsrc), 'overlay must pass proResProfile: 4444');
  ok('overlay render asks for ProRes 4444 (alpha)');
  // 18. my-info "weight" sets a heavier type weight on any look
  const sw = getStyle('connect', {weight: 500});
  assert.equal(sw.weight, 500); assert.ok(sw.heavy >= 700); assert.equal(getStyle('connect', {}).weight, getStyle('connect').weight);
  ok('my-info "weight": 500 makes the type heavier');
}
// 17. the measured rig (every joint and finger per frame) for body graphics that draw from the body itself
{
  const fx = readJson(path.join(KIT, 'tests', 'fixtures', 'ray-clear.json'));
  const fps = fx.meta.fps;
  const B = makeBody(fx.body);
  const f0 = Math.round(17 * fps), f1 = Math.round(19 * fps);
  const R = rigTrack(B, f0, f1, fps);
  assert.equal(R.length, f1 - f0, 'one rig frame per video frame');
  const seen = R.filter((r) => r.joints.leftShoulder && r.joints.rightShoulder).length;
  assert.ok(seen >= R.length * 0.9, `shoulders on most frames (${seen}/${R.length})`);
  const hands = R.filter((r) => r.hands.length);
  assert.ok(hands.length >= R.length * 0.8, `a hand on most frames (${hands.length}/${R.length})`);
  for (const r of hands) for (const h of r.hands) {
    assert.ok(h.box[2] > 0 && h.box[3] > 0, 'hand box');
    if (h.pinch != null) assert.ok(h.pinch >= 0 && h.pinch <= 1, 'pinch in 0..1');
  }
  // smoothing: frame to frame steps of a joint stay small (no 15 fps stair steps)
  const xs = R.map((r) => r.joints.leftShoulder?.[0]).filter((v) => v != null);
  const step = Math.max(...xs.slice(1).map((v, q) => Math.abs(v - xs[q])));
  assert.ok(step < 25, `shoulder glides (${step.toFixed(1)} px max step)`);
  ok(`rig per frame: ${R.length} frames, shoulders ${seen}, hands ${hands.length}, max shoulder step ${step.toFixed(1)} px`);
  // beats: lowest points right after a down stroke, never two closer than the gap
  const ys = [];
  for (let q = 0; q < 60; q++) ys.push(500 + 80 * Math.abs(Math.sin((q / 15) * Math.PI)));
  ys[30] = null;
  const beats = downBeats(ys, 40, 7);
  assert.ok(beats.length >= 3, JSON.stringify(beats));
  for (let q = 1; q < beats.length; q++) assert.ok(beats[q] - beats[q - 1] >= 7, 'gap kept');
  for (const b of beats) assert.ok(ys[b] > 560, `beat at a low point (${ys[b]})`);
  assert.deepEqual(downBeats(ys.map(() => 500), 40, 7), [], 'a still hand has no beats');
  ok(`down beats: ${beats.join(', ')}`);
  // layout hands the rig to "rig" items, and "attach: shoulder" follows the measured shoulder
  const items = [{id: 'hud', kind: 'body/shoulder-hud', at: fx.at, text: 'Data'}, {id: 'arc', kind: 'body/hand-arc', at: fx.at + 0.2, text: 'Link'}];
  const L = layoutPlan({meta: fx.meta, face: fx.face, body: fx.body, words: {tier: 'C', captions: []}, plan: {version: 1, items}, info: {}, style: getStyle('connect'), aspect: '16x9'});
  const hud = L.items.find((x) => x.id === 'hud'), arc = L.items.find((x) => x.id === 'arc');
  assert.ok(hud && !hud.hidden, hud?.reason);
  assert.ok(hud.rig && hud.rig.length && hud.track && hud.track.length, 'shoulder item has rig and track');
  const a = hud.track.find((t) => t && t.anchor)?.anchor;
  const sh = hud.rig.find((r) => r && r.joints.leftShoulder)?.joints;
  assert.ok(a && sh, 'anchor and shoulders');
  const dl = Math.min(Math.hypot(a[0] - sh.leftShoulder[0], a[1] - sh.leftShoulder[1]), Math.hypot(a[0] - sh.rightShoulder[0], a[1] - sh.rightShoulder[1]));
  assert.ok(dl < 60, `anchor on a shoulder (${dl.toFixed(0)} px)`);
  assert.ok(arc && arc.place === 'behind' && arc.rig && arc.rig.length === arc.f1 - arc.f0, 'behind rig item gets the rig for every frame');
  assert.equal(arc.matteDir, undefined, 'no matte measured, so no matte dir');
  ok(`shoulder attach follows the shoulder (${dl.toFixed(0)} px off), rig given to ${L.items.filter((x) => x.rig).length} items`);
}
console.log(`${n} passed`);
