// analyze: input/ video -> work/ (proxy.mp4, meta.json, face.json, words.json). Node only.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {parseSrt} from '@remotion/captions';
import {ffmpeg, probe, grabRaw, loudness} from './ffmpeg.mjs';
import {faceFromPosition} from '../src/core/face.mjs';
import {spreadCues, vttToSrt} from '../src/core/words.mjs';
import {unpackCascade, detectFace} from '../src/vendor/pico.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const KIT = path.resolve(HERE, '..');
const VIDEO = /\.(mp4|mov|m4v|webm|mkv)$/i;

export function projectPaths(dir) {
  const p = {dir, input: path.join(dir, 'input'), work: path.join(dir, 'work'), out: path.join(dir, 'out')};
  for (const k of ['input', 'work', 'out']) fs.mkdirSync(p[k], {recursive: true});
  return p;
}
export const readJson = (f, d = null) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : d);
export const writeJson = (f, v) => fs.writeFileSync(f, JSON.stringify(v, null, 2) + '\n');

export function myInfo(P) {
  const own = readJson(path.join(P.dir, 'my-info.json')) || readJson(path.join(process.cwd(), 'my-info.json')) || readJson(path.join(KIT, 'my-info.json'), {});
  return own;
}

export async function analyze(P, log = console.log) {
  const vids = fs.readdirSync(P.input).filter((f) => VIDEO.test(f) && !f.startsWith('.'));
  if (!vids.length) throw new Error(`No video in ${P.input}. Put one video file there (mp4, mov).`);
  const src = path.join(P.input, vids[0]);
  const info = myInfo(P);
  writeJson(path.join(P.work, 'my-info.json'), info);
  const m = await probe(src);
  const notes = [];

  // 1. one clean video to work from: H.264, SDR, fixed frame rate, upright
  const needs = [];
  if (m.codec !== 'h264') needs.push(`codec ${m.codec}`);
  if (m.hdr) needs.push('HDR');
  if (m.vfr) needs.push('variable frame rate');
  if (m.rotation) needs.push(`rotated ${m.rotation} deg`);
  if (m.pixFmt && !['yuv420p', 'yuvj420p'].includes(m.pixFmt)) needs.push(m.pixFmt);
  const work = path.join(P.work, 'video.mp4');
  const stamp = `${vids[0]}:${fs.statSync(src).size}:${fs.statSync(src).mtimeMs}`;
  const prev = readJson(path.join(P.work, 'meta.json'));
  if (!(prev && prev.stamp === stamp && fs.existsSync(work))) {
    if (needs.length) {
      log(`  video: ${needs.join(', ')} -> making an H.264 SDR 30 fps copy (your original is not touched)`);
      const vf = m.hdr ? ['-vf', 'zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p'] : ['-pix_fmt', 'yuv420p'];
      await ffmpeg(['-y', '-i', src, ...vf, '-r', '30', '-c:v', 'libx264', '-crf', '16', '-preset', 'medium', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', work]);
      notes.push(`converted (${needs.join(', ')})`);
    } else {
      fs.copyFileSync(src, work);
    }
  }
  const w = await probe(work);
  const meta = {file: 'video.mp4', original: vids[0], width: w.width, height: w.height, fps: Math.round(w.fps * 100) / 100, duration: w.duration, audio: w.audio, stamp, notes};
  writeJson(path.join(P.work, 'meta.json'), meta);
  log(`  video: ${w.width}x${w.height}, ${meta.fps} fps, ${w.duration.toFixed(1)} s`);

  // 2. face
  const face = await findFace(P, work, meta, info, log);
  writeJson(path.join(P.work, 'face.json'), face);

  // 3. body: joints, hands, person area (macOS Vision; MediaPipe on other computers once its models are there)
  const body = await findBody(P, work, meta, info, log);
  if (body) writeJson(path.join(P.work, 'body.json'), body);
  else if (fs.existsSync(path.join(P.work, 'body.json'))) fs.unlinkSync(path.join(P.work, 'body.json'));

  // 4. words
  const words = await findWords(P, work, meta, log);
  writeJson(path.join(P.work, 'words.json'), words);
  return {meta, face, words, info, body};
}

async function findFace(P, video, meta, info, log) {
  const pos = info.face;
  if (['left', 'center', 'right'].includes(pos)) {
    log(`  face: "${pos}" from my-info.json (adapter d)`);
    return faceFromPosition(pos, meta.width, meta.height);
  }
  const given = readJson(path.join(P.input, 'face.json'));
  if (given?.samples?.length) {
    log(`  face: input/face.json (${given.source || 'written by hand or by your agent'})`);
    return given;
  }
  const cascade = path.join(KIT, 'models', 'facefinder');
  if (fs.existsSync(cascade)) {
    log('  face: pico detector (models/facefinder)');
    const classify = unpackCascade(new Uint8Array(fs.readFileSync(cascade)));
    const samples = [];
    const DW = 360, DH = Math.round((DW * meta.height) / meta.width / 2) * 2;
    for (let t = 0; t <= meta.duration; t += 0.5) {
      const px = new Uint8Array(await grabRaw(video, t, {w: DW}));
      const d = detectFace(classify, px, DW, DH);
      const k = meta.width / DW;
      if (d) samples.push({t: +t.toFixed(2), box: [(d[1] - d[2] * 0.62) * k, (d[0] - d[2] * 0.85) * k, d[2] * 1.24 * k, d[2] * 1.6 * k], conf: Math.min(1, d[3] / 20)});
      else samples.push({t: +t.toFixed(2), box: null, conf: 0});
    }
    return fillGaps({width: meta.width, height: meta.height, source: 'pico', samples});
  }
  if (os.platform() === 'darwin' && hasSwift()) {
    log('  face: macOS Vision (adapter a)');
    try {
      const out = execFileSync('swift', [path.join(KIT, 'lib', 'adapters', 'vision-face.swift'), video, '0.5'], {encoding: 'utf8', maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'ignore']});
      const j = JSON.parse(out.trim().split('\n').pop());
      const found = j.samples.filter((s) => s.box).length;
      if (found >= Math.max(2, j.samples.length * 0.3)) return fillGaps(j);
      log(`  face: Vision found a face in only ${found}/${j.samples.length} looks`);
    } catch (e) {
      log(`  face: Vision did not run (${String(e.message).split('\n')[0]})`);
    }
  }
  log('  face: not found. Using "center". Better: ask your agent to run `face-sheet` and write input/face.json, or set "face" in my-info.json');
  const f = faceFromPosition('center', meta.width, meta.height);
  f.source = 'guess (center)';
  return f;
}

// fill missing looks from neighbours, keep conf 0 so the layout hides graphics there
function fillGaps(j) {
  const s = j.samples;
  const ok = s.filter((x) => x.box);
  if (!ok.length) return j;
  for (const x of s) {
    if (x.box) continue;
    const a = [...ok].reverse().find((q) => q.t < x.t), b = ok.find((q) => q.t > x.t);
    x.box = (a || b).box;
    x.conf = 0;
  }
  return j;
}

// ---------- body ----------
// (a) macOS Vision: compiled once with swiftc -O into ~/.cache (about 3 s), then about 1 s per 1-2 s of video.
// (b) MediaPipe in Remotion's Chrome: needs @mediapipe/tasks-vision + 3 model files (see lib/adapters/mediapipe-body.mjs).
// (c) none: the layout estimates the body from the face box (0.1 behaviour) and plan.protect.
export async function findBody(P, video, meta, info, log = console.log, {matte = false} = {}) {
  if (info.body === false) { log('  body: off (my-info.json "body": false)'); return null; }
  const given = readJson(path.join(P.input, 'body.json'));
  if (given?.samples?.length) { log(`  body: input/body.json (${given.source || 'given'})`); return given; }
  const prev = readJson(path.join(P.work, 'body.json'));
  const stamp = readJson(path.join(P.work, 'meta.json'))?.stamp;
  // matte: false | true (every frame) | [[t0, t1], ...] (only where a graphic goes behind the person)
  const covers = (have, want) => have && (have === 'all' || (Array.isArray(want) && want.every(([a, b]) => have.some(([c, d]) => c <= a && d >= b))));
  if (prev?.stamp === stamp && prev?.samples?.length && (!matte || (prev.matte && fs.existsSync(path.join(P.work, 'matte')) && covers(prev.matte.ranges || 'all', matte === true ? null : matte)))) {
    log(`  body: ${prev.source} (cached)`);
    return prev;
  }
  if (os.platform() === 'darwin' && hasSwift()) {
    try {
      const bin = swiftBinary('vision-body');
      const mdir = matte ? path.join(P.work, 'matte') : '-';
      if (matte) fs.rmSync(mdir, {recursive: true, force: true});
      const t = Date.now();
      const ranges = Array.isArray(matte) ? matte.map(([a, b]) => `${Math.max(0, a).toFixed(2)}-${b.toFixed(2)}`).join(',') : 'all';
      const cmd = bin ? [bin, [video, '0.0667', mdir, '640', ranges]] : ['swift', [path.join(KIT, 'lib', 'adapters', 'vision-body.swift'), video, '0.0667', mdir, '640', ranges]];
      const out = execFileSync(cmd[0], cmd[1], {encoding: 'utf8', maxBuffer: 256 << 20, stdio: ['ignore', 'pipe', 'ignore']});
      const j = JSON.parse(out.trim().split('\n').pop());
      if (j.matte) {
        j.matte.dir = 'matte'; // relative to work/ (no personal paths in project files)
        j.matte.ranges = Array.isArray(matte) ? matte : 'all';
      }
      j.stamp = stamp;
      const seen = j.samples.filter((s) => s.person && s.person.cover > 0).length;
      const hands = j.samples.filter((s) => (s.hands || []).length).length;
      log(`  body: macOS Vision, ${j.samples.length} looks in ${((Date.now() - t) / 1000).toFixed(1)} s: person in ${seen}, hands in ${hands}${j.matte ? `, matte ${j.matte.count} frames` : ''}`);
      if (seen === 0) log('  body: no person found (screen recording?). Graphics only avoid the face box.');
      return j;
    } catch (e) {
      log(`  body: Vision did not run (${String(e.message).split('\n')[0]})`);
    }
  }
  const mpa = await import('./adapters/mediapipe-body.mjs');
  const {missing} = mpa.mediapipeFiles();
  if (!missing.length) {
    try {
      const j = await mpa.mediapipeBody(P, video, meta, {log});
      j.stamp = stamp;
      return j;
    } catch (e) {
      log(`  body: MediaPipe did not run (${String(e.message).split('\n')[0]})`);
    }
  }
  log(`  body: estimated from the face box (no body detector on this computer; MediaPipe needs ${missing.join(', ')}). Hands are not known: mark them in plan.protect, or see README "Body on Windows and Linux".`);
  return null;
}

// compile a Swift adapter once (swiftc -O) into the user cache; null = use the interpreter
function swiftBinary(name) {
  const src = path.join(KIT, 'lib', 'adapters', name + '.swift');
  const text = fs.readFileSync(src);
  let h = 0;
  for (const b of text) h = (h * 31 + b) >>> 0;
  const dir = path.join(os.homedir(), '.cache', 'connect-ai-video-motion');
  const bin = path.join(dir, `${name}-${h.toString(16)}`);
  if (fs.existsSync(bin)) return bin;
  try {
    fs.mkdirSync(dir, {recursive: true});
    execFileSync('swiftc', ['-O', src, '-o', bin], {stdio: 'ignore'});
    return bin;
  } catch {
    return null;
  }
}

let SWIFT;
const hasSwift = () => {
  if (SWIFT !== undefined) return SWIFT;
  try {
    execFileSync('swift', ['--version'], {stdio: 'ignore'});
    SWIFT = true;
  } catch {
    SWIFT = false;
  }
  return SWIFT;
};

async function findWords(P, video, meta, log) {
  const files = fs.readdirSync(P.input);
  const wj = files.find((f) => /\.words\.json$/i.test(f));
  if (wj) {
    const j = readJson(path.join(P.input, wj));
    const captions = Array.isArray(j) ? j : j.captions;
    log(`  words: ${wj}, ${captions.length} words with their own times (tier A)`);
    return {tier: 'A', source: wj, captions};
  }
  const sub = files.find((f) => /\.(srt|vtt)$/i.test(f));
  if (sub) {
    let text = fs.readFileSync(path.join(P.input, sub), 'utf8');
    if (/\.vtt$/i.test(sub)) text = vttToSrt(text);
    const {captions: cues} = parseSrt({input: text});
    let captions = spreadCues(cues);
    let snapped = 0;
    if (meta.audio) {
      const env = await loudness(video, 100); // 10 ms steps
      const on = onsets(env);
      captions = captions.map((c) => {
        const t = c.startMs / 10;
        let best = null;
        for (const o of on) if (Math.abs(o - t) <= 20 && (best === null || Math.abs(o - t) < Math.abs(best - t))) best = o;
        if (best === null) return c;
        snapped++;
        const d = best * 10 - c.startMs;
        return {...c, startMs: Math.round(c.startMs + d), timestampMs: Math.round(c.timestampMs + d)};
      });
      for (let i = 1; i < captions.length; i++) if (captions[i].startMs < captions[i - 1].startMs) captions[i].startMs = captions[i - 1].startMs + 20;
    }
    log(`  words: ${sub}, ${cues.length} lines -> ${captions.length} words, ${snapped} snapped to the voice (tier B, about +-0.2 s)`);
    return {tier: 'B', source: sub, captions};
  }
  log('  words: none (tier C). Put an .srt or .vtt next to the video, or give seconds in plan.json');
  return {tier: 'C', source: null, captions: []};
}

// moments where the voice starts again after a dip (10 ms steps)
function onsets(env) {
  const out = [];
  const floor = 0.08;
  let quiet = 0;
  for (let i = 1; i < env.length; i++) {
    if (env[i] < floor) quiet++;
    else {
      if (quiet >= 4 || (env[i] > env[i - 1] * 1.8 && env[i] > 0.2)) out.push(i);
      quiet = 0;
    }
  }
  return out;
}
