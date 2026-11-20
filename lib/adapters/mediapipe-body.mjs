// Body detector for Windows / Linux (or macOS without Swift): MediaPipe Pose + Hands inside Remotion's Chrome.
// Same body.json as the macOS Vision adapter (joints, hands with 21 points, person grid 64x36), at 15 looks a second.
// No person matte PNGs here: graphics that go behind the person stay hidden (check says so).
//
// It needs files that are NOT installed with the kit (download them once; all Apache-2.0, by Google):
//   npm install @mediapipe/tasks-vision                       -> node_modules/@mediapipe/tasks-vision (wasm + vision_bundle.mjs)
//   models/mediapipe/pose_landmarker_lite.task                 https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task
//   models/mediapipe/hand_landmarker.task                      https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {renderFrames, selectComposition} from '@remotion/renderer';
import {KIT} from '../analyze.mjs';
import {ffmpeg} from '../ffmpeg.mjs';
import {getBundle, chromiumOptions} from '../render.mjs';

const require = createRequire(import.meta.url);

export function mediapipeFiles() {
  const models = path.join(KIT, 'models', 'mediapipe');
  let pkg = null;
  try {
    pkg = path.dirname(require.resolve('@mediapipe/tasks-vision/package.json'));
  } catch {}
  const need = [
    ['@mediapipe/tasks-vision (npm)', pkg && fs.existsSync(path.join(pkg, 'vision_bundle.mjs'))],
    ['models/mediapipe/pose_landmarker_lite.task', fs.existsSync(path.join(models, 'pose_landmarker_lite.task'))],
    ['models/mediapipe/hand_landmarker.task', fs.existsSync(path.join(models, 'hand_landmarker.task'))],
  ];
  return {pkg, models, missing: need.filter((x) => !x[1]).map((x) => x[0])};
}

export async function mediapipeBody(P, video, meta, {log = console.log, step = 1 / 15} = {}) {
  const {pkg, models, missing} = mediapipeFiles();
  if (missing.length) throw new Error('missing ' + missing.join(', '));
  // 1. the runtime and models next to the video (served by Remotion like any project file)
  const dst = path.join(P.work, 'vm-assets', 'mediapipe');
  fs.mkdirSync(path.join(dst, 'wasm'), {recursive: true});
  fs.copyFileSync(path.join(pkg, 'vision_bundle.mjs'), path.join(dst, 'vision_bundle.mjs'));
  for (const f of fs.readdirSync(path.join(pkg, 'wasm'))) fs.copyFileSync(path.join(pkg, 'wasm', f), path.join(dst, 'wasm', f));
  for (const f of ['pose_landmarker_lite.task', 'hand_landmarker.task']) fs.copyFileSync(path.join(models, f), path.join(dst, f));
  // 2. the frames to look at (15 a second, 640 px wide is enough for joints and hands)
  const fdir = path.join(P.work, 'mp-frames');
  fs.rmSync(fdir, {recursive: true, force: true});
  fs.mkdirSync(fdir, {recursive: true});
  await ffmpeg(['-i', video, '-vf', `fps=${Math.round(1 / step)},scale=640:-2`, '-q:v', '3', path.join(fdir, 'f_%05d.jpg')]);
  const files = fs.readdirSync(fdir).filter((f) => f.endsWith('.jpg')).sort();
  const frames = files.map((f, i) => ({t: +(i * step).toFixed(4), file: `mp-frames/${f}`}));
  // 3. one composition frame per picture; each prints its result
  const t0 = Date.now();
  const serveUrl = await getBundle(P);
  const inputProps = {frames, width: meta.width, height: meta.height};
  const comp = await selectComposition({serveUrl, id: 'MediaPipeProbe', inputProps, chromiumOptions});
  const got = new Map();
  let err = null;
  await renderFrames({
    composition: {...comp, durationInFrames: frames.length},
    serveUrl,
    inputProps,
    imageFormat: 'none',
    concurrency: 2,
    chromiumOptions,
    outputDir: null,
    onStart: () => {},
    onFrameUpdate: () => {},
    onBrowserLog: (l) => {
      const s = String(l.text || '');
      if (s.startsWith('VMBODY ')) {
        const j = JSON.parse(s.slice(7));
        got.set(j.t, j);
      } else if (s.startsWith('VMBODY_ERROR ')) err = s.slice(13);
    },
  });
  fs.rmSync(fdir, {recursive: true, force: true});
  if (!got.size) throw new Error(err || 'no results');
  const samples = frames.map((f) => got.get(f.t) || {t: f.t, joints: {}, hands: [], person: null});
  const hands = samples.filter((s) => s.hands.length).length;
  log(`  body: MediaPipe, ${samples.length} looks in ${((Date.now() - t0) / 1000).toFixed(1)} s: person in ${samples.filter((s) => s.person?.cover > 0).length}, hands in ${hands} (no matte: graphics behind the person stay hidden)`);
  return {width: meta.width, height: meta.height, fps: meta.fps, source: 'mediapipe-body', step, grid: {w: 64, h: 36}, samples};
}
