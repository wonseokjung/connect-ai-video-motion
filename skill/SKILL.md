---
name: connect-ai-video-motion
description: Put code-made motion graphics on top of the user's own talking-head video (name tag, key word, number counter, 1-2-3 steps, screen card with arrow, chapter line, end card). Use when the user says "put motion graphics on my video", "add graphics to this clip", "이 영상에 모션그래픽 얹어 줘", or gives a facecam / talking-head video and wants it to look edited. It never changes the person's pixels and never places anything on the face or body.
---

# connect-ai-video-motion

You turn the user's video into: `out/final.mp4` (video + graphics), and on request `out/overlay.mov` (transparent, for Premiere / CapCut / DaVinci) and `out/short_9x16.mp4`.
The kit is at the path in `.connect-ai-video-motion.json` next to this file (`kit`). Run its CLI with `node <kit>/bin/cli.mjs`.

## Rules you must keep
- Only what the speaker said. Every graphic comes from a word in `work/words.json` (or from `my-info.json`, which the user wrote). Never add numbers, claims or names they did not say.
- 1 to 4 words per graphic. Key word, number or thing. Never the whole sentence.
- Nothing on the face or body (shoulders, torso, hands). Do not use `pos` (forced position) unless the user asks; the kit places graphics in the empty space beside the person. Put hands, a microphone arm or anything else of the person in `plan.protect`.
- Do not edit the face, skin, or the video picture. No filters.
- Each kind once per video if you can (a 1 · 2 · 3 series counts as one).

## Steps
1. Make a project folder, put the video in `<project>/input/`. If the user has subtitles (.srt / .vtt from YouTube, CapCut, Premiere), put them next to it. Copy `<kit>/my-info.json` to `<project>/my-info.json` and fill in name, role, style (`connect`, `night`, `clean`), end card action.
2. `node <kit>/bin/cli.mjs analyze <project>`. Read what it printed:
   - face: if it says `guess (center)`, run `face-sheet`, open `out/face-sheet.jpg`, and write `<project>/input/face.json`:
     `{"width": W, "height": H, "source": "agent", "samples": [{"t": 0, "box": [x, y, w, h]}, ...]}` (pixels of the video, the whole head incl. hair, one sample per still). Then analyze again.
   - words: if it says tier C, ask the user for subtitles, or write `<project>/input/<name>.words.json` with word times if you can hear the audio: `[{"text": "Hi", "startMs": 600, "endMs": 800, "timestampMs": 700, "confidence": null}, ...]`.
3. `node <kit>/bin/cli.mjs plan <project>` writes `plan.json` from the words. Open it. Each line has `why`. Keep, delete or change lines. Lines under `suggestions` need a screen `target` [x, y] (0..1 of the frame) and maybe `zoom` [x, y, w, h]: look at the face sheet or a still to find them, then move them into `items`.
4. `node <kit>/bin/cli.mjs check <project> [--short]`. Read `out/report.md`. Fix every ERROR exactly as the sentence says, run check again until PASS. Advice is optional.
5. `node <kit>/bin/cli.mjs render <project> [--short] [--overlay]`. Open `out/sheet.jpg` (enter / peak / exit of every graphic, face box in red, body box in orange, graphic boxes in blue). Look at it. If one graphic looks wrong, fix its line and `render --only <id>`.
6. Tell the user where `out/final.mp4` is, and what the report says (tier of the speech timing, any hidden graphic).

## plan.json line
```json
{"id": "counter-3", "kind": "counter", "at": {"text": "three", "near": 7.9}, "value": "3", "unit": "tools"}
```
kinds: `nametag` (text, sub) · `keyword` (text) · `counter` (value, unit, label) · `steps` (value 1/2/3, text) · `card` (text, target, zoom, ring) · `chapter` (value, text) · `endcard` (text, sub; after the video)
optional: `slot` (`beside-left`, `beside-right`, `lower-left`, `lower-right`, `lower-band`, `top-left`, `top-right`, `top-banner`), `dur` (seconds).
`at` = `{text, near}`: the word and about when it is said. It survives small subtitle edits.
