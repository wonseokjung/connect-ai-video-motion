# NOTICE

video-motion is CONNECT AI LAB's code (MIT, see LICENSE), built on Remotion. It is put together from the open-source parts below. Licence texts are in `licenses/`. "Adapted" = code was copied and changed; "idea" = no code copied.

## Parts and where they come from

| Part in this kit | Source (repo, commit) | Licence | How |
|---|---|---|---|
| `src/vendor/pico.mjs` face detector runtime (cascade unpack, scan, cluster, tilt sweep) | AhsanAyaz/ossclip `packages/core/src/face.ts` @ 49660fc2063467cf, itself a port of nenadmarkus/picojs | MIT (ossclip, `licenses/ossclip-MIT.txt`; pico, `licenses/pico-MIT.txt`) | Adapted: TypeScript to JavaScript, logic kept |
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

## Our own code

Face-relative slot engine (slide along the free side, chest band, size range, newest word wins) and its checks, contrast picking and the soft halo backing, plan draft from words, check + report, sheet and face sheet, the seven graphics' motion code, stand-in sample footage, CLI, skill installer (same pattern as our rea-biz-kit), scramble text, grain.

## Sample footage and voice

`public/sample/` and the demo projects use a code-drawn, front-facing illustrated presenter (no real person) made by `src/standin/` (ours, CC0). The voices are synthetic, made locally with Qwen3-TTS (Apache-2.0); the speakers "Alex Rivera" and "Mina Park" are made up. No real person's face or voice is in the npm package. The demo videos in `docs/demo/` (repository only) show the author with his permission.

## Remotion licence

Remotion is not MIT. Remotion License: free for individuals, for-profit companies with up to 3 employees, and non-profits; other companies need a Company License. Read https://github.com/remotion-dev/remotion/blob/main/LICENSE.md before using this kit at a company.

## Not used

remotion-dev/skills, remotion-dev/template-tiktok (no licence file). remotion-bits (MIT in package.json but no LICENSE file). Models from claude-video-effects / facecammaxxing (not downloaded).
