// ffmpeg / ffprobe = the copies that ship inside Remotion (`npx remotion ffmpeg`). Nothing else to install.
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
let CLI;
const cli = () => {
  if (CLI) return CLI;
  let d = path.dirname(require.resolve('@remotion/cli'));
  while (!fs.existsSync(path.join(d, 'remotion-cli.js')) && d !== path.dirname(d)) d = path.dirname(d);
  return (CLI = path.join(d, 'remotion-cli.js'));
};

export const cliPath = () => cli();

function run(tool, args, {binary = false} = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(process.execPath, [cli(), tool, ...args], {stdio: ['ignore', 'pipe', 'pipe']});
    const out = [], err = [];
    p.stdout.on('data', (d) => out.push(d));
    p.stderr.on('data', (d) => err.push(d));
    p.on('error', reject);
    p.on('close', (code) => {
      const buf = Buffer.concat(out);
      if (code !== 0) return reject(new Error(`${tool} failed (${code}): ${Buffer.concat(err).toString().slice(-600)}`));
      resolve(binary ? buf : buf.toString());
    });
  });
}
export const ffmpeg = (args, opts) => run('ffmpeg', ['-hide_banner', '-loglevel', 'error', ...args], opts);
export const ffprobe = (args) => run('ffprobe', ['-v', 'error', ...args]);

export async function probe(file) {
  const j = JSON.parse(await ffprobe(['-print_format', 'json', '-show_streams', '-show_format', file]));
  const v = j.streams.find((s) => s.codec_type === 'video');
  const a = j.streams.find((s) => s.codec_type === 'audio');
  if (!v) throw new Error(`${file}: no video stream`);
  const rate = (r) => {
    const [n, d] = String(r || '0/1').split('/').map(Number);
    return d ? n / d : 0;
  };
  const rot = Number(v.tags?.rotate || v.side_data_list?.find((x) => x.rotation != null)?.rotation || 0);
  const r = rate(v.r_frame_rate), avg = rate(v.avg_frame_rate);
  return {
    width: v.width, height: v.height, codec: v.codec_name, pixFmt: v.pix_fmt,
    fps: avg || r, vfr: Math.abs(r - avg) > 0.05, rotation: ((rot % 360) + 360) % 360,
    hdr: /smpte2084|arib-std-b67/.test(v.color_transfer || '') || /bt2020/.test(v.color_primaries || ''),
    duration: Number(j.format.duration || v.duration || 0), audio: !!a,
  };
}

// One grayscale or RGB frame as raw pixels (for face detection and brightness).
export const grabRaw = (file, t, {w = 360, fmt = 'gray', crop = null} = {}) =>
  ffmpeg(['-ss', t.toFixed(3), '-i', file, '-frames:v', '1', '-vf', `${crop ? `crop=${crop.map(Math.round).join(':')},` : ''}scale=${w}:-2`, '-pix_fmt', fmt, '-c:v', 'rawvideo', '-f', 'image2pipe', '-'], {binary: true});

// Mean colour of a box (source px) at time t: crop, then average down to 1 pixel.
export async function meanRgb(file, t, box) {
  const b = await ffmpeg(['-ss', t.toFixed(3), '-i', file, '-frames:v', '1', '-vf', `crop=${box.map((v) => Math.max(2, Math.round(v))).join(':')},scale=1:1:flags=area`, '-pix_fmt', 'rgb24', '-c:v', 'rawvideo', '-f', 'image2pipe', '-'], {binary: true});
  return [b[0], b[1], b[2]];
}

// Voice loudness per video frame (0..1), from 16 kHz mono PCM.
export async function loudness(file, fps = 30) {
  const wav = await ffmpeg(['-i', file, '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', '-f', 'wav', '-'], {binary: true});
  const pcm = wav.subarray(wav.indexOf('data') + 8); // skip the WAV header (the bundled ffmpeg has no raw muxer)
  const n = Math.floor(pcm.length / 2), hop = Math.round(16000 / fps), out = [];
  for (let i = 0; i + hop <= n; i += hop) {
    let s = 0;
    for (let j = 0; j < hop; j++) {
      const x = pcm.readInt16LE((i + j) * 2) / 32768;
      s += x * x;
    }
    out.push(Math.sqrt(s / hop));
  }
  const peak = Math.max(1e-6, ...out);
  return out.map((x) => +(x / peak).toFixed(3));
}
