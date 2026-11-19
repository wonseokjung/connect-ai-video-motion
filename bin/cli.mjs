#!/usr/bin/env node
// connect-ai-video-motion: motion graphics on top of your own talking-head video.
// The kit never changes a face pixel and never puts anything on the detected face box.
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {KIT_NAME} from '../src/core/name.mjs';
import {analyze, projectPaths, readJson, writeJson, KIT} from '../lib/analyze.mjs';
import {draftPlan} from '../lib/plan-draft.mjs';
import {check} from '../lib/check.mjs';
import {render, renderStillComp} from '../lib/render.mjs';
import {doctor} from '../lib/doctor.mjs';
import {cliPath} from '../lib/ffmpeg.mjs';
import {installSkill, removeSkill} from '../lib/install.mjs';

const argv = process.argv.slice(2);
const flag = (n) => argv.includes('--' + n);
const opt = (n, d = null) => {
  const i = argv.indexOf('--' + n);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d;
};
const pos = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1].startsWith('--') && ['only', 'agent', 'dir', 'style'].includes(argv[i - 1].slice(2))));
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

async function full(P, {short = false, overlay = false, only = null, force = false} = {}) {
  const t = Date.now();
  log(`${KIT_NAME} · ${P.dir}`);
  log('1/4 analyze');
  await analyze(P, log);
  if (!fs.existsSync(path.join(P.dir, 'plan.json'))) {
    log('2/4 plan (first draft from the words)');
    await makePlan(P);
  } else log('2/4 plan: using your plan.json');
  sync(P);
  log('3/4 check');
  const aspects = short ? ['16x9', '9x16'] : ['16x9'];
  const r = await runCheck(P, aspects);
  if (!r.ok && !force) {
    log('4/4 render: skipped until check passes. Fix the lines above in plan.json (or add --force to see it anyway).');
    log(`    sheet + report: rendering the still sheet so you can see the problem`);
    await render(P, {media: false, short, bad: r.errors.map((e) => e.id), log: (s) => log('   ' + s)});
    return r;
  }
  log('4/4 render');
  await render(P, {short, overlay, only, bad: r.errors.map((e) => e.id), log: (s) => log('   ' + s)});
  log(`done in ${secs(t)}. Open ${path.join(P.out, 'final.mp4')}  · report: ${path.join(P.out, 'report.md')}`);
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

async function main() {
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
      await render(P, {short: flag('short'), overlay: flag('overlay'), only: opt('only'), bad: r.errors.map((e) => e.id), log: (s) => log('  ' + s)});
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
  npx ${KIT_NAME} check [folder]       face overlap, frame edges, words, contrast -> out/report.md
  npx ${KIT_NAME} plan [folder]        first plan.json from the words
  npx ${KIT_NAME} preview [folder]     Remotion Studio with face guides
  npx ${KIT_NAME} face-sheet [folder]  stills for your agent to mark the face
  npx ${KIT_NAME} doctor               check this computer
  npx ${KIT_NAME} install-skill        add the agent skill (Claude Code, Codex, Antigravity)`);
  }
}


main().catch((e) => {
  console.error(`\n${KIT_NAME}: ${e.message}`);
  process.exitCode = 1;
});
