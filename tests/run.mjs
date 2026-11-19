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
  for (const d of ['.claude/skills', '.agents/skills', '.gemini/config/skills']) assert.ok(fs.existsSync(path.join(home, d, 'video-motion', 'SKILL.md')), d);
  removeSkill({agent: 'all', home, env: {}, log: quiet});
  for (const d of ['.claude/skills', '.agents/skills', '.gemini/config/skills']) assert.ok(!fs.existsSync(path.join(home, d, 'video-motion')), d);
  ok('install-skill / remove-skill in a temp HOME (Claude Code, Codex, Antigravity)');
}
console.log(`${n} passed`);
