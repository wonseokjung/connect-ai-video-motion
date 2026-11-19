// Pillar 2: the kit knows what is said.
// words.json uses the Remotion caption shape (@remotion/captions `Caption`), so whisper output from
// @remotion/install-whisper-cpp drops in unchanged later:
//   {tier: 'A'|'B'|'C', source, captions: [{text, startMs, endMs, timestampMs, confidence}]}
// tier A = real word times (whisper, Gemini, word-level export) -> graphic 0-80 ms after the word
// tier B = sentence subtitles only -> word times spread inside the sentence, snapped to voice energy (about +-0.2 s)
// tier C = no speech data -> the plan gives seconds by hand

export const toWords = (wj) =>
  (wj?.captions || []).map((c, i) => ({i, w: String(c.text).trim(), t0: c.startMs / 1000, t1: c.endMs / 1000}));

// Spread the words of sentence cues over each cue by letter count (first guess for tier B).
export function spreadCues(cues) {
  const out = [];
  for (const c of cues) {
    const ws = String(c.text).replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean);
    const weight = ws.map((w) => w.length + 2);
    const total = weight.reduce((p, q) => p + q, 0) || 1;
    let t = c.startMs;
    ws.forEach((w, j) => {
      const d = ((c.endMs - c.startMs) * weight[j]) / total;
      out.push({text: w, startMs: Math.round(t), endMs: Math.round(t + d), timestampMs: Math.round(t + d / 2), confidence: null});
      t += d;
    });
  }
  return out;
}

// WebVTT -> SRT text, so @remotion/captions parseSrt reads both.
export function vttToSrt(text) {
  const blocks = text.replace(/\r/g, '').replace(/^WEBVTT.*\n/, '').split(/\n\s*\n/);
  let n = 0;
  return blocks
    .map((b) => {
      const lines = b.split('\n').filter(Boolean);
      const k = lines.findIndex((l) => l.includes('-->'));
      if (k < 0) return '';
      const fix = (s) => {
        const t = s.trim().split(' ')[0].replace('.', ',');
        return t.split(':').length === 2 ? '00:' + t : t;
      };
      const [a, z] = lines[k].split('-->');
      return `${++n}\n${fix(a)} --> ${fix(z)}\n${lines.slice(k + 1).join('\n')}`;
    })
    .filter(Boolean)
    .join('\n\n');
}

const clean = (w) => String(w).toLowerCase().replace(/[^a-z0-9가-힣]/g, '');

// at: {text, near} (preferred: survives subtitle edits) | "word#12" | "first" | "third@2" | 4.5 | "4.5s"
export function resolveAt(at, words) {
  if (at && typeof at === 'object') {
    const key = clean(at.text);
    let best = null;
    for (const w of words) {
      if (clean(w.w) !== key) continue;
      const d = Math.abs(w.t0 - (at.near ?? w.t0));
      if (!best || d < best.d) best = {d, w};
    }
    if (!best) throw new Error(`the word "${at.text}" is not in words.json`);
    if (at.near != null && best.d > 3) throw new Error(`"${at.text}" is said at ${best.w.t0.toFixed(1)} s, more than 3 s from near=${at.near}`);
    return {t: best.w.t0, word: best.w, manual: false};
  }
  if (typeof at === 'number') return {t: at, word: null, manual: true};
  const s = String(at).trim();
  let m = s.match(/^word#(\d+)$/);
  if (m) {
    const w = words[+m[1]];
    if (!w) throw new Error(`${s} does not exist (words.json has ${words.length} words)`);
    return {t: w.t0, word: w, manual: false};
  }
  m = s.match(/^([\d.]+)s?$/);
  if (m) return {t: +m[1], word: null, manual: true};
  m = s.match(/^(.+?)(?:@(\d+))?$/);
  const key = clean(m[1]);
  const nth = +(m[2] || 1);
  let seen = 0;
  for (const w of words) if (clean(w.w) === key && ++seen === nth) return {t: w.t0, word: w, manual: false};
  throw new Error(`the word "${m[1]}"${nth > 1 ? ' @' + nth : ''} is not in words.json`);
}
