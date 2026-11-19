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
  connect: {name: 'connect', font: 'Inter', weight: 200, heavy: 400, tracking: -0.02, ink: '#EBE2D2', inkOnLight: '#14110E', accent: '#D6892A', accentHi: '#F2B45A', scrimColor: '#0B0A09', scrim: 0.0, grain: 0.09, entry: 'scramble', radius: 2, cardBg: '#12100E'},
  // Night set: teal accent, same thin type.
  night: {name: 'night', font: 'Inter', weight: 200, heavy: 400, tracking: -0.02, ink: '#E8F1EE', inkOnLight: '#0E1716', accent: '#3FB7A6', accentHi: '#7FE0D1', scrimColor: '#07100F', scrim: 0.0, grain: 0.07, entry: 'rise', radius: 2, cardBg: '#0D1716'},
  // Clean: light panels, blue accent, no grain. For bright rooms.
  clean: {name: 'clean', font: 'Inter', weight: 300, heavy: 500, tracking: -0.025, ink: '#FFFFFF', inkOnLight: '#111111', accent: '#2F6FA8', accentHi: '#4C8CC6', scrimColor: '#0B0B0B', scrim: 0.0, grain: 0, entry: 'wipe', radius: 10, cardBg: '#FFFFFF'},
};

export const getStyle = (name) => STYLES[name] || STYLES.connect;

// Timing numbers (frames at 30 fps) follow motionmaxxing (Apache-2.0, commit 8c8ec0f2a6f6):
// entry 12, opacity 6, blur 7, exit 13. Ease out when landing, accelerate when leaving.
export const TIMING = {enter: 12, opacity: 6, blur: 7, exit: 13};
