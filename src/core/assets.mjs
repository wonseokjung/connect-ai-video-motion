// Where a HyperFrames / Lottie file of a plan line is served from (work/vm-assets/<name>). Same answer in Node and in the browser.
const hash = (s) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return h.toString(36);
};
export function assetName(kind, file) {
  const ext = String(file).split('.').pop();
  if (kind === 'hyperframes' || kind === 'lottie') return `user_${kind}_${hash(String(file))}.${ext}`;
  return `${String(kind).replace(/[^a-z0-9-]+/gi, '__')}__${String(file).replace(/[^a-z0-9.-]+/gi, '_')}`;
}
