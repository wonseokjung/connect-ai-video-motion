// doctor: is this computer ready? Node, Remotion (with its own ffmpeg), the browser Remotion uses, face adapters.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {ffmpeg} from './ffmpeg.mjs';
import {KIT} from './analyze.mjs';

export async function doctor(log = console.log) {
  let ok = true;
  const line = (good, what, how = '') => {
    log(`  ${good ? 'ok  ' : 'MISS'} ${what}${!good && how ? '  -> ' + how : ''}`);
    if (!good && how) ok = false;
  };
  const major = +process.versions.node.split('.')[0];
  line(major >= 18, `Node ${process.versions.node}`, 'install Node 18 or newer from nodejs.org');
  let rv = null;
  try { rv = JSON.parse(fs.readFileSync(path.join(KIT, 'node_modules', 'remotion', 'package.json'), 'utf8')).version; } catch {}
  line(!!rv, `Remotion ${rv || ''}`, 'run npm install in the kit folder');
  try { await ffmpeg(['-version']); line(true, 'ffmpeg (inside Remotion)'); } catch (e) { line(false, 'ffmpeg (inside Remotion)', 'run npm install again'); }
  const mac = os.platform() === 'darwin';
  let swift = false;
  if (mac) try { execFileSync('swift', ['--version'], {stdio: 'ignore'}); swift = true; } catch {}
  log(`  ${mac && swift ? 'ok  ' : '--  '} face adapter a: macOS Vision${mac && swift ? '' : ' (macOS with Xcode tools only)'}`);
  const mpf = await import('./adapters/mediapipe-face.mjs');
  const {missing: mpMissing} = mpf.mediapipeFaceFiles();
  log(`  ${mpMissing.length ? '--  ' : 'ok  '} face adapter b: MediaPipe face detector (Windows, Linux, any computer)${mpMissing.length ? ` (missing ${mpMissing.join(', ')}; run npm install again)` : ''}`);
  log('  ok   face adapter c: your agent marks the face on a still sheet (face-sheet)');
  log('  ok   face adapter d: "face": "left" | "center" | "right" in my-info.json');
  log('  ok   words: .srt / .vtt next to your video (tier B), or .words.json with word times (tier A)');
  log('  --   words: local whisper (not shipped; see README roadmap)');
  log(ok ? 'Ready.' : 'Fix the MISS lines, then run doctor again.');
  return ok;
}
