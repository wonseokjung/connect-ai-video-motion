#!/usr/bin/env node
// connect-ai-video-motion: motion graphics on top of your own talking-head video.
// The kit never changes a face pixel and never puts anything on the detected face box.
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {KIT_NAME} from '../src/core/name.mjs';
import {analyze, projectPaths, readJson, writeJson, KIT, findBody} from '../lib/analyze.mjs';
import {buildCatalog, scanCatalog} from '../lib/catalog-build.mjs';
import {renderComp, chromiumOptions} from '../lib/render.mjs';
import {loadData} from '../lib/check.mjs';
import {draftPlan} from '../lib/plan-draft.mjs';
import {check} from '../lib/check.mjs';
import {render, renderStillComp} from '../lib/render.mjs';
import {doctor} from '../lib/doctor.mjs';
import {cliPath} from '../lib/ffmpeg.mjs';
import {installSkill, removeSkill} from '../lib/install.mjs';
import {importHyperFrames} from '../lib/hf-import.mjs';
import {banner, gold, dimmed, tint} from '../lib/banner.mjs';

const argv = process.argv.slice(2);
const flag = (n) => argv.includes('--' + n);
if (flag('verbose')) process.env.VM_VERBOSE = '1'; // debugging: print what the face probe sees, frame by frame
const opt = (n, d = null) => {
  const i = argv.indexOf('--' + n);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d;
};
const pos = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1].startsWith('--') && ['only', 'agent', 'dir', 'style', 'source', 'secs', 'out', 'prefix', 'license'].includes(argv[i - 1].slice(2))));
const cmd = pos[0] || 'help';
const log = (...a) => console.log(...a);
const secs = (t) => ((Date.now() - t) / 1000).toFixed(1) + ' s';

// plan.json and my-info.json live in the project folder (easy to edit); work/ gets a copy for the preview.
function sync(P) {
  for (const f of ['plan.json', 'my-info.json']) {
    const a = path.join(P.dir, f);
    if (fs.existsSync(a)) fs.copyFileSync(a, path.join(P.work, f));
  }
}

async function makePlan(P, {force = false} = {}) {
  const words = readJson(path.join(P.work, 'words.json'));
  const info = readJson(path.join(P.work, 'my-info.json'), {});
  const plan = draftPlan(words, info);
  const target = path.join(P.dir, 'plan.json');
  if (fs.existsSync(target) && !force) {
    writeJson(path.join(P.dir, 'plan.draft.json'), plan);
    log(`  plan: kept your plan.json (new draft in plan.draft.json)`);
  } else {
    writeJson(target, plan);
    log(`  plan: ${plan.items.length} graphics from what was said:`);
    for (const it of plan.items) log(`    ${it.id.padEnd(12)} ${it.at ? `"${it.at.text}" ${it.at.near}s` : '(after the video)'}  -> ${it.text || it.value || ''}${it.unit ? ' ' + it.unit : ''}`);
    for (const s of plan.suggestions || []) log(`    (needs a target) ${s.kind} "${s.text}" at ${s.at.near}s`);
  }
  sync(P);
}

async function runCheck(P, aspects) {
  sync(P);
  const t = Date.now();
  const r = await check(P, {aspects});
  log(`  check: ${r.ok ? 'PASS' : 'FAIL'}  ${r.errors.length} error, ${r.advice.length} advice  (${secs(t)})`);
  for (const e of r.errors) log(`    ERROR  ${e.msg}`);
  for (const a of r.advice) log(`    advice ${a.msg}`);
  return r;
}

// graphics behind the person need the person matte (one PNG per frame): made only when the plan asks for it
async function ensureMatte(P, r, need = r?.layouts?.['16x9']?.needsMatte) {
  if (!need) return;
  // only the stretches where something goes behind the person (+0.5 s), so a long video does not get a PNG per frame
  const L = r?.layouts?.['16x9'];
  const want = L ? L.items.filter((it) => it.place === 'behind' && !it.hidden).map((it) => [it.f0 / L.fps - 0.5, it.f1 / L.fps + 0.5]) : true;
  const body = readJson(path.join(P.work, 'body.json'));
  const ranges = body?.matte?.ranges || 'all';
  if (body?.matte && fs.existsSync(path.join(P.work, 'matte')) && (ranges === 'all' || (Array.isArray(want) && want.every(([a, b]) => ranges.some(([c, d]) => c <= a && d >= b))))) return;
  log('  matte: a graphic goes behind you, making the person matte');
  const meta = readJson(path.join(P.work, 'meta.json'));
  const j = await findBody(P, path.join(P.work, meta.file), meta, readJson(path.join(P.work, 'my-info.json'), {}), (x) => log('  ' + x.trim()), {matte: want});
  if (j) writeJson(path.join(P.work, 'body.json'), j);
}

