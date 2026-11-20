---
name: connect-ai-video-motion
description: Put code-made motion graphics on top of the user's own talking-head video, from a catalog of 57 graphics (Remotion packages, HyperFrames blocks, Lottie files, body-aware graphics) or the user's own component, each called with one line, placed in empty space around the person (face, body and hands are measured and avoided). Use when the user says "put motion graphics on my video", "add graphics to this clip", "이 영상에 모션그래픽 얹어 줘", or gives a facecam / talking-head video and wants it to look edited. It never changes the person's pixels.
---

# connect-ai-video-motion

You turn the user's video into: `out/final.mp4` (video + graphics), and on request `out/overlay.mov` (transparent, for Premiere / CapCut / DaVinci) and `out/short_9x16.mp4`.
The kit is at the path in `.connect-ai-video-motion.json` next to this file (`kit`). Run its CLI with `node <kit>/bin/cli.mjs`.

## Rules you must keep
- Only what the speaker said. Every graphic comes from a word in `work/words.json` (or from `my-info.json`, which the user wrote). Never add numbers, claims or names they did not say.
- 1 to 4 words per graphic. Key word, number or thing. Never the whole sentence.
- Nothing on the face, body or hands. The kit measures them (macOS Vision, or MediaPipe) and places every graphic in empty space. Do not use `pos` unless the user asks. Things that are not the person (a microphone arm, a logo) go in `plan.protect`.
- Hand-following graphics (`body/hand-tag`, `body/finger-count`, `body/point-ray`) and graphics behind the person (`body/behind-text`, `remotion/light-leaks-glow`) are options, not the default. Use them only where the speaker really holds up a hand, counts, points, or where a set-piece word fits.
- Each design once per video (`family` in the catalog; check warns about repeats).
- Do not edit the face, skin, or the video picture. No filters.

## Steps
1. Make a project folder, put the video in `<project>/input/`, subtitles next to it if there are any. Copy `<kit>/my-info.json` to the project and fill in name, role, style (`connect`, `night`, `clean`).
2. `node <kit>/bin/cli.mjs analyze <project>`. It prints what it found: face, body (person, shoulders, hands in % of the video), words tier. If the face says `guess (center)`, run `face-sheet`, look at `out/face-sheet.jpg` and write `<project>/input/face.json`. If the body says "estimated from the face box", hands are unknown: mark them in `plan.protect` or set up MediaPipe (README).
3. `node <kit>/bin/cli.mjs catalog` lists every graphic: kind, use (keyword, number, steps, compare, quote, emphasis, pointer, label, title, body, background), place, licence. `body-sheet <project>` shows what the body detector saw.
4. `node <kit>/bin/cli.mjs plan <project>` writes a first `plan.json` from the words. Choose a catalog kind per line that fits what is said (a number → a number graphic, "before / after" → a compare graphic). Mix sources; do not repeat a family.
5. `node <kit>/bin/cli.mjs check <project> [--short]`. Read `out/report.md`. Fix every ERROR as the sentence says, run check again until PASS.
6. `node <kit>/bin/cli.mjs render <project> [--short] [--overlay]`. Open `out/sheet.jpg` (enter / peak / exit, measured person drawn). If one graphic looks wrong, change its line and `render --only <id>`.
7. Tell the user where `out/final.mp4` is and what the report says (speech timing tier, any hidden graphic and why).

## plan.json line
```json
{"id": "free", "kind": "remotion/rough-highlight", "at": {"text": "free", "near": 2.04}, "text": "Free", "dur": 1.6}
```
- `kind`: any catalog kind (`catalog` command); short names `nametag`, `keyword`, `counter`, `steps`, `card`, `chapter`, `endcard` still work.
- the user's own: `{"kind": "custom", "component": "./my/Thing.tsx"}` · `{"kind": "hyperframes", "src": "./block.html", "meta": {"window": [0, 3], "text": {".title": "text"}}}` · `{"kind": "lottie", "src": "./anim.json"}`. A folder of HyperFrames blocks: `hf-import <folder>`.
- fields per kind: `props` in the catalog (`text`, `sub`, `value`, `unit`, `label`, `color`, `hand`).
- optional: `slot`, `dur` (seconds), `scale` (1.3 = 30 % bigger), `behind` (`true` or `"head"`: type drawn big behind the person, split at a word boundary on both sides of him, macOS only), `side` (one word on the other side of the person, e.g. the unit of a number). `at` = `{text, near}` (the word and about when) or seconds.
