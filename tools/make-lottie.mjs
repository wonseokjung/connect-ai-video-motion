// Writes the kit's own Lottie files (catalog/lottie/*/anim.json): plain shape layers, brand colours, thin strokes.
// Run: node tools/make-lottie.mjs. Any Lottie .json from After Effects (Bodymovin) or LottieFiles works the same way.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const KIT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).concat(1);
const GOLD = rgb('#D6892A'), IVORY = rgb('#EBE2D2'), TEAL_HI = rgb('#5FF2DF'), SHADE = rgb('#04100E');
const PINK = rgb('#FF5FA2'), PINK_HI = rgb('#FF9CCB'), WHITE = rgb('#FFFFFF'), INK = rgb('#1B1030'), CHEEK = rgb('#FF2E7E'), SKY = rgb('#5EE7FF');
const st = (v) => ({a: 0, k: v});
const key = (pairs, ease = [0.16, 1]) => ({a: 1, k: pairs.map(([t, s], i) => (i < pairs.length - 1 ? {t, s: [].concat(s), i: {x: [0.3], y: [ease[1]]}, o: {x: [ease[0]], y: [0]}} : {t, s: [].concat(s)}))});
const tr = (extra = {}) => ({ty: 'tr', p: st([0, 0]), a: st([0, 0]), s: st([100, 100]), r: st(0), o: st(100), sk: st(0), sa: st(0), nm: 'Transform', ...extra});
const stroke = (c, w, o = st(100)) => ({ty: 'st', c: st(c), o, w: st(w), lc: 2, lj: 2, ml: 4, nm: 'Stroke'});
const trim = (e, s = st(0)) => ({ty: 'tm', s, e, o: st(0), m: 1, nm: 'Trim'});
const layer = (ind, nm, shapes, ks = {}, op = 90) => ({ddd: 0, ind, ty: 4, nm, sr: 1, ks: {o: st(100), r: st(0), p: st([200, 200, 0]), a: st([0, 0, 0]), s: st([100, 100, 100]), ...ks}, ao: 0, shapes, ip: 0, op, st: 0, bm: 0});
const anim = (nm, op, layers) => ({v: '5.7.4', fr: 30, ip: 0, op, w: 400, h: 400, nm, ddd: 0, assets: [], layers});
const ellipse = (d) => ({ty: 'el', d: 1, s: st([d, d]), p: st([0, 0]), nm: 'Ellipse'});
const fill = (c, o = st(100)) => ({ty: 'fl', c: st(c), o, r: 1, nm: 'Fill'});
const ell = (w, h, p = [0, 0]) => ({ty: 'el', d: 1, s: st([w, h]), p: st(p), nm: 'Ellipse'});
const pathOf = (v) => ({ty: 'sh', ks: st({i: v.map(() => [0, 0]), o: v.map(() => [0, 0]), v, c: false}), nm: 'Path'});

