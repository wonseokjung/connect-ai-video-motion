// MediaPipe face probe (Windows / Linux, or macOS without Swift): one composition frame = one video frame image.
// It runs MediaPipe Face Detector (BlazeFace short range, tasks-vision, WASM on CPU) inside Remotion's own Chrome and
// prints one line "VMFACE {json}" per frame; lib/adapters/mediapipe-face.mjs collects the lines into work/face.json.
// The line is printed from a tiny function made with new Function, not from the bundle itself: Remotion echoes every
// console line that comes from its bundle to the terminal ("[Tab 0, ...] VMFACE ..."), whatever the log level.
// Lines from elsewhere still reach onBrowserLog, so the adapter reads them quietly (VM_VERBOSE=1 or --verbose shows them).
// The tasks-vision bundle, its wasm and the .tflite model are copied into work/vm-assets/mediapipe/ at run time.
import React, {useEffect, useMemo} from 'react';
import {continueRender, delayRender, staticFile, useCurrentFrame} from 'remotion';

export type FaceProbeProps = {frames: {t: number; file: string}[]};

// eslint-disable-next-line no-new-func
const say = new Function('m', 'console.debug(m)') as (m: string) => void;

let detector: Promise<any> | null = null;
const load = () => {
  if (detector) return detector;
  // MediaPipe's runtime writes its start-up notes (INFO: ..., I1121 ..., W1121 ...) to console.error, which Remotion
  // prints as errors. Send those to the quiet channel instead; real errors still go to console.error.
  const err = console.error.bind(console);
  console.error = (...a: unknown[]) => {
    const s = a.map(String).join(' ');
    if (/^(INFO: |[IW]\d{4} )/.test(s)) say('VMLOG ' + s);
    else err(...a);
  };
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
  // one hold per frame, not per tab: a tab renders many frames with the same component, and with a single hold the
  // later frames were not waited for, so the last lines could arrive after the render had ended (lost looks)
  const h = useMemo(() => delayRender(`MediaPipe face ${f}`, {timeoutInMilliseconds: 120000}), [f]);
  useEffect(() => {
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
      say('VMFACE ' + JSON.stringify({t: fr.t, w: img.naturalWidth, h: img.naturalHeight, faces}));
      continueRender(h);
    })().catch((e) => {
      say('VMFACE_ERROR ' + String(e?.message || e));
      continueRender(h);
    });
  }, [f, h]);
  return null;
};
