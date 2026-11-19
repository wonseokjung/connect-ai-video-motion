// Dev tool: builds the stand-in sample clips (code-drawn silhouette + synthetic voice) and their inputs.
// usage: node tools/make-samples.mjs <voiceDir>   (voiceDir has <name>.wav + <name>.json from our TTS step)
import fs from 'node:fs';
import path from 'node:path';
import {renderComp} from '../lib/render.mjs';
import {loudness} from '../lib/ffmpeg.mjs';
import {pose, faceBox} from '../src/standin/motion.mjs';
import {KIT} from '../lib/analyze.mjs';

const voiceDir = path.resolve(process.argv[2]);
const names = (process.argv[3] || 'sample10,intro20,steps15,screen20').split(',');
const srtTime = (t) => {
  const ms = Math.round(t * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`;
};
for (const name of names) {
  const cue = JSON.parse(fs.readFileSync(path.join(voiceDir, name + '.json'), 'utf8'));
  const env = await loudness(path.join(voiceDir, name + '.wav'), 30);
  const outDir = name === 'sample10' ? path.join(KIT, 'public', 'sample') : path.join(KIT, 'projects', 'demo-' + name, 'input');
  fs.mkdirSync(outDir, {recursive: true});
  const video = path.join(outDir, `${name}.mp4`);
  const t0 = Date.now();
  await renderComp({work: voiceDir}, 'StandIn', {variant: name, env, audio: name + '.wav', seconds: cue.duration}, video, name === 'sample10' ? {scale: 2 / 3, crf: 24} : {crf: 20});
  // subtitles (sentence level, like a YouTube / CapCut export)
  fs.writeFileSync(path.join(outDir, `${name}.srt`), cue.cues.map((c, i) => `${i + 1}\n${srtTime(c.start)} --> ${srtTime(c.end)}\n${c.text}\n`).join('\n'));
  // exact face boxes from the same motion function that drew the clip
  const samples = [];
  for (let t = 0; t <= cue.duration + 1e-6; t += 0.25) samples.push({t: +t.toFixed(2), box: faceBox(pose(name, t, env, 30)).map((v) => +v.toFixed(1)), conf: 1});
  fs.writeFileSync(path.join(outDir, 'face.json'), JSON.stringify({width: 1920, height: 1080, source: 'sample generator (exact head box of the stand-in)', samples}, null, 1));
  console.log(name, ((Date.now() - t0) / 1000).toFixed(0) + ' s', path.relative(KIT, video));
}
