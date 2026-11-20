// Dev tool: the catalog page examples. Every catalog graphic on a real talking-head clip, one short loop each.
//
//   node tools/make-showcase.mjs <dir> analyze            face, body, hands and words for every src/<id>/input clip
//   node tools/make-showcase.mjs <dir> plan               place every item, print where it went (no render)
//   node tools/make-showcase.mjs <dir> stills [--only a,b]   one still per item at its peak -> out/stills/
//   node tools/make-showcase.mjs <dir> render [--only a,b] [--shard 0/3] [--conc 4]   -> out/clips/<name>.mp4
//
// <dir>/showcase.json: {"sources": {"<id>": {"protect": [...], "style": "connect"}},
//                       "items": [{"kind": "remotion/rough-strike", "src": "<id>", "at": 2.1, "lead": 0.5, "tail": 0.4, "props": {...}}]}
// A transition item has "cut": {"a": ["<id>", t], "b": ["<id>", t]} instead of "src".
// Graphics are placed by the same layout engine as any render: face, body and hands are avoided, pixels of the person untouched.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {bundle} from '@remotion/bundler';
import {openBrowser, renderMedia, renderStill, selectComposition} from '@remotion/renderer';
import {analyze, findBody, projectPaths, readJson, writeJson, KIT} from '../lib/analyze.mjs';
import {buildCatalog, prepareProject} from '../lib/catalog-build.mjs';
import {meanRgb} from '../lib/ffmpeg.mjs';
import {chromiumOptions} from '../lib/render.mjs';
import {layoutPlan} from '../src/core/layout.mjs';
import {luminanceOfRgb} from '../src/core/contrast.mjs';
import {getStyle} from '../src/styles/presets.mjs';

const argv = process.argv.slice(2);
const D = path.resolve(argv[0] || '.');
const cmd = argv[1] || 'plan';
const opt = (n, d = null) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };
const flag = (n) => argv.includes('--' + n);
const spec = readJson(path.join(D, 'showcase.json'));
if (!spec) throw new Error(`no showcase.json in ${D}`);
const PUB = path.join(D, 'pub'), OUT = path.join(D, 'out');
const nameOf = (it) => it.name || it.kind.replace('/', '-');
const FPS = 30;
const srcP = (id) => projectPaths(path.join(D, 'src', id));
const srcIds = () => fs.readdirSync(path.join(D, 'src')).filter((x) => fs.existsSync(path.join(D, 'src', x, 'input')) || fs.existsSync(path.join(D, 'src', x, 'work')));

const only = opt('only') ? opt('only').split(',') : null;
const shard = opt('shard') ? opt('shard').split('/').map(Number) : null;
const pick = (items) => items.filter((it, i) => (!only || only.some((o) => nameOf(it) === o || it.kind === o || it.src === o || nameOf(it).startsWith(o))) && (!shard || i % shard[1] === shard[0]));

// one clip's data, with paths inside the shared public folder (<id>/video.mp4, <id>/matte)
const cache = {};
function dataOf(id) {
  if (cache[id]) return cache[id];
  const P = srcP(id);
  const meta = readJson(path.join(P.work, 'meta.json'));
  if (!meta) throw new Error(`source ${id}: run analyze first`);
  const body = readJson(path.join(P.work, 'body.json'));
  if (body?.matte) body.matte = {...body.matte, dir: `${id}/matte`};
  return (cache[id] = {meta: {...meta, file: `${id}/video.mp4`}, face: readJson(path.join(P.work, 'face.json')), body, info: {style: spec.sources?.[id]?.style || 'connect'}, contrast: {}});
}

const planLine = (it) => ({kind: it.kind, at: it.at, ...(it.dur ? {dur: it.dur} : {}), ...(it.props || {})});
function layoutOf(it) {
  const data = dataOf(it.src);
  const plan = {version: 1, protect: spec.sources?.[it.src]?.protect || [], items: [{id: 'g', ...planLine(it)}, ...(it.more || []).map((x, i) => ({id: 'g' + (i + 2), ...x}))]};
  return layoutPlan({meta: data.meta, face: data.face, body: data.body, words: {tier: 'C', captions: []}, plan, info: data.info, style: getStyle(data.info.style), aspect: '16x9', outWidth: 1920});
}

