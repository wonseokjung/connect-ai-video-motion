// Dev tool: the catalog page (docs/index.html) from the showcase clips.
//   node tools/make-docs.mjs <showcase dir> [--no-encode]
// Reads <dir>/showcase.json + <dir>/out/clips/*.mp4 + out/stills/*.jpg (made by tools/make-showcase.mjs), writes
//   docs/clips/<name>.mp4   960x540 h264, no sound, small (hover / in-view loops)
//   docs/posters/<name>.jpg the peak frame
//   docs/hero.mp4 + hero.jpg  a montage cut on a steady beat
//   docs/index.html         static page, data inside (works from a file, GitHub Pages or any static host)
// Only graphics that really play are on the page; the ones that cannot (yet) are listed with their reason.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {KIT, readJson} from '../lib/analyze.mjs';
import {buildCatalog} from '../lib/catalog-build.mjs';
import {ffmpeg} from '../lib/ffmpeg.mjs';

const argv = process.argv.slice(2);
const D = path.resolve(argv[0] || '.');
const encode = !argv.includes('--no-encode');
const spec = readJson(path.join(D, 'showcase.json'));
const {metas} = buildCatalog();
const DOCS = path.join(KIT, 'docs');
for (const d of ['clips', 'posters']) fs.mkdirSync(path.join(DOCS, d), {recursive: true});
const nameOf = (it) => it.name || it.kind.replace('/', '-');
const pkg = readJson(path.join(KIT, 'package.json'));

const HERO = ['kit-nametag', 'kit-keyword', 'remotion-starburst-rays', 'kit-counter', 'body-behind-text', 'remotion-shapes-callout', 'remotion-motion-blur-trail', 'remotion-three-coin', 'remotion-gsap-letters', 'remotion-shapes-bars', 'remotion-layout-fit-word'];
// the first cards of the grid: the strongest ones, rooms alternating
const FIRST = ['body-behind-text', 'remotion-shapes-agents', 'remotion-gsap-letters', 'remotion-noise-flow-field', 'body-contour-line', 'remotion-layout-fit-word', 'remotion-transition-iris', 'hyperframes-neon-stack'];
const BEAT = 1.2; // seconds per shot

const ORDER = ['kit', 'body', 'remotion', 'hyperframes', 'lottie'];
const items = [];
for (const it of spec.items) {
  const name = nameOf(it), m = metas[it.kind];
  const clip = path.join(D, 'out', 'clips', name + '.mp4'), still = path.join(D, 'out', 'stills', name + '.jpg');
  if (!m || (m.status && m.status !== 'ok') || !fs.existsSync(clip) || !fs.existsSync(still)) { console.log(`not on the page: ${name}`); continue; }
  const p = it.props || {};
  const words = [p.text, p.sub, p.value && p.unit ? `${p.value} ${p.unit}` : p.value, p.label].filter(Boolean).map((x) => String(x).replace(/\n/g, ' '));
  const isCut = !!it.cut;
  const line = {kind: it.kind, ...Object.fromEntries(Object.entries(p).filter(([k]) => ['text', 'sub', 'value', 'unit', 'label', 'direction'].includes(k)).map(([k, v]) => [k, typeof v === 'string' ? v.replace(/\n/g, ' ') : v]))};
  // a transition item is a word card in a plan line (one word turns into the next); on the page the same presentation is shown between two clips
  const prompt = `Use connect-ai-video-motion on my video. Add "${m.title}" where I say it, with my own words: ${JSON.stringify(isCut ? {kind: it.kind, text: '<before>', sub: '<after>', at: {text: '<the word I say>'}} : {...line, at: {text: '<the word I say>'}})}`;
  const description = (isCut ? `${m.description} Shown here between two clips with the same presentation.` : m.description) + (it.note ? ' ' + it.note : '');
  items.push({look: it.cut ? 'mix' : spec.sources?.[it.src]?.look || 'night', name, kind: it.kind, source: it.kind.split('/')[0], title: m.title, description, license: m.license, from: m.source?.package || (m.source?.type === 'hyperframes' ? 'HyperFrames' + (m.source?.version ? '@' + m.source.version : '') : m.source?.repo || m.source?.type || 'kit'), words, prompt, clip, still});
}
// order: the strongest first, then source by source; inside a source the kinds of shot take turns
// (night, warm, morning, day rooms, talk layout with a panel, practice screen, graphic-only scene, transitions)
for (const x of items) x.look = String(x.look).split('-')[0];
{
  const LOOKS = ['night', 'warm', 'morning', 'day', 'talk', 'practice', 'graphic', 'mix'];
  const rest = items.filter((x) => !FIRST.includes(x.name));
  const out = FIRST.map((n) => items.find((x) => x.name === n)).filter(Boolean);
  for (const src of ORDER) {
    const pools = LOOKS.map((l) => rest.filter((x) => x.source === src && x.look === l));
    let last = out.length ? out[out.length - 1].look : null;
    while (pools.some((p) => p.length)) {
      // the fullest pool that is not the room we just showed
      const cand = pools.filter((p) => p.length).sort((a, b) => b.length - a.length);
      const pick = cand.find((p) => p[0].look !== last) || cand[0];
      const it = pick.shift();
      out.push(it); last = it.look;
    }
  }
  items.length = 0; items.push(...out);
}
const notYet = Object.values(metas).filter((m) => m.status && m.status !== 'ok').map((m) => ({kind: m.kind, why: `${m.status === 'needs-download' ? 'Needs a download: ' : ''}${(m.reasons || []).join('; ')}`}));

