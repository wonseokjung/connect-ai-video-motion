// Face detector for Windows / Linux (or macOS without Swift): MediaPipe Face Detector inside Remotion's Chrome.
// Same face.json as the macOS Vision adapter, 2 looks a second, the box grown from the face to the whole head.
// Ships with the kit: @mediapipe/tasks-vision (npm dependency) and models/mediapipe/blaze_face_short_range.tflite
// (Apache-2.0, by Google, https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite).
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {renderFrames, selectComposition} from '@remotion/renderer';
import {KIT} from '../analyze.mjs';
import {ffmpeg} from '../ffmpeg.mjs';
import {getBundle, chromiumOptions} from '../render.mjs';

const require = createRequire(import.meta.url);
const MODEL = 'blaze_face_short_range.tflite';

export function mediapipeFaceFiles() {
  const models = path.join(KIT, 'models', 'mediapipe');
  let pkg = null;
  try {
    pkg = path.dirname(require.resolve('@mediapipe/tasks-vision')); // its exports map hides package.json
  } catch {}
  const need = [
    ['@mediapipe/tasks-vision (npm)', pkg && fs.existsSync(path.join(pkg, 'vision_bundle.mjs'))],
    ['models/mediapipe/' + MODEL, fs.existsSync(path.join(models, MODEL))],
  ];
  return {pkg, models, missing: need.filter((x) => !x[1]).map((x) => x[0])};
}

export async function mediapipeFace(P, video, meta, {log = console.log, step = 0.5} = {}) {
  const {pkg, models, missing} = mediapipeFaceFiles();
  if (missing.length) throw new Error('missing ' + missing.join(', '));
  // 1. the runtime and model next to the video (served by Remotion like any project file)
  const dst = path.join(P.work, 'vm-assets', 'mediapipe');
  fs.mkdirSync(path.join(dst, 'wasm'), {recursive: true});
  fs.copyFileSync(path.join(pkg, 'vision_bundle.mjs'), path.join(dst, 'vision_bundle.mjs'));
  for (const f of fs.readdirSync(path.join(pkg, 'wasm'))) fs.copyFileSync(path.join(pkg, 'wasm', f), path.join(dst, 'wasm', f));
  fs.copyFileSync(path.join(models, MODEL), path.join(dst, MODEL));
  // 2. the frames to look at (2 a second, 960 px wide)
  const fdir = path.join(P.work, 'mpf-frames');
  fs.rmSync(fdir, {recursive: true, force: true});
  fs.mkdirSync(fdir, {recursive: true});
  // -r, not the fps filter: the ffmpeg inside Remotion is built without it
  await ffmpeg(['-i', video, '-vf', 'scale=960:-2', '-r', String(Math.round(1 / step)), '-q:v', '3', path.join(fdir, 'f_%05d.jpg')]);
  const files = fs.readdirSync(fdir).filter((f) => f.endsWith('.jpg')).sort();
  const frames = files.map((f, i) => ({t: +(i * step).toFixed(3), file: `mpf-frames/${f}`}));
  // 3. one composition frame per picture; each prints its faces
  const t0 = Date.now();
  const serveUrl = await getBundle(P);
  const inputProps = {frames};
  const comp = await selectComposition({serveUrl, id: 'MediaPipeFaceProbe', inputProps, chromiumOptions});
  const got = new Map();
  let err = null;
  await renderFrames({
    composition: {...comp, durationInFrames: frames.length},
    serveUrl,
    inputProps,
    imageFormat: 'none',
    concurrency: 2,
    logLevel: 'error',
    chromiumOptions,
    outputDir: null,
    onStart: () => {},
    onFrameUpdate: () => {},
    onBrowserLog: (l) => {
      const s = String(l.text || '');
      if (s.startsWith('VMFACE ')) {
        const j = JSON.parse(s.slice(7));
        got.set(j.t, j);
      } else if (s.startsWith('VMFACE_ERROR ')) err = s.slice(13);
    },
  });
  fs.rmSync(fdir, {recursive: true, force: true});
  if (!got.size) throw new Error(err || 'no results');
  // the biggest face in each look (as the Vision adapter does), grown to the whole head (hair, ears).
  // Same grow as vision-face.swift; BlazeFace's box sits a little lower than Vision's, so it moves up 0.07 more.
  const samples = frames.map((f) => {
    const j = got.get(f.t);
    const best = (j?.faces || []).sort((a, b) => b[2] * b[3] - a[2] * a[3])[0];
    if (!best) return {t: f.t, box: null, conf: 0};
    const k = meta.width / j.w;
    const [x, y, w, h, score] = best;
    return {t: f.t, box: [+((x - w * 0.12) * k).toFixed(1), +((y - h * 0.42) * k).toFixed(1), +(w * 1.24 * k).toFixed(1), +(h * 1.5 * k).toFixed(1)], conf: +score.toFixed(3)};
  });
  log(`  face: MediaPipe found a face in ${samples.filter((s) => s.box).length}/${samples.length} looks (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  return {width: meta.width, height: meta.height, source: 'mediapipe-face', samples};
}
