// MediaPipe body probe (Windows / Linux, or macOS without Swift): one composition frame = one video frame image.
// It runs MediaPipe Pose + Hands (tasks-vision, WASM on CPU) inside Remotion's own Chrome and prints one line
// "VMBODY {json}" per frame; lib/adapters/mediapipe-body.mjs collects the lines into work/body.json.
// Nothing here is bundled from npm: the tasks-vision bundle, its wasm and the two .task models are copied into
// work/vm-assets/mediapipe/ and loaded from there at run time.
import React, {useEffect, useState} from 'react';
import {continueRender, delayRender, staticFile, useCurrentFrame} from 'remotion';

export type ProbeProps = {frames: {t: number; file: string}[]; width: number; height: number; grid?: [number, number]};

const POSE = ['nose', 'leftEyeInner', 'leftEye', 'leftEyeOuter', 'rightEyeInner', 'rightEye', 'rightEyeOuter', 'leftEar', 'rightEar', 'mouthLeft', 'mouthRight', 'leftShoulder', 'rightShoulder', 'leftElbow', 'rightElbow', 'leftWrist', 'rightWrist'];
const KEEP = new Set(['nose', 'leftEye', 'rightEye', 'leftEar', 'rightEar', 'leftShoulder', 'rightShoulder', 'leftElbow', 'rightElbow', 'leftWrist', 'rightWrist']);
const HAND = ['wrist', 'thumbCMC', 'thumbMP', 'thumbIP', 'thumbTip', 'indexMCP', 'indexPIP', 'indexDIP', 'indexTip', 'middleMCP', 'middlePIP', 'middleDIP', 'middleTip', 'ringMCP', 'ringPIP', 'ringDIP', 'ringTip', 'littleMCP', 'littlePIP', 'littleDIP', 'littleTip'];

let models: Promise<any> | null = null;
const load = () => {
  if (models) return models;
  const base = staticFile('vm-assets/mediapipe/');
  models = (async () => {
    const mp: any = await import(/* webpackIgnore: true */ base + 'vision_bundle.mjs');
    const vision = await mp.FilesetResolver.forVisionTasks(base + 'wasm');
    const pose = await mp.PoseLandmarker.createFromOptions(vision, {baseOptions: {modelAssetPath: base + 'pose_landmarker_lite.task', delegate: 'CPU'}, runningMode: 'IMAGE', numPoses: 1, outputSegmentationMasks: true});
    const hands = await mp.HandLandmarker.createFromOptions(vision, {baseOptions: {modelAssetPath: base + 'hand_landmarker.task', delegate: 'CPU'}, runningMode: 'IMAGE', numHands: 2});
    return {pose, hands};
  })();
  return models;
};

const hex = (bits: number[]) => {
  let s = '';
  for (let i = 0; i < bits.length; i += 4) s += ((bits[i] << 3) | (bits[i + 1] << 2) | (bits[i + 2] << 1) | bits[i + 3]).toString(16);
  return s;
};

export const MediaPipeProbe: React.FC<ProbeProps> = ({frames, width: W, height: H, grid = [64, 36]}) => {
  const f = useCurrentFrame();
  const fr = frames[f];
  const [h] = useState(() => delayRender(`MediaPipe frame ${f}`, {timeoutInMilliseconds: 120000}));
  useEffect(() => {
    let done = false;
    (async () => {
      const img = new Image();
      img.src = staticFile(fr.file);
      await img.decode();
      const {pose, hands} = await load();
      const p = pose.detect(img);
      const hr = hands.detect(img);
      const joints: Record<string, number[]> = {};
      const lm = p.landmarks?.[0];
      if (lm) POSE.forEach((n, i) => { if (KEEP.has(n) && lm[i]) joints[n] = [+(lm[i].x * W).toFixed(1), +(lm[i].y * H).toFixed(1), +(lm[i].visibility ?? 0.5).toFixed(3)]; });
      // MediaPipe names handedness as if the picture were mirrored (selfie view); a normal camera picture is not
      const out = (hr.landmarks || []).map((pts: any[], k: number) => {
        const cat = hr.handedness?.[k]?.[0] || hr.handednesses?.[k]?.[0];
        const o: Record<string, number[]> = {};
        pts.forEach((q, i) => (o[HAND[i]] = [+(q.x * W).toFixed(1), +(q.y * H).toFixed(1), +(cat?.score ?? 0.8).toFixed(3)]));
        return {side: cat?.categoryName === 'Left' ? 'right' : 'left', conf: +(cat?.score ?? 0.8).toFixed(3), pts: o};
      });
      let person = null;
      const m = p.segmentationMasks?.[0];
      if (m) {
        const a: Float32Array = m.getAsFloat32Array();
        const mw = m.width, mh = m.height, [gw, gh] = grid;
        const rows: string[] = [];
        let on = 0;
        for (let gy = 0; gy < gh; gy++) {
          const bits: number[] = [];
          for (let gx = 0; gx < gw; gx++) {
            const x0 = Math.floor((gx * mw) / gw), x1 = Math.floor(((gx + 1) * mw) / gw), y0 = Math.floor((gy * mh) / gh), y1 = Math.floor(((gy + 1) * mh) / gh);
            let c = 0, n = 0;
            for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { n++; if (a[y * mw + x] > 0.5) c++; }
            const b = n && c / n >= 0.02 ? 1 : 0;
            bits.push(b);
            on += b;
          }
          rows.push(hex(bits));
        }
        person = {bbox: null, cover: +(on / (gw * gh)).toFixed(3), rows};
        m.close?.();
      }
      console.debug('VMBODY ' + JSON.stringify({t: fr.t, joints, hands: out, person}));
      if (!done) continueRender(h);
    })().catch((e) => {
      console.debug('VMBODY_ERROR ' + String(e?.message || e));
      continueRender(h);
    });
    return () => { done = true; };
  }, [f]);
  return null;
};
