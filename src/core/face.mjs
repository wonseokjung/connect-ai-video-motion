// Pillar 1: the kit knows where the face is.
// face.json = {width, height, fps?, source, samples: [{t, box:[x,y,w,h]}]}  (source pixels, t in seconds)
// A one-line setting (my-info "face: 'center'") becomes a static box with source "my-info".

/** @param {{samples: {t:number, box:number[]}[]}} face @param {number} t */
export function faceAt(face, t) {
  const s = face.samples;
  if (!s || !s.length) return null;
  if (t <= s[0].t) return s[0].box;
  if (t >= s[s.length - 1].t) return s[s.length - 1].box;
  let i = 0;
  while (t > s[i + 1].t) i++;
  const a = s[i], b = s[i + 1];
  const u = (t - a.t) / (b.t - a.t || 1);
  return a.box.map((v, k) => v + (b.box[k] - v) * u);
}

// Static face from one word: left / center / right. Box covers a typical head at that spot.
export function faceFromPosition(pos, width, height) {
  const w = width * 0.17, h = height * 0.34;
  const cx = pos === 'left' ? width * 0.3 : pos === 'right' ? width * 0.7 : width * 0.5;
  return {width, height, source: 'my-info', samples: [{t: 0, box: [cx - w / 2, height * 0.16, w, h]}]};
}

// Smooth follow for the 9:16 crop camera: dead band (no move while the face stays inside it) + easing + speed cap.
// Deterministic: computed once over all frames in order, same input = same path.
export function followTrack(values, {deadband = 60, ease = 0.06, maxStep = 6} = {}) {
  const out = new Array(values.length);
  let cur = values[0], vel = 0;
  for (let i = 0; i < values.length; i++) {
    const target = values[i];
    const d = target - cur;
    const want = Math.abs(d) > deadband ? (d - Math.sign(d) * deadband) * ease : 0;
    vel += (want - vel) * 0.25; // second-order smoothing = no sudden starts
    vel = Math.max(-maxStep, Math.min(maxStep, vel));
    cur += vel;
    out[i] = cur;
  }
  return out;
}

export const inflate = (b, m) => [b[0] - m, b[1] - m, b[2] + 2 * m, b[3] + 2 * m];
export const union = (a, b) => {
  if (!a) return b;
  const x = Math.min(a[0], b[0]), y = Math.min(a[1], b[1]);
  return [x, y, Math.max(a[0] + a[2], b[0] + b[2]) - x, Math.max(a[1] + a[3], b[1] + b[3]) - y];
};
export const overlapArea = (a, b) => {
  const w = Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0]);
  const h = Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1]);
  return w > 0 && h > 0 ? w * h : 0;
};
// Overlap depth in px (the smaller side of the intersection). 0 = no touch.
export const overlapPx = (a, b) => {
  const w = Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0]);
  const h = Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1]);
  return w > 0 && h > 0 ? Math.round(Math.min(w, h)) : 0;
};
