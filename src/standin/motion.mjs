// Stand-in footage for the samples: a code-drawn, front-facing illustrated person (no real face, no real voice of anyone we know).
// The same function draws the clip and writes its face.json, so the sample face box is exact.

export const VARIANTS = {
  sample10: {cx: 0.6, sway: 46, size: 1.0, drift: 0, screen: false},
  intro20: {cx: 0.52, sway: 70, size: 1.08, drift: 0, screen: false},
  steps15: {cx: 0.5, sway: 40, size: 1.0, drift: 230, screen: false},
  screen20: {cx: 0.79, sway: 26, size: 0.78, drift: 0, screen: true},
};

// Screen variant: where the fake app's parts are (source px, 1920 x 1080)
export const SCREEN = {panel: [96, 132, 1010, 716], deploy: [868, 214, 182, 58], log: [150, 590, 900, 220], settings: [118, 452, 210, 42]};

// env: optional voice loudness per frame (0..1), makes the head nod a little while speaking
/** @param {string} variant @param {number} t @param {number[]|null|undefined} [env] @param {number} [fps] */
export function pose(variant, t, env = null, fps = 30) {
  const v = VARIANTS[variant] || VARIANTS.sample10;
  const W = 1920, H = 1080;
  const e = env ? env[Math.min(env.length - 1, Math.max(0, Math.round(t * fps)))] || 0 : 0;
  const drift = v.drift ? -Math.cos((t / 7.5) * Math.PI) * v.drift : 0; // slow walk across for the 9:16 follow
  const cx = v.cx * W + Math.sin((t / 9) * 2 * Math.PI) * v.sway + Math.sin((t / 3.7) * 2 * Math.PI) * v.sway * 0.25 + drift;
  const lean = 1 + 0.025 * Math.sin((t / 11) * 2 * Math.PI);
  const hw = 190 * v.size * lean, hh = 246 * v.size * lean;
  const cy = H * (v.screen ? 0.42 : 0.37) + Math.sin((t / 2.3) * 2 * Math.PI) * 4 - e * 7;
  const tilt = Math.sin((t / 5.3) * 2 * Math.PI) * 3 + e * 2;
  const blink = (t % 3.9) < 0.12 ? 1 : 0;
  return {cx, cy, hw, hh, tilt, W, H, shoulder: 640 * v.size * lean, mouth: e, blink};
}

// Face box = the head, with a small allowance for hair.
export const faceBox = (p) => [p.cx - p.hw * 0.58 - 6, p.cy - p.hh / 2 - 10, p.hw * 1.16 + 12, p.hh + 20];
