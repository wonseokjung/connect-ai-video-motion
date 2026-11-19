// Dev tool: renders the three README demos from real kit runs.
// usage: node tools/make-readme-demos.mjs [compare,check,both] [projectDir] [outDir]
// With a project dir, all three demos use that one project (its own plan, its own check messages).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {projectPaths, readJson, writeJson, KIT} from '../lib/analyze.mjs';
import {check, loadData} from '../lib/check.mjs';
import {renderComp} from '../lib/render.mjs';

const out = process.argv[4] ? path.resolve(process.argv[4]) : path.join(KIT, 'preview');
const one = process.argv[3] ? path.resolve(process.argv[3]) : null;
fs.mkdirSync(out, {recursive: true});
const which = (process.argv[2] || 'compare,check,both').split(',');

const steps = projectPaths(one || path.join(KIT, 'projects', 'demo-steps15'));
const sd = loadData(steps);
if (which.includes('compare')) {
  // same plan, every graphic nailed to one spot (where a template would put it)
  const fixed = JSON.parse(JSON.stringify(sd.plan));
  for (const it of fixed.items) if (it.kind !== 'endcard') it.pos = one ? [0.74, 0.08] : [0.56, 0.2]; // with a real person: wrong only by running off the frame, never over the face
  await renderComp(steps, 'Readme', {kind: 'compare', a: {data: {...sd, plan: fixed}, aspect: '16x9'}, b: {data: sd, aspect: '16x9'}}, path.join(out, 'readme_1_compare.mp4'), {scale: 0.5, crf: 24});
  console.log('readme_1_compare.mp4');
}
if (which.includes('both')) {
  await renderComp(steps, 'Readme', {kind: 'both', a: {data: sd, aspect: '16x9'}, b: {data: sd, aspect: '9x16'}}, path.join(out, 'readme_3_both.mp4'), {scale: 0.5, crf: 24});
  console.log('readme_3_both.mp4');
}
if (which.includes('check')) {
  const demo = projectPaths(path.join(KIT, 'vm-demo')) // the check demo always uses the stand-in: covering a face on purpose happens only there;
  const dd = loadData(demo);
  let broken = readJson(path.join(KIT, 'tests', 'face-cover.plan.json'));
  if (false) {
    // (not used: a real person's face is never covered, even in a bad example), with its key word pushed onto the face on purpose
    broken = JSON.parse(JSON.stringify(dd.plan));
    const kw = broken.items.find((x) => x.kind === 'keyword');
    const s0 = dd.face.samples[0].box, fw = dd.face.width, fh = dd.face.height;
    kw.pos = [+(s0[0] / fw).toFixed(3), +((s0[1] + s0[3] * 0.25) / fh).toFixed(3)];
  }
  // run the real check on a temp copy so the message is the kit's own
  const tmp = projectPaths(fs.mkdtempSync(path.join(os.tmpdir(), 'vm-readme-')));
  for (const f of ['meta.json', 'face.json', 'words.json', 'my-info.json', 'contrast.json']) if (fs.existsSync(path.join(demo.work, f))) fs.copyFileSync(path.join(demo.work, f), path.join(tmp.work, f));
  writeJson(path.join(tmp.work, 'plan.json'), broken);
  const r1 = await check(tmp, {measure: false});
  const fixed = JSON.parse(JSON.stringify(broken));
  for (const x of fixed.items) delete x.pos;
  fixed.items[1].label = 'tools';
  writeJson(path.join(tmp.work, 'plan.json'), fixed);
  const r2 = await check(tmp, {measure: false});
  const msg = `FAIL · ${r1.errors.length} errors\n\n` + r1.errors.map((e) => 'ERROR ' + e.msg).join('\n\n');
  const pass = `PASS · ${r2.errors.length} errors\n\n` + r2.facts.slice(0, 3).join('\n');
  await renderComp(demo, 'Readme', {kind: 'check', a: {data: {...dd, plan: broken}, aspect: '16x9'}, b: {data: {...dd, plan: fixed}, aspect: '16x9'}, msg, pass}, path.join(out, 'readme_2_check.mp4'), {scale: 0.5, crf: 24});
  console.log('readme_2_check.mp4');
}
