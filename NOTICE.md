# NOTICE

connect-ai-video-motion is CONNECT AI LAB's code (MIT, see LICENSE), built on Remotion. It is put together from the open-source parts below. Licence texts are in `licenses/`. "Adapted" = code was copied and changed; "idea" = no code copied.

## Parts and where they come from

| Part in this kit | Source (repo, commit) | Licence | How |
|---|---|---|---|
| `src/core/layout.mjs` rules "one box for a graphic's whole window" and "no room = drop and report, never squeeze" | AhsanAyaz/ossclip `packages/scenes/src/overlay-rect.ts`, `overlay-room.ts` @ 49660fc | MIT | Idea; our own placement code (face-relative slots) |
| `src/vendor/facecam.mjs` 9:16 platform zones (top 250, rail x 940 from y 864, captions under 1536), number reading and K/M format | aaksa/facecammaxxing `remotion/src/lib/layout.ts`, `effects/guide.tsx` @ a9976a70b02c | MIT, `licenses/facecammaxxing-MIT.txt` | Adapted |
| `src/vendor/hf.mjs` hand-wobble arrow (`hwHash`, arrow path) | heygen-com/hyperframes `registry/components/hw-arrow/hw-arrow.html` @ e383abf475b6 | Apache-2.0, `licenses/hyperframes-Apache-2.0.txt` | Adapted: point A to point B instead of a fixed box, no GSAP |
| `src/vendor/hf.mjs` digit strips for the counter | hyperframes `registry/components/number-wheel/number-wheel.html` @ e383abf475b6 | Apache-2.0 | Adapted |
| Name tag order (accent bar, name rises out of a mask, baseline draws, role slides in) | hyperframes `registry/blocks/lt-kicker-name` @ e383abf475b6 | Apache-2.0 | Structure adapted to React; our type and colours |
| 1 · 2 · 3 entry (one scale + one blur resolving) | hyperframes `registry/components/focus-blur-resolve` @ e383abf475b6 | Apache-2.0 | Idea |
| Key word: letters rising one by one out of a mask, one light sweep | hyperframes `registry/components/bottom-up-letters`, `light-sweep-pass` @ e383abf475b6 | Apache-2.0 | Idea; our own `RiseLetters` and mask sweep |
| End card order (words rise one by one, then the action) | hyperframes `registry/components/cta-close` @ e383abf475b6 | Apache-2.0 | Idea |
| `src/styles/presets.mjs` timing: enter 12, opacity 6, blur 7, exit 13 frames; ease out landing, accelerate leaving | Tejashmakwana/motionmaxxing @ 8c8ec0f2a6f6 | Apache-2.0, `licenses/motionmaxxing-Apache-2.0.txt` | Numbers used |
| Still sheet loop (render, stills, look, fix) | VideoZero/skills | Apache-2.0 | Idea |
| Plan file "at this moment, show this" | feicaiclub/video-spec-builder | MIT | Idea; our own format (`at: {text, near}`) |
| Talking video + code graphics flow, face + word timing | AhsanAyaz/ossclip | MIT | Idea. ossclip already does face + word timing + code graphics; see README for how we differ |

## Official Remotion packages used as they are

remotion, @remotion/cli, @remotion/bundler, @remotion/renderer (render + the ffmpeg inside it), @remotion/captions (`parseSrt`, Caption shape of words.json), @remotion/layout-utils (`fitText`), @remotion/paths (`evolvePath`), @remotion/rough-notation (`Underline`, `Circle`), @remotion/transitions (`fade` into the end card), @remotion/google-fonts (Inter, SIL Open Font License). All 4.0.529.

## 0.2: catalog, adapters and body detector

