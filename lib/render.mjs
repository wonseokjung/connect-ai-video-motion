// render: one bundle, then final.mp4 (+ overlay.mov, short_9x16.mp4) and sheet.jpg. Remotion does all of it.
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import {bundle} from '@remotion/bundler';
import {renderMedia, renderStill, selectComposition} from '@remotion/renderer';
import {KIT} from './analyze.mjs';
import {loadData} from './check.mjs';
import {buildCatalog, prepareProject} from './catalog-build.mjs';

// WebGL graphics (three.js, light leaks) need a GPU-backed browser: ANGLE works on macOS, Windows and Linux.
export const chromiumOptions = {gl: 'angle'};
// your own components may live anywhere: let webpack find remotion / react in the kit's node_modules
const webpackOverride = (c) => ({...c, resolve: {...c.resolve, modules: [path.join(KIT, 'node_modules'), 'node_modules', ...((c.resolve && c.resolve.modules) || [])]}});

let cached = null;
export async function getBundle(P, {plan = null} = {}) {
  // Remotion keeps its browser in the node_modules/.remotion of the folder it runs from: run from the kit, so a
  // project folder never gets its own 90 MB copy
  if (process.cwd() !== KIT) process.chdir(KIT);
  const {metas} = buildCatalog();
  const prep = prepareProject(P, plan || loadData(P).plan || {items: []}, metas);
  if (prep.errors.length) throw new Error('plan: ' + prep.errors.join('; '));
  const key = P.work + '|' + prep.users.map((x) => x.abs).join('|');
  if (cached && cached.key === key) return cached.url;
  const url = await bundle({entryPoint: path.join(KIT, 'src', 'index.ts'), publicDir: P.work, webpackOverride, outDir: path.join(os.tmpdir(), 'vm-bundle-' + Buffer.from(P.work).toString('base64url').slice(-24))});
  cached = {key, url};
  return url;
}

const conc = Math.max(2, Math.min(8, Math.floor(os.cpus().length / 2)));

export async function render(P, {overlay = false, short = false, scale = 1, only = null, bad = [], log = console.log, sheet = true, media = true} = {}) {
  const serveUrl = await getBundle(P);
  const data = loadData(P);
  const outs = [];
  const job = async (id, props, file, extra = {}) => {
    const inputProps = {data, ...props};
    const comp = await selectComposition({serveUrl, id, inputProps, chromiumOptions});
    let frameRange = null;
    if (only) {
      const it = comp.props.layout.items.find((x) => x.id === only);
      if (!it) throw new Error(`--only ${only}: no such id in plan.json`);
      frameRange = [Math.max(0, it.f0 - 15), Math.min(comp.durationInFrames - 1, it.f1 + 15)];
    }
    const t = Date.now();
    await renderMedia({composition: comp, serveUrl, codec: 'h264', crf: 18, outputLocation: file, inputProps, concurrency: conc, scale, frameRange, chromiumOptions, ...extra, logLevel: 'error'});
    log(`  ${path.relative(P.dir, file)}  (${((Date.now() - t) / 1000).toFixed(0)} s)`);
    outs.push(file);
  };
  const tag = only ? `_only_${only}` : '';
  if (media) await job('FaceMotion', {aspect: '16x9', mode: 'final', guides: false, showWords: false}, path.join(P.out, `final${tag}.mp4`));
  if (media && overlay) await job('FaceMotion', {aspect: '16x9', mode: 'overlay', guides: false}, path.join(P.out, `overlay${tag}.mov`), {codec: 'prores', proresProfile: '4444', pixelFormat: 'yuva444p10le', imageFormat: 'png', crf: undefined});
  if (media && short) await job('FaceMotionShort', {aspect: '9x16', mode: 'final', guides: false}, path.join(P.out, `short_9x16${tag}.mp4`));
  if (sheet) {
    for (const [aspect, name] of [['16x9', 'sheet'], ...(short ? [['9x16', 'sheet_9x16']] : [])]) {
      const inputProps = {data, aspect, mode: 'final', guides: true, bad, only, title: `${path.basename(P.dir)} · ${aspect} · enter / peak / exit · red = check error`};
      const comp = await selectComposition({serveUrl, id: 'Sheet', inputProps});
      const file = path.join(P.out, `${name}${tag}.jpg`);
      await renderStill({composition: comp, serveUrl, output: file, inputProps, imageFormat: 'jpeg', jpegQuality: 88, chromiumOptions, logLevel: 'error'});
      log(`  ${path.relative(P.dir, file)}`);
      outs.push(file);
    }
  }
  return outs;
}

export async function renderComp(P, id, props, file, extra = {}) {
  const serveUrl = await getBundle(P, {plan: extra.plan});
  delete extra.plan;
  const comp = await selectComposition({serveUrl, id, inputProps: props});
  await renderMedia({composition: comp, serveUrl, codec: 'h264', crf: 18, outputLocation: file, inputProps: props, concurrency: conc, chromiumOptions, logLevel: 'error', ...extra});
  return file;
}
export async function renderStillComp(P, id, props, file, {plan = null, frame = 0} = {}) {
  const serveUrl = await getBundle(P, {plan});
  const comp = await selectComposition({serveUrl, id, inputProps: props});
  await renderStill({composition: comp, serveUrl, output: file, inputProps: props, frame, imageFormat: 'jpeg', jpegQuality: 88, chromiumOptions, logLevel: 'error'});
  return file;
}
export {fs};
