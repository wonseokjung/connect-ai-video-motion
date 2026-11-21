// Style tokens. One file = the whole look. Pick one in my-info.json ("style": "connect" | "night" | "clean"),
// or copy one block and change the colours. Names and colours are ours.

/** @typedef {{
 *  name: string, font: string, weight: number, heavy: number, tracking: number,
 *  ink: string, inkOnLight: string, accent: string, accentHi: string,
 *  scrimColor: string, scrim: number, grain: number, entry: 'scramble'|'rise'|'wipe', radius: number,
 *  cardBg: string
 * }} Style */

/** @type {Record<string, Style>} */
export const STYLES = {
  // Default: our look. Thin sans, one accent (gold), scramble entry, grain inside graphics only.
  connect: {name: 'connect', font: 'Inter', weight: 300, heavy: 500, tracking: -0.02, ink: '#EBE2D2', inkOnLight: '#14110E', accent: '#D6892A', accentHi: '#F2B45A', scrimColor: '#0B0A09', scrim: 0.0, grain: 0.09, entry: 'scramble', radius: 2, cardBg: '#12100E'},
  // Day: the same brand look for bright rooms (window light, white walls): dark ink, deeper gold that still reads on white.
  day: {name: 'day', font: 'Inter', weight: 300, heavy: 500, tracking: -0.02, ink: '#14110E', inkOnLight: '#14110E', accent: '#B5701A', accentHi: '#9A5A0C', scrimColor: '#FFFFFF', scrim: 0.0, grain: 0.05, entry: 'rise', radius: 2, cardBg: '#FFFFFF'},
  // Night set: teal accent, same thin type.
  night: {name: 'night', font: 'Inter', weight: 200, heavy: 400, tracking: -0.02, ink: '#E8F1EE', inkOnLight: '#0E1716', accent: '#3FB7A6', accentHi: '#7FE0D1', scrimColor: '#07100F', scrim: 0.0, grain: 0.07, entry: 'rise', radius: 2, cardBg: '#0D1716'},
  // Clean: light panels, blue accent, no grain. For bright rooms.
  clean: {name: 'clean', font: 'Inter', weight: 300, heavy: 500, tracking: -0.025, ink: '#FFFFFF', inkOnLight: '#111111', accent: '#2F6FA8', accentHi: '#4C8CC6', scrimColor: '#0B0B0B', scrim: 0.0, grain: 0, entry: 'wipe', radius: 10, cardBg: '#FFFFFF'},
};

// my-info.json "weight": 500 sets a heavier type weight on any look (100-900; "heavy" stays at least 200 above it).
// The looks are thin on purpose; a heavier weight reads better small (thumbnails, phone screens).
export const getStyle = (name, info) => {
  const s = STYLES[name] || STYLES.connect;
  const w = Number(info?.weight);
  if (!w || w < 100 || w > 900) return s;
  return {...s, weight: w, heavy: Math.min(900, Math.max(s.heavy, w + 200))};
};

// Timing numbers (frames at 30 fps) follow motionmaxxing (Apache-2.0, commit 8c8ec0f2a6f6):
// entry 12, opacity 6, blur 7, exit 13. Ease out when landing, accelerate when leaving.
export const TIMING = {enter: 12, opacity: 6, blur: 7, exit: 13};
