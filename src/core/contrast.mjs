// Automatic contrast: measure how bright the video is where a graphic will sit, then pick
// the ink colour and how strong the soft backing behind it must be. WCAG contrast ratio, target 4.5.

const lin = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
export const luminanceOfHex = (hex) => {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return 0.2126 * lin(((n >> 16) & 255) / 255) + 0.7152 * lin(((n >> 8) & 255) / 255) + 0.0722 * lin((n & 255) / 255);
};
export const luminanceOfRgb = ([r, g, b]) => 0.2126 * lin(r / 255) + 0.7152 * lin(g / 255) + 0.0722 * lin(b / 255);
export const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

export const TARGET = 4.5;

// bgLum: relative luminance of the video under the box (0..1). Returns {ink, scrim (0..0.8), contrast}.
export function pickInk(bgLum, style) {
  const inkL = luminanceOfHex(style.ink), darkL = luminanceOfHex(style.inkOnLight), scrimL = luminanceOfHex(style.scrimColor);
  if (bgLum == null) return {ink: style.ink, scrim: 0.45, contrast: null};
  // try light ink with a dark backing that gets stronger until it reads
  for (let a = style.scrim; a <= 0.8 + 1e-9; a += 0.05) {
    const eff = bgLum * (1 - a) + scrimL * a;
    const c = ratio(inkL, eff);
    if (c >= TARGET) return {ink: style.ink, scrim: +a.toFixed(2), contrast: +c.toFixed(2)};
  }
  // very bright place: dark ink, no backing
  const c = ratio(darkL, bgLum);
  if (c >= TARGET) return {ink: style.inkOnLight, scrim: 0, contrast: +c.toFixed(2)};
  const eff = bgLum * 0.2 + scrimL * 0.8;
  return {ink: style.ink, scrim: 0.8, contrast: +ratio(inkL, eff).toFixed(2)};
}