| Part | Source | Licence | How |
|---|---|---|---|
| `catalog/remotion/*` (35 items) | official Remotion packages 4.0.529: @remotion/paths, shapes, rough-notation, rounded-text-box, layout-utils, animation-utils, captions, noise, motion-blur, gsap, three, transitions, light-leaks, starburst, svg-3d-engine, mac-cursors | MIT: paths, shapes, rough-notation, rounded-text-box, layout-utils, captions, noise, motion-blur, gsap, three; animation-utils (LICENSE.md, MIT, Chetan Karwa). Remotion License: light-leaks, starburst, mac-cursors, lottie; transitions and svg-3d-engine (package.json says UNLICENSED / nothing, shipped under the Remotion License like remotion itself) | Used as they are; the components around them are ours |
| 3D coin | three 0.170.0, @react-three/fiber 9.3.0 | MIT | Used as they are |
| GSAP letters, HyperFrames adapter | gsap 3.15.0 and its plugins (SplitText, ScrambleTextPlugin, DrawSVGPlugin) | GreenSock standard no-charge license, https://gsap.com/standard-license (not OSI) | Used as they are, from the installed package (never a CDN) |
| `catalog/hyperframes/warm-grain-*` (4 playable + 2 listed) | heygen-com/hyperframes, npm `hyperframes@0.8.86` `dist/templates/warm-grain/` | Apache-2.0, `licenses/hyperframes-Apache-2.0.txt` | Unchanged copies of `graphics.html`, `intro.html`, `captions.html`, `index.html`; the adapter plays parts of them (window, crop, text in `meta.json`) |
| `catalog/hyperframes/{gold-scramble-title,split-words-rise,ring-count}` | ours, written in the HyperFrames format | MIT | Ours |
| `src/adapters/HyperFrames.tsx` (iframe, seek every frame) | same idea as @remotion/gsap and the HyperFrames runtime (`window.__timelines`, `data-start`) | ours, MIT | Idea; our own code |
| `src/adapters/Lottie.tsx` | @remotion/lottie 4.0.529 + lottie-web 5.13.0 | Remotion License / MIT | Used as they are |
| `catalog/lottie/*` | ours, made by `tools/make-lottie.mjs` | MIT | Ours |
| `lib/adapters/vision-body.swift` | Apple Vision (VNDetectHumanBodyPoseRequest, VNDetectHumanHandPoseRequest, VNGeneratePersonSegmentationRequest), part of macOS | system framework | Ours (calls the system API) |
| `lib/adapters/mediapipe-face.mjs`, `src/fm/MediaPipeFaceProbe.tsx` | MediaPipe tasks-vision 1.2.2 (Face Detector) and `blaze_face_short_range.tflite`, Google | Apache-2.0, `licenses/mediapipe-Apache-2.0.txt` | Package installed as a dependency; the face model ships unchanged in `models/mediapipe/`; the adapter code is ours |
| `lib/adapters/mediapipe-body.mjs`, `src/fm/MediaPipeProbe.tsx` | MediaPipe tasks-vision (Pose, Hands), Google | Apache-2.0 | The package comes with the kit; the two body models are downloaded by you (README "Face and body on Windows and Linux") |
| `catalog/body/*`, `src/core/body.mjs` (person grid, hand track, finger count, outline) | ours | MIT | Ours |

Not in the package: the full HyperFrames registry (heygen-com/hyperframes `registry/` at 6bd0b5d8, 456 items, Apache-2.0; its images, sounds and 3D files may carry their own terms, so `hf-import` copies the block HTML only), MediaPipe pose and hand models.

## Our own code

Face-relative slot engine (slide along the free side, chest band, size range, newest word wins) and its checks, contrast picking and the soft halo backing, plan draft from words, check + report, sheet and face sheet, the seven graphics' motion code, stand-in sample footage, CLI, skill installer (same pattern as our rea-biz-kit), scramble text, grain.

## Sample footage and voice

`public/sample/` and the demo projects use a code-drawn, front-facing illustrated presenter (no real person) made by `src/standin/` (ours, CC0). The voices are synthetic, made locally with Qwen3-TTS (Apache-2.0); the speakers "Alex Rivera" and "Mina Park" are made up. No real person's face or voice is in the npm package. The demo videos in `docs/demo/` (repository only) show the author with his permission.

## Remotion licence

Remotion is not MIT. Remotion License: free for individuals, for-profit companies with up to 3 employees, and non-profits; other companies need a Company License. Read https://github.com/remotion-dev/remotion/blob/main/LICENSE.md before using this kit at a company.

## Not used

remotion-dev/skills, remotion-dev/template-tiktok (no licence file). remotion-bits (MIT in package.json but no LICENSE file). Models from claude-video-effects / facecammaxxing (not downloaded).
