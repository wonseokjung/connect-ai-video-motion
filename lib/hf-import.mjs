// hf-import: turn a folder of HyperFrames blocks (a registry checkout, a template, or your own .html files) into
// catalog items: catalog/hyperframes/<name>/{block.html, meta.json}. Each block is checked first; blocks the
// adapter cannot play frame by frame are still listed, with status "unsupported" and the reasons.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {KIT} from './analyze.mjs';

const require = createRequire(import.meta.url);

const gsapDist = () => {
  try {
    return path.join(path.dirname(require.resolve('gsap/package.json')), 'dist');
  } catch {
    return null;
  }
};

/** What keeps a block from playing frame by frame inside Remotion. Returns {reasons: [], warnings: []}. */
export function checkBlock(html) {
  const reasons = [], warnings = [];
  const dist = gsapDist();
  if (/getContext\(\s*['"](webgl2?|experimental-webgl)|THREE\.|three(\.module)?(\.min)?\.js|<canvas/i.test(html)) reasons.push('draws with WebGL / canvas (three.js); use a Remotion item from catalog/remotion instead');
  if (/<video|<audio|new Audio\(/i.test(html)) reasons.push('plays its own video or audio');
  for (const m of html.matchAll(/<script[^>]*src=["']([^"']+)["']/gi)) {
    const src = m[1];
    const g = src.match(/gsap[^"']*\/(?:dist\/)?([A-Za-z0-9]+)\.min\.js$/);
    if (g) {
      if (g[1] !== 'gsap' && dist && !fs.existsSync(path.join(dist, g[1] + '.min.js'))) reasons.push(`needs the GSAP plugin ${g[1]}, which the installed gsap does not have`);
      continue;
    }
    reasons.push(`loads a script from ${src}`);
  }
  if (/requestAnimationFrame|setInterval\(/.test(html)) reasons.push('runs its own animation loop (requestAnimationFrame / setInterval), which cannot be seeked');
  if (/@keyframes|animation\s*:/.test(html)) warnings.push('uses CSS animations: the adapter holds them at the frame time (document.getAnimations), check the gallery');
  if (!/__timelines/.test(html)) reasons.push('has no paused GSAP timeline in window.__timelines');
  if (/__[A-Z][A-Z_]+__/.test(html)) reasons.push('has template placeholders (like __VIDEO_DURATION__) that the HyperFrames CLI fills');
  if (/fetch\(|XMLHttpRequest/.test(html)) reasons.push('loads data from the network');
  if (/Math\.random/.test(html)) warnings.push('uses Math.random: the adapter seeds it, so every render gives the same picture');
  if (/<img[^>]*src=["']https?:/i.test(html)) warnings.push('shows an image from the internet');
  return {reasons, warnings};
}

const attr = (html, name) => html.match(new RegExp(`data-${name}=["']([^"']+)["']`))?.[1];
const slug = (s) => String(s).toLowerCase().replace(/\.html?$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function findBlocks(dir) {
  const out = [];
  const walk = (d) => {
    for (const n of fs.readdirSync(d)) {
      if (n === 'node_modules' || n.startsWith('.')) continue;
      const f = path.join(d, n);
      const s = fs.statSync(f);
      if (s.isDirectory()) walk(f);
      else if (n === 'registry-item.json') {
        let item;
        try {
          item = JSON.parse(fs.readFileSync(f, 'utf8'));
        } catch {
          continue;
        }
        for (const file of item.files || []) {
          if (!/\.html?$/.test(file.path)) continue;
          const abs = path.join(d, file.path);
          if (fs.existsSync(abs)) out.push({abs, item, name: (item.files.filter((x) => /\.html?$/.test(x.path)).length > 1 ? `${item.name}-${slug(path.basename(file.path))}` : item.name)});
        }
      }
    }
  };
  walk(dir);
  if (!out.length) {
    // no registry: every .html file is a block
    const html = [];
    const walk2 = (d) => fs.readdirSync(d).forEach((n) => {
      const f = path.join(d, n);
      if (fs.statSync(f).isDirectory()) { if (n !== 'node_modules' && !n.startsWith('.')) walk2(f); } else if (/\.html?$/.test(n)) html.push(f);
    });
    walk2(dir);
    for (const abs of html) out.push({abs, item: null, name: slug(path.relative(dir, abs).replace(/[\\/]/g, '-'))});
  }
  return out;
}

/**
 * Import blocks from `dir` into `out` (default: the kit's catalog/hyperframes).
 * Returns [{kind, status, reasons, warnings}].
 */
export function importHyperFrames(dir, {out = path.join(KIT, 'catalog', 'hyperframes'), license = 'Apache-2.0', repo = 'heygen-com/hyperframes', prefix = '', dry = false} = {}) {
  const res = [];
  for (const b of findBlocks(path.resolve(dir))) {
    const html = fs.readFileSync(b.abs, 'utf8');
    const {reasons, warnings} = checkBlock(html);
    const name = prefix + slug(b.name);
    const w = Number(attr(html, 'width')) || b.item?.dimensions?.width || 1920;
    const h = Number(attr(html, 'height')) || b.item?.dimensions?.height || 1080;
    const d = Number(attr(html, 'duration')) || b.item?.duration || 3;
    const meta = {
      kind: `hyperframes/${name}`,
      title: `${b.item?.title || name} (HyperFrames)`,
      description: b.item?.description || `HyperFrames block ${path.basename(b.abs)}`,
      source: {type: 'hyperframes', repo, path: path.relative(path.resolve(dir), b.abs).replace(/\\/g, '/'), note: 'imported by hf-import; unchanged copy'},
      license,
      src: 'block.html',
      use: 'label',
      props: {},
      text: {},
      canvas: [w, h],
      window: [0, Math.min(d, 6)],
      place: 'box',
      size: {aspect: +(w / h).toFixed(2), minW: 0.24, maxW: 0.4},
      dur: Math.min(d, 4),
      family: `hf-${name}`,
      ...(reasons.length ? {status: 'unsupported', reasons} : {}),
      ...(warnings.length ? {warnings} : {}),
    };
    if (!dry) {
      const to = path.join(out, name);
      fs.mkdirSync(to, {recursive: true});
      fs.copyFileSync(b.abs, path.join(to, 'block.html'));
      const mf = path.join(to, 'meta.json');
      // keep what you already tuned by hand (window, crop, text, place, example)
      const old = fs.existsSync(mf) ? JSON.parse(fs.readFileSync(mf, 'utf8')) : {};
      const merged = {...meta, ...old, source: meta.source};
      if (reasons.length) Object.assign(merged, {status: 'unsupported', reasons});
      else if (merged.status === 'unsupported') { delete merged.status; delete merged.reasons; }
      fs.writeFileSync(mf, JSON.stringify(merged, null, 2) + '\n');
    }
    res.push({kind: meta.kind, status: reasons.length ? 'unsupported' : 'ok', reasons, warnings});
  }
  return res;
}
