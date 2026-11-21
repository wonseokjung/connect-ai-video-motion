// The common contract that ties every source together (Remotion packages, HyperFrames blocks, Lottie files,
// the kit's own graphics, your own .tsx). One graphic = one folder: catalog/<source>/<name>/{meta.json, index.tsx | block.html | anim.json}.
// A plan line calls any of them with one word: {"kind": "remotion/shapes-pie", "at": {...}, "value": "40"}.
// Placement, speech timing and check are the same for every source. Pure JS (Node + browser).
import {METAS} from '../catalog/metas.generated.mjs';

export const PLACES = ['box', 'attach', 'behind', 'edge', 'post', 'full'];
export const ATTACH = ['hand', 'fingers', 'point', 'contour', 'shoulder'];
export const USES = ['name', 'keyword', 'number', 'steps', 'list', 'compare', 'quote', 'emphasis', 'pointer', 'chapter', 'card', 'background', 'transition', 'end', 'body', 'label', 'title'];
export const SOURCES = ['kit', 'remotion', 'hyperframes', 'lottie', 'body', 'custom'];
export const STATUS = ['ok', 'needs-download', 'unsupported'];

// 0.1 plan files keep working: "keyword" = "kit/keyword", and so on.
export const ALIASES = {nametag: 'kit/nametag', keyword: 'kit/keyword', counter: 'kit/counter', steps: 'kit/steps', card: 'kit/card', chapter: 'kit/chapter', endcard: 'kit/endcard'};

export const DEFAULT_SIZE = {aspect: 1.8, minW: 0.2, maxW: 0.34, tallMinW: 0.5, tallMaxW: 0.78};

/** meta for a plan item: catalog entry, or a custom / user file entry built from the item itself */
export function metaFor(it, metas = METAS) {
  const kind = ALIASES[it.kind] || it.kind;
  if (metas[kind]) return metas[kind];
  if (kind === 'custom' || kind === 'hyperframes' || kind === 'lottie') {
    const m = it.meta || {};
    return {
      kind,
      title: m.title || it.component || it.src || kind,
      source: {type: kind === 'custom' ? 'custom' : kind, path: it.component || it.src},
      license: m.license || 'yours',
      place: m.place || 'box',
      attach: m.attach || null,
      size: {...DEFAULT_SIZE, ...(m.size || {})},
      dur: m.dur || 2.6,
      family: m.family || `${kind}:${it.component || it.src}`,
      bleed: m.bleed ?? 0.06,
      canvas: m.canvas || null,
      crop: m.crop || null,
      text: m.text || null,
      user: true,
      status: 'ok',
    };
  }
  return null;
}

export const kindOf = (k) => ALIASES[k] || k;

/** Check one meta.json. Returns a list of sentences (empty = fine). */
export function validateMeta(m, dirName = '') {
  const e = [];
  const need = (k) => { if (m[k] == null || m[k] === '') e.push(`"${k}" is missing`); };
  for (const k of ['kind', 'title', 'description', 'source', 'license', 'place', 'use', 'family']) need(k);
  if (m.kind && dirName && !m.kind.endsWith('/' + dirName)) e.push(`kind "${m.kind}" must end with the folder name "${dirName}"`);
  if (m.kind && !SOURCES.includes(m.kind.split('/')[0])) e.push(`kind must start with one of ${SOURCES.join(', ')}`);
  if (m.place && !PLACES.includes(m.place)) e.push(`place "${m.place}" is not one of ${PLACES.join(', ')}`);
  if (m.place === 'attach' && !ATTACH.includes(m.attach)) e.push(`attach must be one of ${ATTACH.join(', ')}`);
  if (m.use && !USES.includes(m.use)) e.push(`use "${m.use}" is not one of ${USES.join(', ')}`);
  if (m.status && !STATUS.includes(m.status)) e.push(`status "${m.status}" is not one of ${STATUS.join(', ')}`);
  const playable = !m.status || m.status === 'ok';
  if (!playable && !(Array.isArray(m.reasons) && m.reasons.length)) e.push(`status "${m.status}" needs "reasons": [why it cannot play]`);
  if (playable && ['box', 'edge', 'attach'].includes(m.place) && m.attach !== 'contour') {
    const s = m.size || {};
    if (!(s.aspect > 0)) e.push('size.aspect (width / height) must be a number > 0');
    if (!(s.maxW > 0 && s.maxW <= 1)) e.push('size.maxW must be a fraction of the frame width (0-1)');
    if (s.minW != null && s.minW > s.maxW) e.push('size.minW is bigger than size.maxW');
  }
  if (m.dur != null && !(m.dur > 0 && m.dur < 30)) e.push('dur must be seconds (0-30)');
  if (m.source && typeof m.source === 'object' && !m.source.type) e.push('source.type is missing');
  if (/^(CC-BY|GPL|AGPL|NC|unknown)/i.test(String(m.license || ''))) e.push(`license "${m.license}" is not allowed in this catalog (MIT, Apache-2.0, ISC, BSD, CC0, Remotion License, ours)`);
  if (m.props && typeof m.props !== 'object') e.push('props must be an object {field: what it is}');
  return e;
}

export const listCatalog = (metas = METAS) => Object.values(metas).sort((a, b) => (a.kind < b.kind ? -1 : 1));
