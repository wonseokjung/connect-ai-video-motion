// Writes the kit's own Lottie files (catalog/lottie/*/anim.json): plain shape layers, brand colours, thin strokes.
// Run: node tools/make-lottie.mjs. Any Lottie .json from After Effects (Bodymovin) or LottieFiles works the same way.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const KIT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).concat(1);
const GOLD = rgb('#D6892A'), IVORY = rgb('#EBE2D2'), TEAL = rgb('#3FB7A6');
const st = (v) => ({a: 0, k: v});
const key = (pairs, ease = [0.16, 1]) => ({a: 1, k: pairs.map(([t, s], i) => (i < pairs.length - 1 ? {t, s: [].concat(s), i: {x: [0.3], y: [ease[1]]}, o: {x: [ease[0]], y: [0]}} : {t, s: [].concat(s)}))});
const tr = (extra = {}) => ({ty: 'tr', p: st([0, 0]), a: st([0, 0]), s: st([100, 100]), r: st(0), o: st(100), sk: st(0), sa: st(0), nm: 'Transform', ...extra});
const stroke = (c, w, o = st(100)) => ({ty: 'st', c: st(c), o, w: st(w), lc: 2, lj: 2, ml: 4, nm: 'Stroke'});
const trim = (e, s = st(0)) => ({ty: 'tm', s, e, o: st(0), m: 1, nm: 'Trim'});
const layer = (ind, nm, shapes, ks = {}, op = 90) => ({ddd: 0, ind, ty: 4, nm, sr: 1, ks: {o: st(100), r: st(0), p: st([200, 200, 0]), a: st([0, 0, 0]), s: st([100, 100, 100]), ...ks}, ao: 0, shapes, ip: 0, op, st: 0, bm: 0});
const anim = (nm, op, layers) => ({v: '5.7.4', fr: 30, ip: 0, op, w: 400, h: 400, nm, ddd: 0, assets: [], layers});
const ellipse = (d) => ({ty: 'el', d: 1, s: st([d, d]), p: st([0, 0]), nm: 'Ellipse'});
const pathOf = (v) => ({ty: 'sh', ks: st({i: v.map(() => [0, 0]), o: v.map(() => [0, 0]), v, c: false}), nm: 'Path'});

const files = {
  'gold-check': anim('gold-check', 75, [
    layer(1, 'tick', [{ty: 'gr', nm: 'tick', it: [pathOf([[-62, 4], [-18, 46], [70, -46]]), trim(key([[16, 0], [38, 100]])), stroke(IVORY, 22), tr()]}], {}, 75),
    layer(2, 'ring', [{ty: 'gr', nm: 'ring', it: [ellipse(300), trim(key([[0, 0], [26, 100]])), stroke(GOLD, 11), tr()]}], {r: st(-90)}, 75),
    layer(3, 'halo', [{ty: 'gr', nm: 'halo', it: [ellipse(300), stroke(GOLD, 4, key([[24, 0], [30, 70], [60, 0]])), tr({s: key([[24, [100, 100]], [60, [128, 128]]])})]}], {}, 75),
  ]),
  'signal-pulse': anim('signal-pulse', 60, [0, 20, 40].map((t0, i) =>
    layer(i + 1, 'ring' + i, [{ty: 'gr', nm: 'ring', it: [ellipse(120), stroke(TEAL, 10, key([[t0, 100], [t0 + 40, 30]])), tr({s: key([[t0, [40, 40]], [t0 + 40, [260, 260]]], [0.2, 0.9])})]}], {}, 60),
  ).concat([layer(4, 'dot', [{ty: 'gr', nm: 'dot', it: [ellipse(34), {ty: 'fl', c: st(TEAL), o: st(100), r: 1, nm: 'Fill'}, tr()]}], {}, 60)])),
  'arc-orbit': anim('arc-orbit', 60, [
    layer(1, 'arc', [{ty: 'gr', nm: 'arc', it: [ellipse(350), trim(st(28)), stroke(GOLD, 16), tr()]}], {r: key([[0, 0], [60, 360]], [0.5, 0.5])}, 60),
    layer(2, 'arc2', [{ty: 'gr', nm: 'arc2', it: [ellipse(280), trim(st(16)), stroke(IVORY, 9, st(80)), tr()]}], {r: key([[0, 180], [60, -180]], [0.5, 0.5])}, 60),
    layer(3, 'track', [{ty: 'gr', nm: 'track', it: [ellipse(350), stroke(IVORY, 4, st(30)), tr()]}], {}, 60),
  ]),
};

for (const [name, j] of Object.entries(files)) {
  const d = path.join(KIT, 'catalog', 'lottie', name);
  fs.mkdirSync(d, {recursive: true});
  fs.writeFileSync(path.join(d, 'anim.json'), JSON.stringify(j));
  console.log(path.join('catalog', 'lottie', name, 'anim.json'));
}
