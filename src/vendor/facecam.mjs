// Adapted from aaksa/facecammaxxing (MIT), commit a9976a70b02c, remotion/src/lib/layout.ts and effects/guide.tsx.
// Copyright (c) facecammaxxing authors. Full licence: licenses/facecammaxxing-MIT.txt
// What we changed: plain JS (no React / GSAP), zones returned as rectangles for our layout engine,
// number formatting kept as is.

// Platform zones for 9:16 (written for 1080 x 1920, scaled): Reels / Shorts / TikTok top bar,
// the right button rail (between y 864 and 1536) and the caption area under y 1536.
export const platformZones = (W, H) => {
  const sx = W / 1080, sy = H / 1920;
  const top = 250 * sy, bottom = 1536 * sy, railX = 940 * sx, railY0 = 864 * sy;
  return [
    {name: 'app top bar', r: [0, 0, W, top]},
    {name: 'app buttons', r: [railX, railY0, W - railX, bottom - railY0]},
    {name: 'app caption area', r: [0, bottom, W, H - bottom]},
  ];
};

// "1,204" -> {v: 1204}, "412K" -> {v: 412000, unit: 'K'}
export const parseNum = (s) => {
  const m = String(s).trim().match(/^([^\d-]*)(-?[\d.,]+)\s*([kKmMbB]?)(.*)$/);
  if (!m) return {pre: '', v: 0, unit: '', post: String(s)};
  const mul = {k: 1e3, m: 1e6, b: 1e9}[m[3].toLowerCase()] ?? 1;
  return {pre: m[1], v: parseFloat(m[2].replace(/,/g, '')) * mul, unit: m[3].toUpperCase(), post: m[4]};
};
export const showNum = (v, unit) => {
  if (unit === 'M' && v >= 1e6) return `${(v / 1e6).toFixed(v < 1e7 ? 1 : 0)}M`;
  if ((unit === 'K' || unit === 'M') && v >= 1e4) return `${Math.round(v / 1e3)}K`;
  return Math.round(v).toLocaleString('en-US');
};