async function full(P, {short = false, overlay = false, only = null, force = false} = {}) {
  const t = Date.now();
  log(dimmed(`${KIT_NAME} · ${P.dir}`));
  log(tint(0, 4, '● 1/4 analyze'));
  await analyze(P, log);
  if (!fs.existsSync(path.join(P.dir, 'plan.json'))) {
    log(tint(1, 4, '● 2/4 plan (first draft from the words)'));
    await makePlan(P);
  } else log(tint(1, 4, '● 2/4 plan: using your plan.json'));
  sync(P);
  log(tint(2, 4, '● 3/4 check'));
  const aspects = short ? ['16x9', '9x16'] : ['16x9'];
  const r = await runCheck(P, aspects);
  if (!r.ok && !force) {
    log('4/4 render: skipped until check passes. Fix the lines above in plan.json (or add --force to see it anyway).');
    log(`    sheet + report: rendering the still sheet so you can see the problem`);
    await render(P, {media: false, short, bad: r.errors.map((e) => e.id), log: (s) => log('   ' + s)});
    return r;
  }
  await ensureMatte(P, r);
  log(tint(3, 4, '● 4/4 render'));
  await render(P, {short, overlay, only, bad: r.errors.map((e) => e.id), log: (s) => log('   ' + s)});
  log('\n' + gold(`Done in ${secs(t)}.`) + ` Open ${path.join(P.out, 'final.mp4')}  ` + dimmed(`· report: ${path.join(P.out, 'report.md')}`));
  return r;
}

const projectDir = (d) => path.resolve(d || '.');

// `connect-ai-video-motion my-talk.mp4`: a video file instead of a command makes a project folder next to it and runs everything
const VIDEO = /\.(mp4|mov|m4v|mkv|webm)$/i;
async function fromFile(file) {
  const src = path.resolve(file);
  const dir = path.join(path.dirname(src), path.basename(src).replace(VIDEO, '') + '-video-motion');
  const P = projectPaths(dir);
  const to = path.join(P.input, path.basename(src));
  if (!fs.existsSync(to)) fs.copyFileSync(src, to);
  for (const ext of ['.srt', '.vtt', '.words.json']) {
    const side = src.replace(VIDEO, ext);
    if (fs.existsSync(side) && !fs.existsSync(path.join(P.input, path.basename(side)))) fs.copyFileSync(side, path.join(P.input, path.basename(side)));
  }
  if (!fs.existsSync(path.join(P.dir, 'my-info.json'))) fs.copyFileSync(path.join(KIT, 'my-info.json'), path.join(P.dir, 'my-info.json'));
  log(`project folder: ${P.dir} (your video was copied, the original is not touched)`);
  return full(P, {short: flag('short'), overlay: flag('overlay'), only: opt('only'), force: flag('force')});
}

const BANNER_CMDS = new Set(['demo', 'run', 'help', 'doctor', 'install-skill', 'catalog']);
function hello() {
  log(banner());
  log('  ' + 'Motion graphics on top of your own video. ' + gold('Never on your face.'));
  log('');
}