const files = {
  'gold-check': anim('gold-check', 75, [
    layer(1, 'tick', [{ty: 'gr', nm: 'tick', it: [pathOf([[-62, 4], [-18, 46], [70, -46]]), trim(key([[16, 0], [38, 100]])), stroke(IVORY, 22), tr()]}], {}, 75),
    layer(2, 'ring', [{ty: 'gr', nm: 'ring', it: [ellipse(300), trim(key([[0, 0], [26, 100]])), stroke(GOLD, 11), tr()]}], {r: st(-90)}, 75),
    layer(3, 'halo', [{ty: 'gr', nm: 'halo', it: [ellipse(300), stroke(GOLD, 4, key([[24, 0], [30, 70], [60, 0]])), tr({s: key([[24, [100, 100]], [60, [128, 128]]])})]}], {}, 75),
  ]),
  // bright rings over a soft dark under-ring, so they stay crisp on a busy picture too
  'signal-pulse': anim('signal-pulse', 60, [0, 20, 40].map((t0, i) =>
    layer(i + 1, 'ring' + i, [{ty: 'gr', nm: 'ring', it: [ellipse(120), stroke(TEAL_HI, 9, key([[t0, 100], [t0 + 40, 45]])), stroke(SHADE, 20, key([[t0, 45], [t0 + 40, 10]])), tr({s: key([[t0, [40, 40]], [t0 + 40, [260, 260]]], [0.2, 0.9])})]}], {}, 60),
  ).concat([layer(4, 'dot', [{ty: 'gr', nm: 'dot', it: [ellipse(18), fill(IVORY), tr()]}, {ty: 'gr', nm: 'dot', it: [ellipse(44), fill(TEAL_HI), stroke(SHADE, 8, st(45)), tr()]}], {}, 60)])),
  // a little character that hops in place: squash on landing, stretch on take-off, blinks, cheeks, a sparkle
  'hop-buddy': (() => {
    const T = 30; // one hop
    const hopY = [[0, 330], [8, 250], [15, 215], [22, 250], [30, 330], [38, 250], [45, 215], [52, 250], [60, 330]];
    const sq = [[0, [122, 80]], [5, [92, 112]], [15, [100, 100]], [26, [94, 108]], [30, [122, 80]], [35, [92, 112]], [45, [100, 100]], [56, [94, 108]], [60, [122, 80]]];
    const body = layer(1, 'body', [
      {ty: 'gr', nm: 'mouth', it: [{ty: 'sh', ks: st({i: [[0, 0], [-10, 0], [0, 0]], o: [[0, 0], [10, 0], [0, 0]], v: [[-16, -30], [0, -18], [16, -30]], c: false}), nm: 'Path'}, stroke(INK, 6), tr()]},
      {ty: 'gr', nm: 'cheeks', it: [ell(26, 14, [-48, -40]), ell(26, 14, [48, -40]), fill(CHEEK, st(70)), tr()]},
      {ty: 'gr', nm: 'eyes', it: [ell(20, 30, [-30, -66]), ell(20, 30, [30, -66]), fill(INK), ell(8, 8, [-26, -74]), ell(8, 8, [34, -74]), fill(WHITE), tr({a: st([0, -66]), p: st([0, -66]), s: key([[0, [100, 100]], [40, [100, 100]], [42, [100, 8]], [45, [100, 100]], [60, [100, 100]]])})]},
      {ty: 'gr', nm: 'shine', it: [ell(46, 26, [-34, -128]), fill(WHITE, st(55)), tr()]},
      {ty: 'gr', nm: 'feet', it: [ell(40, 18, [-34, -6]), ell(40, 18, [34, -6]), fill(PINK_HI), tr()]},
      {ty: 'gr', nm: 'body', it: [ell(180, 170, [0, -88]), fill(PINK), tr()]},
    ], {p: key(hopY.map(([t, y]) => [t, [200, y, 0]]), [0.33, 1]), a: st([0, 0, 0]), s: key(sq.map(([t, v]) => [t, v.concat(100)]), [0.3, 1])}, 60);
    const shadow = layer(2, 'shadow', [{ty: 'gr', nm: 'shadow', it: [ell(150, 22), fill(INK, st(35)), tr({s: key([[0, [110, 110]], [15, [60, 60]], [30, [110, 110]], [45, [60, 60]], [60, [110, 110]]])})]}], {p: st([200, 338, 0])}, 60);
    const spark = layer(3, 'spark', [{ty: 'gr', nm: 'spark', it: [{ty: 'sr', sy: 1, d: 1, pt: st(4), p: st([0, 0]), r: st(0), ir: st(6), is: st(0), or: st(22), os: st(0), nm: 'Star'}, fill(SKY), tr({s: key([[10, [0, 0]], [15, [100, 100]], [22, [0, 0]], [40, [0, 0]], [45, [100, 100]], [52, [0, 0]]]), r: key([[10, 0], [52, 180]], [0.5, 0.5])})]}], {p: st([318, 118, 0])}, 60);
    return anim('hop-buddy', 60, [spark, body, shadow]);
  })(),
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
