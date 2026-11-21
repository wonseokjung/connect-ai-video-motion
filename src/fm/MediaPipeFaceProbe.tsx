// MediaPipe face probe (Windows / Linux, or macOS without Swift): one composition frame = one video frame image.
// It runs MediaPipe Face Detector (BlazeFace short range, tasks-vision, WASM on CPU) inside Remotion's own Chrome and
// prints one line "VMFACE {json}" per frame (console.debug, so Remotion does not echo it); lib/adapters/mediapipe-face.mjs collects the lines into work/face.json.
// The tasks-vision bundle, its wasm and the .tflite model are copied into work/vm-assets/mediapipe/ at run time.
import React, {useEffect, useState} from 'react';
import {continueRender, delayRender, staticFile, useCurrentFrame} from 'remotion';

export type FaceProbeProps = {frames: {t: number; file: string}[]};

let detector: Promise<any> | null = null;
const load = () => {
  if (detector) return detector;
  const base = staticFile('vm-assets/mediapipe/');
  detector = (async () => {
    const mp: any = await import(/* webpackIgnore: true */ base + 'vision_bundle.mjs');
    const vision = await mp.FilesetResolver.forVisionTasks(base + 'wasm');
    return mp.FaceDetector.createFromOptions(vision, {baseOptions: {modelAssetPath: base + 'blaze_face_short_range.tflite', delegate: 'CPU'}, runningMode: 'IMAGE', minDetectionConfidence: 0.5});
  })();
  return detector;
};

export const MediaPipeFaceProbe: React.FC<FaceProbeProps> = ({frames}) => {
  const f = useCurrentFrame();
  const fr = frames[f];
  const [h] = useState(() => delayRender(`MediaPipe face ${f}`, {timeoutInMilliseconds: 120000}));
  useEffect(() => {
    let done = false;
    (async () => {
      const img = new Image();
      img.src = staticFile(fr.file);
      await img.decode();
      const det = await load();
      const r = det.detect(img);
      // every face, in picture pixels: [x, y, w, h, score]
      const faces = (r.detections || []).map((d: any) => {
        const b = d.boundingBox;
        return [b.originX, b.originY, b.width, b.height, d.categories?.[0]?.score ?? 0].map((v: number) => +v.toFixed(2));
      });
      console.debug('VMFACE ' + JSON.stringify({t: fr.t, w: img.naturalWidth, h: img.naturalHeight, faces}));
      if (!done) continueRender(h);
    })().catch((e) => {
      console.debug('VMFACE_ERROR ' + String(e?.message || e));
      continueRender(h);
    });
    return () => { done = true; };
  }, [f]);
  return null;
};
