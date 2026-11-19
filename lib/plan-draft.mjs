// First plan from what was said. Rules: only words that were said (or that you wrote in my-info.json),
// 1-4 words per graphic, never the whole sentence, the graphic lands just after its word.
// Your agent (or you) then edits plan.json: change a line, delete a line, add a screen target.
import {toWords} from '../src/core/words.mjs';

// "one" is left out on purpose: "one simple idea" is not a number to count up
const NUM = {two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, fifteen: 15, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100, thousand: 1000};
const ORD = {first: 1, second: 2, third: 3, fourth: 4, fifth: 5, firstly: 1, secondly: 2, thirdly: 3};
const STOP = new Set('a an the and or but so to of in on at for with from by is are was were be been am i im i\'m you we they he she it this that these those my your our their me us them do did does have has had will would can could just very really here there what when where how why who which new more small big simple great good few some any all every one also then next like get got make made let lets'.split(' '));
const clean = (w) => w.toLowerCase().replace(/[^a-z0-9']/g, '');
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const strip = (w) => w.replace(/[^A-Za-z0-9'-]/g, '');

export function draftPlan(words, info = {}) {
  const ws = toWords(words);
  const items = [];
  const used = new Set(); // word indexes already shown
  const sentences = [];
  let cur = [];
  for (const w of ws) {
    cur.push(w);
    if (/[.!?]$/.test(w.w)) { sentences.push(cur); cur = []; }
  }
  if (cur.length) sentences.push(cur);
  const at = (w) => ({text: strip(w.w), near: +w.t0.toFixed(2)});

  // name: when you say your name (from my-info.json)
  const first = String(info.name || '').split(/\s+/)[0];
  if (first) {
    const w = ws.find((x) => clean(x.w) === clean(first));
    if (w) { items.push({kind: 'nametag', at: at(w), text: info.name, sub: info.role || '', why: 'you said your name'}); used.add(w.i); }
  }
  for (const s of sentences) {
    const has = () => s.some((w) => used.has(w.i));
    // steps: first / second / third
    const o = s.find((w) => ORD[clean(w.w)]);
    if (o) {
      const k = s.indexOf(o);
      const rest = s.slice(k + 1).map((w) => strip(w.w)).filter(Boolean).slice(0, 4);
      items.push({kind: 'steps', at: at(o), value: ORD[clean(o.w)], text: cap(rest.join(' ')), why: `you said "${strip(o.w)}"`});
      s.forEach((w) => used.add(w.i));
      continue;
    }
    // numbers: "three new tools" -> counter 3 + "tools"
    const n = s.find((w) => NUM[clean(w.w)] || /^\d[\d,.]*[kKmM]?$/.test(strip(w.w)));
    if (n && !has()) {
      const k = s.indexOf(n);
      const value = NUM[clean(n.w)] ?? strip(n.w);
      const unit = s.slice(k + 1).map((w) => clean(w.w)).find((w) => w && !STOP.has(w)) || '';
      items.push({kind: 'counter', at: at(n), value: String(value), unit, why: `you said "${strip(n.w)}${unit ? ' ' + unit : ''}"`});
      s.forEach((w) => used.add(w.i));
      continue;
    }
    // chapter: "Next, ..." / "Chapter ..." / "Part ..."
    const c = s[0] && /^(next|chapter|part|now)$/.test(clean(s[0].w)) ? s[0] : null;
    if (c && !has()) {
      const title = s.slice(1).map((w) => strip(w.w)).filter((w) => w && !STOP.has(w.toLowerCase())).slice(0, 3).join(' ');
      if (title) {
        items.push({kind: 'chapter', at: at(c), value: items.filter((x) => x.kind === 'chapter').length + 1, text: cap(title), why: `you started a new part with "${strip(c.w)}"`});
        s.forEach((w) => used.add(w.i));
        continue;
      }
    }
    // pointing at the screen: needs a target, so it is only a suggestion for your agent
    const p = s.find((w, i) => /^(this|here)$/.test(clean(w.w)) && s[i + 1] && !STOP.has(clean(s[i + 1].w)));
    if (p && !has()) {
      const k = s.indexOf(p);
      const noun = strip(s[k + 1].w);
      items.push({kind: 'card', at: at(p), text: cap(noun), target: null, zoom: null, why: `you pointed at "${noun}". Agent: read the sheet, set target [x,y] and zoom [x,y,w,h] (0..1), or delete this line`, todo: true});
      s.forEach((w) => used.add(w.i));
      continue;
    }
    // key word: an acronym or proper name, else your own keywords from my-info.json, else the longest strong word
    if (has()) continue;
    const kw = (info.keywords || []).map(clean);
    const pick =
      s.find((w) => kw.includes(clean(w.w))) ||
      s.find((w) => /^[A-Z]{2,}$/.test(strip(w.w))) ||
      [...s].filter((w) => !STOP.has(clean(w.w)) && clean(w.w).length >= 5).sort((a, b) => clean(b.w).length - clean(a.w).length)[0];
    const strong = pick && (kw.includes(clean(pick.w)) || /^[A-Z]{2,}$/.test(strip(pick.w)));
    if (pick && (strong || !items.some((x) => x.kind === 'keyword'))) {
      items.push({kind: 'keyword', at: at(pick), text: cap(strip(pick.w)), why: 'strong word in this line'});
      s.forEach((w) => used.add(w.i));
    }
  }
  // the card suggestions without a target cannot be shown yet
  const ready = items.filter((x) => !x.todo);
  const todo = items.filter((x) => x.todo);
  // end card: your name + your call to action (from my-info.json)
  if (info.endcard !== false) ready.push({kind: 'endcard', text: (info.endcard && info.endcard.text) || info.name || '', sub: (info.endcard && info.endcard.action) || '', why: 'end card from my-info.json'});
  return {version: 1, made: 'auto draft from words.json', items: ready.map((x, i) => ({id: `${x.kind}-${i + 1}`, ...x})), suggestions: todo};
}
