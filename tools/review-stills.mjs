// dev: re-check the demo projects, render their sheets (no video), and one large peak still per graphic kind
// (no guides) into projects/_review/. usage: node tools/review-stills.mjs
import path from 'node:path';
import fs from 'node:fs';
import {selectComposition, renderStill} from '@remotion/renderer';
import {projectPaths, KIT} from '../lib/analyze.mjs';
import {check, loadData} from '../lib/check.mjs';
import {render, getBundle} from '../lib/render.mjs';

const OUT = path.join(KIT, 'projects', '_review');
fs.mkdirSync(OUT, {recursive: true});
const jobs = [
  {dir: 'vm-demo', short: false},
  {dir: 'projects/demo-intro20', short: false},
  {dir: 'projects/demo-steps15', short: true},
  {dir: 'projects/demo-screen20', short: true},
];
const done = new Set();
for (const j of jobs) {
  const P = projectPaths(path.join(KIT, j.dir));
  for (const f of ['plan.json', 'my-info.json']) if (fs.existsSync(path.join(P.dir, f))) fs.copyFileSync(path.join(P.dir, f), path.join(P.work, f));
  const res = await check(P, {aspects: j.short ? ['16x9', '9x16'] : ['16x9']});
  console.log(`${j.dir}: ${res.ok ? 'PASS' : 'FAIL ' + res.errors.map((e) => e.msg).join(' | ')} · advice ${res.advice.length}`);
  for (const a of res.advice) console.log('   advice: ' + a.msg);
  await render(P, {media: false, short: j.short, log: (s) => console.log(s)});
  const serveUrl = await getBundle(P);
  const data = loadData(P);
  for (const aspect of j.short ? ['16x9', '9x16'] : ['16x9']) {
    const L = res.layouts[aspect];
    const id = aspect === '9x16' ? 'FaceMotionShort' : 'FaceMotion';
    const props = {data, aspect, mode: 'final', guides: false, showWords: false};
    const comp = await selectComposition({serveUrl, id, inputProps: props});
    const scale = 1920 / comp.width;
    const picks = L.items.filter((it) => !it.hidden).map((it) => ({kind: it.kind, f: Math.round(it.f0 + Math.min(36, (it.f1 - it.f0) * 0.55))}));
    if (L.postFrames) picks.push({kind: 'endcard', f: L.total - 20});
    for (const p of picks) {
      const key = `${p.kind}${aspect === '9x16' ? '_9x16' : ''}`;
      if (done.has(key)) continue;
      done.add(key);
      const file = path.join(OUT, `${key}.jpg`);
      await renderStill({composition: comp, serveUrl, output: file, inputProps: props, frame: Math.min(comp.durationInFrames - 1, p.f), scale: aspect === '9x16' ? 1 : scale, imageFormat: 'jpeg', jpegQuality: 90, logLevel: 'error'});
      console.log('  review ' + path.relative(KIT, file));
    }
  }
}