async function propsOf(it) {
  if (it.cut) {
    return {id: 'ShowcaseCut', props: {kind: it.kind, a: {file: `${it.cut.a[0]}/video.mp4`, t: it.cut.a[1]}, b: {file: `${it.cut.b[0]}/video.mp4`, t: it.cut.b[1]}, secs: it.secs || 4, cutAt: it.cutAt, frames: it.frames}};
  }
  const data = dataOf(it.src);
  const L = layoutOf(it);
  const g = L.items.find((x) => x.id === 'g');
  const contrast = {};
  if (g && !g.hidden && g.segments[0] && g.place !== 'behind' && !g.contour) {
    // how bright is the clip under the box: the same measurement `check` does, so the ink and the soft backing fit the spot
    const r = g.segments[0].r, s = L.scale;
    const mid = Math.round((g.f0 + g.f1) / 2) / FPS;
    try {
      const rgb = await meanRgb(path.join(srcP(it.src).work, 'video.mp4'), mid, [r[2] / s, r[3] / s, Math.max(0, r[0] / s), Math.max(0, r[1] / s)]);
      contrast['g@16x9'] = +luminanceOfRgb(rgb).toFixed(4);
    } catch {}
  }
  return {id: 'Showcase', L, props: {data: {...data, contrast}, item: planLine(it), more: it.more || [], protect: spec.sources?.[it.src]?.protect || [], lead: it.lead ?? 0.5, tail: it.tail ?? 0.4}};
}

async function getBundle() {
  if (process.cwd() !== KIT) process.chdir(KIT); // the render browser stays with the kit (never downloaded into a project folder)
  const {metas} = buildCatalog();
  const prep = prepareProject({dir: D, work: PUB}, {items: spec.items.map((it) => ({kind: it.kind}))}, metas);
  if (prep.errors.length) throw new Error(prep.errors.join('; '));
  const webpackOverride = (c) => ({...c, resolve: {...c.resolve, modules: [path.join(KIT, 'node_modules'), 'node_modules', ...((c.resolve && c.resolve.modules) || [])]}});
  const outDir = path.join(os.tmpdir(), 'vm-showcase-' + Buffer.from(D).toString('base64url').slice(-20) + '-' + process.pid);
  fs.rmSync(outDir, {recursive: true, force: true}); // the public folder is a link in there: start clean
  process.on('exit', () => fs.rmSync(outDir, {recursive: true, force: true}));
  return bundle({entryPoint: path.join(KIT, 'src', 'index.ts'), publicDir: PUB, symlinkPublicDir: true, webpackOverride, outDir});
}

function makePub() {
  fs.mkdirSync(PUB, {recursive: true});
  for (const id of srcIds()) {
    const P = srcP(id);
    if (!fs.existsSync(path.join(P.work, 'video.mp4'))) continue;
    const d = path.join(PUB, id);
    fs.mkdirSync(d, {recursive: true});
    const v = path.join(d, 'video.mp4');
    if (!fs.existsSync(v)) fs.linkSync(path.join(P.work, 'video.mp4'), v);
    const m = path.join(d, 'matte');
    if (fs.existsSync(path.join(P.work, 'matte')) && !fs.existsSync(m)) fs.symlinkSync(path.join('..', '..', 'src', id, 'work', 'matte'), m); // relative: the folder can be copied to another computer
  }
}

const say = (it, L) => {
  const g = L.items.find((x) => x.id === 'g');
  if (L.post) return `${nameOf(it).padEnd(34)} ${it.src.padEnd(4)} end card after the clip`;
  if (!g) return `${nameOf(it).padEnd(34)} ${it.src.padEnd(4)} ERROR ${L.errors.map((e) => e.msg).join('; ')}`;
  if (g.hidden) return `${nameOf(it).padEnd(34)} ${it.src.padEnd(4)} HIDDEN ${g.reason}`;
  const r = g.segments[0].r;
  const extra = g.track ? ` shown ${Math.round(g.trackShown * 100)}%` : g.segments.length > 1 ? ` (${g.segments.length} places)` : '';
  return `${nameOf(it).padEnd(34)} ${it.src.padEnd(4)} ${g.segments[0].slot.padEnd(13)} ${r.map((v) => String(Math.round(v)).padStart(4)).join(' ')}  ${(g.f0 / FPS).toFixed(1)}-${(g.f1 / FPS).toFixed(1)} s${extra}`;
};