if (encode) {
  for (const it of items) {
    const out = path.join(DOCS, 'clips', it.name + '.mp4');
    await ffmpeg(['-y', '-i', it.clip, '-an', '-vf', 'scale=960:540:flags=lanczos,format=yuv420p', '-c:v', 'libx264', '-preset', 'slow', '-crf', '25', '-maxrate', '1400k', '-bufsize', '2800k', '-profile:v', 'high', '-movflags', '+faststart', out]);
    await ffmpeg(['-y', '-i', it.still, '-vf', 'scale=960:540:flags=lanczos', '-q:v', '5', path.join(DOCS, 'posters', it.name + '.jpg')]);
  }
  // hero: one shot per beat around each clip's peak, hard cuts, different rooms next to each other
  const shots = HERO.map((n) => items.find((x) => x.name === n)).filter(Boolean);
  const ins = [], fl = [];
  shots.forEach((it, i) => {
    const info = readJson(it.clip.replace(/\.mp4$/, '.json'), {});
    const a = Math.max(0, Math.min((info.frames || 100) / 30 - BEAT, (info.peak || 50) / 30 - BEAT * 0.62));
    ins.push('-ss', a.toFixed(3), '-t', BEAT.toFixed(3), '-i', it.clip);
    fl.push(`[${i}:v]scale=1280:720:flags=lanczos,setsar=1,fps=30,format=yuv420p,setpts=PTS-STARTPTS[v${i}]`);
  });
  if (shots.length) {
    // the montage needs the concat filter: the system ffmpeg does it (the small ffmpeg inside Remotion has no filter graph for this)
    const args = ['-y', ...ins, '-filter_complex', `${fl.join(';')};${shots.map((_, i) => `[v${i}]`).join('')}concat=n=${shots.length}:v=1:a=0[v]`, '-map', '[v]', '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '24', '-maxrate', '2600k', '-bufsize', '5200k', '-movflags', '+faststart', path.join(DOCS, 'hero.mp4')];
    try {
      execFileSync('ffmpeg', ['-v', 'error', ...args], {stdio: ['ignore', 'ignore', 'inherit']});
      execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', '0.7', '-i', path.join(DOCS, 'hero.mp4'), '-frames:v', '1', '-q:v', '4', path.join(DOCS, 'hero.jpg')]);
    } catch (e) {
      console.log('hero.mp4 not made (needs ffmpeg on the PATH): ' + String(e.message).split('\n')[0]);
    }
  }
  // drop files of items that are no longer on the page
  for (const d of ['clips', 'posters']) for (const f of fs.readdirSync(path.join(DOCS, d))) if (!items.some((x) => f.startsWith(x.name + '.'))) fs.unlinkSync(path.join(DOCS, d, f));
}

const data = {version: pkg.version, items: items.map(({clip, still, look, ...x}) => x), notYet};
const html = fs.readFileSync(path.join(KIT, 'tools', 'docs-template.html'), 'utf8').replace('/*DATA*/', JSON.stringify(data).replace(/</g, '\\u003c')).replace(/__N__/g, String(items.length)).replace(/__V__/g, pkg.version);
fs.writeFileSync(path.join(DOCS, 'index.html'), html);
const size = (d) => fs.readdirSync(path.join(DOCS, d)).reduce((s, f) => s + fs.statSync(path.join(DOCS, d, f)).size, 0);
const big = items.map((x) => [x.name, fs.existsSync(path.join(DOCS, 'clips', x.name + '.mp4')) ? fs.statSync(path.join(DOCS, 'clips', x.name + '.mp4')).size : 0]).sort((a, b) => b[1] - a[1]);
console.log(`${items.length} graphics on the page (${Object.entries(items.reduce((o, x) => ((o[x.source] = (o[x.source] || 0) + 1), o), {})).map(([k, v]) => `${k} ${v}`).join(' · ')}), ${notYet.length} listed as not playable`);
console.log(`clips ${(size('clips') / 1e6).toFixed(1)} MB (largest ${big[0]?.[0]} ${(big[0]?.[1] / 1e3).toFixed(0)} KB), posters ${(size('posters') / 1e6).toFixed(1)} MB`);
console.log(path.join(DOCS, 'index.html'));