async function main() {
  if ((BANNER_CMDS.has(cmd) || VIDEO.test(cmd) || !['check','plan','preview','face-sheet','hf-import','gallery','body-sheet','remove-skill','studio'].includes(cmd)) && !flag('quiet')) hello();
  if (VIDEO.test(cmd) && fs.existsSync(cmd)) return fromFile(cmd);
  switch (cmd) {
    case 'demo': {
      // built-in 12 s sample: stand-in footage + synthetic voice + subtitles. No agent, no setup.
      const P = projectPaths(projectDir(pos[1] || 'vm-demo'));
      for (const f of fs.readdirSync(path.join(KIT, 'public', 'sample'))) {
        const to = f === 'my-info.json' ? path.join(P.dir, f) : path.join(P.input, f);
        if (!fs.existsSync(to)) fs.copyFileSync(path.join(KIT, 'public', 'sample', f), to);
      }
      await full(P, {short: flag('short'), overlay: flag('overlay'), force: flag('force')});
      break;
    }
    case 'run':
      await full(projectPaths(projectDir(pos[1])), {short: flag('short'), overlay: flag('overlay'), only: opt('only'), force: flag('force')});
      break;
    case 'analyze':
      await analyze(projectPaths(projectDir(pos[1])), log);
      break;
    case 'plan':
      await makePlan(projectPaths(projectDir(pos[1])), {force: flag('force')});
      break;
    case 'check': {
      const r = await runCheck(projectPaths(projectDir(pos[1])), flag('short') ? ['16x9', '9x16'] : ['16x9']);
      process.exitCode = r.ok ? 0 : 1;
      break;
    }
    case 'render': {
      const P = projectPaths(projectDir(pos[1]));
      sync(P);
      const r = await runCheck(P, flag('short') ? ['16x9', '9x16'] : ['16x9']);
      if (!r.ok && !flag('force')) { process.exitCode = 1; break; }
      await ensureMatte(P, r);
      await render(P, {short: flag('short'), overlay: flag('overlay'), only: opt('only'), bad: r.errors.map((e) => e.id), log: (s) => log('  ' + s)});
      break;
    }
    case 'catalog': {
      // every graphic you can call with one "kind", checked against the common meta.json contract
      const {metas, errors} = buildCatalog();
      const all = Object.values(metas);
      if (flag('json')) { console.log(JSON.stringify(all, null, 1)); break; }
      const by = {};
      for (const m of all) (by[m.kind.split('/')[0]] ||= []).push(m);
      for (const [src, list] of Object.entries(by)) {
        log(`\n${src} (${list.length})`);
        for (const m of list) {
          log(`  ${m.kind.padEnd(38)} ${m.status && m.status !== 'ok' ? '[' + m.status + '] ' : ''}${m.use.padEnd(9)} ${m.place.padEnd(7)} ${m.license}`);
          for (const r of m.reasons || []) log(`      why: ${r}`);
        }
      }
      const ok = all.filter((m) => !m.status || m.status === 'ok').length;
      log(`\n${ok} ready, ${all.length - ok} listed but not playable.`);
      log(`${all.length} graphics. Use one in plan.json: {"kind": "<kind>", "at": {"text": "word", "near": 3.2}, "text": "..."}`);
      log('Your own: {"kind": "custom", "component": "./my/Thing.tsx"} · {"kind": "hyperframes", "src": "./block.html"} · {"kind": "lottie", "src": "./anim.json"}');
      for (const e of errors) log('  problem: ' + e);
      process.exitCode = errors.length ? 1 : 0;
      break;
    }
    case 'hf-import': {
      // HyperFrames blocks (registry checkout, template folder or your own .html) -> catalog/hyperframes/<name>/
      if (!pos[1]) { log('usage: hf-import <folder> [--dry] [--prefix my-] [--license Apache-2.0]'); process.exitCode = 1; break; }
      const res = importHyperFrames(pos[1], {dry: flag('dry'), prefix: opt('prefix', ''), license: opt('license', 'Apache-2.0')});
      for (const x of res) {
        log(`  ${x.kind.padEnd(44)} ${x.status}`);
        for (const r of x.reasons) log(`      why: ${r}`);
        for (const w of x.warnings) log(`      note: ${w}`);
      }
      log(`${res.filter((x) => x.status === 'ok').length} of ${res.length} blocks can play frame by frame.${flag('dry') ? ' (dry run: nothing written)' : ' Tune window / crop / text in each meta.json, then run gallery --source hyperframes.'}`);
      break;
    }
    case 'gallery': {
      // the whole catalog, 2 s each (graphics that need a person run on the project video)
      const P = projectPaths(projectDir(pos[1] || 'vm-demo'));
      sync(P);
      const {metas} = buildCatalog();
      const kinds = opt('source') ? opt('source').split(',') : [];
      const hasVideo = fs.existsSync(path.join(P.work, 'meta.json'));
      // graphics that go behind the person need the person matte of the project video
      if (hasVideo) await ensureMatte(P, null, Object.values(metas).some((m) => m.place === 'behind' && (!kinds.length || kinds.some((k) => m.kind.startsWith(k)))));
      const data = hasVideo ? loadData(P) : null;
      const plan = {items: Object.keys(metas).map((k) => ({kind: k}))};
      const gsecs = Number(opt('secs', '2'));
      const t = Date.now();
      if (flag('sheet') || flag('both')) {
        const f = path.join(P.out, `gallery${kinds.length ? '_' + kinds.join('_').replace(/[\/]/g, '-') : ''}_sheet.jpg`);
        await renderStillComp(P, 'GallerySheet', {data, kinds, secs: gsecs, sheet: true}, f, {plan});
        log(`  ${f}`);
      }
      if (!flag('sheet')) {
        const f = path.join(P.out, `gallery${kinds.length ? '_' + kinds.join('_').replace(/[\/]/g, '-') : ''}.mp4`);
        await renderComp(P, 'Gallery', {data, kinds, secs: gsecs}, f, {plan, crf: 23});
        log(`  ${f}  (${secs(t)})`);
      }
      break;
    }
    case 'body-sheet': {
      // stills that show what the body detector found (person area, shoulders, arms, hands, finger count)
      const P = projectPaths(projectDir(pos[1]));
      const data = loadData(P);
      const f = path.join(P.out, 'body-sheet.jpg');
      await renderStillComp(P, 'BodySheet', {data}, f);
      log(`  ${f}`);
      break;
    }
    case 'face-sheet': {
      // adapter (c): stills with a pixel grid, for your agent to read and write input/face.json
      const P = projectPaths(projectDir(pos[1]));
      sync(P);
      const file = path.join(P.out, 'face-sheet.jpg');
      await renderStillComp(P, 'FaceSheet', {meta: readJson(path.join(P.work, 'meta.json'))}, file);
      log(`  ${file}\n  Agent: look at each still, write input/face.json as {"width":W,"height":H,"source":"agent","samples":[{"t":0,"box":[x,y,w,h]}]} (head incl. hair), then run analyze again.`);
      break;
    }
    case 'preview': {
      const P = projectPaths(projectDir(pos[1]));
      sync(P);
      spawn(process.execPath, [cliPath(), 'studio', path.join(KIT, 'src', 'index.ts'), '--public-dir', P.work], {stdio: 'inherit', cwd: KIT});
      break;
    }
    case 'doctor':
      process.exitCode = (await doctor(log)) ? 0 : 1;
      break;
    case 'install-skill':
      installSkill({agent: opt('agent', 'all'), dir: opt('dir'), project: flag('project'), dryRun: flag('dry-run'), log});
      break;
    case 'remove-skill':
      removeSkill({agent: opt('agent', 'all'), dir: opt('dir'), project: flag('project'), dryRun: flag('dry-run'), log});
      break;
    default:
      log(`${KIT_NAME}: motion graphics on top of your own talking-head video.
It reads where the face is and what is said, places graphics beside the face (never on it),
and checks its own work. It does not filter, retouch or change faces.

  npx ${KIT_NAME} demo                 built-in 12 s sample, start to finish, no agent needed
  npx ${KIT_NAME} <video.mp4>          your video: makes <video>-video-motion/ next to it and runs everything
  npx ${KIT_NAME} run [folder]         your video: put it in <folder>/input/ (plus .srt/.vtt if you have one)
      --short   also a 9:16 version     --overlay  also a transparent overlay.mov for Premiere / CapCut / DaVinci
      --only <id>  re-render one graphic --force   render even if check fails
      --verbose    print what the face probe sees, frame by frame (or VM_VERBOSE=1)
  npx ${KIT_NAME} check [folder]       face overlap, frame edges, words, contrast -> out/report.md
  npx ${KIT_NAME} plan [folder]        first plan.json from the words
  npx ${KIT_NAME} preview [folder]     Remotion Studio with face guides
  npx ${KIT_NAME} face-sheet [folder]  stills for your agent to mark the face
  npx ${KIT_NAME} catalog              every graphic you can call (Remotion, HyperFrames, Lottie, kit, body)
  npx ${KIT_NAME} hf-import <folder>   HyperFrames blocks -> catalog items (unsupported ones listed with reasons)
  npx ${KIT_NAME} gallery [folder]     render the catalog, 2 s each (--source remotion, --sheet for one still sheet)
  npx ${KIT_NAME} body-sheet [folder]  stills of what the body detector found
  npx ${KIT_NAME} doctor               check this computer
  npx ${KIT_NAME} install-skill        add the agent skill (Claude Code, Codex, Antigravity)`);
  }
}


main().catch((e) => {
  console.error(`\n${KIT_NAME}: ${e.message}`);
  process.exitCode = 1;
});