if (cmd === 'analyze') {
  for (const id of srcIds()) {
    if (only && !only.includes(id)) continue;
    const P = srcP(id);
    console.log(id);
    await analyze(P, (s) => console.log(' ' + s));
  }
  // person matte only where a graphic goes behind him
  const want = {};
  for (const it of spec.items) {
    if (it.cut || !it.src) continue;
    const L = layoutOf(it);
    const g = L.items[0];
    if (g && g.place === 'behind') (want[it.src] ||= []).push([g.f0 / FPS - 0.6, g.f1 / FPS + 0.6]);
  }
  for (const [id, ranges] of Object.entries(want)) {
    const P = srcP(id);
    const meta = readJson(path.join(P.work, 'meta.json'));
    const j = await findBody(P, path.join(P.work, meta.file), meta, {}, (s) => console.log(` ${id}${s}`), {matte: ranges});
    if (j) writeJson(path.join(P.work, 'body.json'), j);
  }
  makePub();
} else if (cmd === 'plan') {
  for (const it of pick(spec.items)) {
    if (it.cut) { console.log(`${nameOf(it).padEnd(34)} cut  ${it.cut.a.join('@')} -> ${it.cut.b.join('@')}`); continue; }
    console.log(say(it, layoutOf(it)));
  }
} else if (cmd === 'stills' || cmd === 'render') {
  makePub();
  const serveUrl = await getBundle();
  const puppeteerInstance = await openBrowser('chrome', {chromiumOptions}); // one browser for every item
  const dirS = path.join(OUT, 'stills'), dirC = path.join(OUT, 'clips');
  fs.mkdirSync(dirS, {recursive: true});
  fs.mkdirSync(dirC, {recursive: true});
  const conc = Number(opt('conc', '4'));
  const fonts = {};
  for (const it of pick(spec.items)) {
    const name = nameOf(it);
    const clip = path.join(dirC, name + '.mp4');
    if (cmd === 'render' && !flag('force') && fs.existsSync(clip)) { console.log(`skip ${name}`); continue; }
    const t0 = Date.now();
    try {
      const {id, props, L} = await propsOf(it);
      const comp = await selectComposition({serveUrl, id, inputProps: props, chromiumOptions, puppeteerInstance});
      let peak;
      if (it.cut) peak = Math.round(comp.durationInFrames * (it.peak ?? (it.cutAt ?? 0.5)));
      else if (L.post) peak = comp.durationInFrames - 20;
      else {
        const g = comp.props.layout.items.find((x) => x.id === 'g');
        peak = Math.min(comp.durationInFrames - 1, g.f0 - comp.props.start + Math.round((g.f1 - g.f0) * (it.peak ?? 0.55)));
      }
      if (cmd === 'stills' && flag('measure') && id === 'Showcase') {
        // the real type sizes at the peak frame, read from the page itself -> out/fonts.json
        const mp = {...props, measure: true};
        const mc = await selectComposition({serveUrl, id, inputProps: mp, chromiumOptions, puppeteerInstance});
        let got = null;
        await renderStill({composition: mc, serveUrl, output: path.join(os.tmpdir(), `vm-measure-${process.pid}.jpg`), inputProps: mp, frame: peak, imageFormat: 'jpeg', chromiumOptions, puppeteerInstance, logLevel: 'error', onBrowserLog: (l) => { if (String(l.text).startsWith('VM_FONT ')) got = JSON.parse(String(l.text).slice(8)); }});
        fonts[name] = got;
      }
      if (cmd === 'stills' || flag('stills')) await renderStill({composition: comp, serveUrl, output: path.join(dirS, name + '.jpg'), inputProps: props, frame: peak, imageFormat: 'jpeg', jpegQuality: 90, chromiumOptions, puppeteerInstance, logLevel: 'error'});
      if (cmd === 'render') {
        const tmp = clip.replace(/\.mp4$/, '.part.mp4');
        await renderMedia({composition: comp, serveUrl, codec: 'h264', crf: 17, muted: true, outputLocation: tmp, inputProps: props, concurrency: conc, chromiumOptions, puppeteerInstance, logLevel: 'error', offthreadVideoCacheSizeInBytes: 1.5 * 1024 ** 3});
        fs.renameSync(tmp, clip);
        writeJson(path.join(dirC, name + '.json'), {name, kind: it.kind, src: it.src || null, cut: it.cut || null, frames: comp.durationInFrames, peak, start: comp.props.start ?? 0, rect: L?.items?.[0]?.segments?.[0]?.r || null, slot: L?.items?.[0]?.segments?.[0]?.slot || null});
      }
      console.log(`ok   ${name}  ${comp.durationInFrames} f  peak ${peak}  (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
    } catch (e) {
      console.log(`FAIL ${name}: ${String(e.message).split('\n')[0]}`);
      process.exitCode = 1;
    }
  }
  if (Object.keys(fonts).length) writeJson(path.join(OUT, 'fonts.json'), fonts);
  await puppeteerInstance.close({silent: true}).catch(() => {});
} else {
  console.log('commands: analyze | plan | stills | render');
}
