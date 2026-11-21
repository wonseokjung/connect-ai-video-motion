# connect-ai-video-motion

**CONNECT AI LAB 이 만든 오픈소스 · 모두를 위한 AI 교육.** 쓰임은 하나입니다. 내 영상 위에 모션그래픽을 올릴 때 쓰는 도구.

```bash
npx github:wonseokjung/connect-ai-video-motion demo
```

<img src="docs/terminal.png" width="640" alt="터미널에서 보이는 화면">

[![만든 사람의 실제 영상 위 그래픽 57종](docs/hero.webp)](docs/index.html)

**[카탈로그 페이지 열기](docs/index.html)**: 그래픽 57종을 실제 영상 위 살아 있는 클립으로, 출처별로 골라 보고, 코딩 에이전트에게 줄 프롬프트를 복사합니다.

**모든 모션그래픽 생태계를 한 줄로 불러서, 내 주변 빈자리에.** Remotion 패키지, HyperFrames 블록, Lottie 파일, 내가 만든 컴포넌트가 모두 하나의 층을 지나갑니다. 이 층은 내 얼굴 · 몸 · 손이 어디 있는지 알고, 그래픽마다 좋은 빈자리를 찾고, 스스로 검사합니다.

```mermaid
flowchart LR
  R["Remotion 패키지<br/>paths · shapes · rough-notation · transitions<br/>noise · motion-blur · three · gsap · light-leaks ..."] --> C
  H["HyperFrames 블록<br/>HTML + CSS + GSAP 타임라인"] --> C
  L["Lottie 파일<br/>After Effects / LottieFiles"] --> C
  U["내 .tsx 컴포넌트"] --> C
  C["카탈로그<br/>공통 meta.json 규격<br/>{ kind: ... }"] --> E
  F["내 영상<br/>얼굴 · 몸 · 손 · 말"] --> E
  E["얼굴 + 몸 인식 층<br/>빈자리 찾기 · 사람 피하기 · 검사"] --> O["final.mp4 · overlay.mov · report"]
```

MMA 가 여러 무술의 좋은 기술을 하나로 이어 붙였듯이, 이 키트는 그래픽 라이브러리를 하나 더 만들지 않습니다. 이미 있는 것들을 이어서, 어느 것이든 `plan.json` 한 줄이 되게 합니다.

```json
{"kind": "remotion/rough-highlight", "at": {"text": "무료로", "near": 2.0}, "text": "Free"}
{"kind": "hyperframes/split-words-rise", "at": 7.6, "text": "More colorful"}
{"kind": "lottie/gold-check", "at": 9.9}
{"kind": "custom", "component": "./my/Thing.tsx", "at": 4.2, "text": "Mine"}
```

**사람 픽셀은 한 점도 바꾸지 않습니다.** 기본값은 얼굴 · 몸 · 손(1초에 15번 측정)을 피해 빈자리에 놓는 것입니다. 손을 따라다니는 그래픽, 사람 뒤에 서는 그래픽도 있지만 카탈로그의 선택지 몇 개일 뿐 기본값이 아닙니다.

> **라이선스.** 이 키트는 MIT 입니다. 바탕인 [Remotion](https://www.remotion.dev) 은 MIT 가 아닙니다. 개인, 직원 3명 이하 회사, 비영리는 무료이고 그 밖의 회사는 Remotion Company License 가 필요합니다([LICENSE.md](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md)). 카탈로그 일부는 같은 Remotion License 패키지를 쓰고, HyperFrames 블록은 Apache-2.0, GSAP 는 GreenSock 의 standard no-charge license 입니다. 항목마다 `meta.json` 에 라이선스가 적혀 있고 전체 목록은 [NOTICE.md](NOTICE.md) 에 있습니다.

위 영상과 [카탈로그 페이지](docs/index.html)의 모든 클립은 만든 사람의 실제 영상입니다(방 네 곳, 빛 네 가지, 허락하에 실었습니다). 그래픽 하나가 `plan.json` 한 줄이고, 화면 글자는 그 클립에서 그가 한 말입니다(한국어, 화면은 영어). 손 위치를 손으로 적은 상자는 없습니다. 몸 인식이 찾았습니다.


<!-- gallery:start -->
## 예제 갤러리: 57개 그래픽, 하나에 plan.json 한 줄

전부 이 키트로 만든 것입니다. 영상은 만든 사람(AI 멘토 제이)의 실제 촬영본이고, 화면 글자는 그 장면에서 실제로 한 말입니다. 얼굴 픽셀은 하나도 바뀌지 않았습니다.

<p align="center"><img src="docs/gallery/_compare.webp" width="720" alt="같은 그래픽: 고정 자리 vs 얼굴 기준"><br><sub>같은 그래픽. 왼쪽은 한 자리에 고정(화면 밖으로 잘림), 오른쪽은 얼굴 기준으로 자리를 찾음.</sub></p>

### Body aware · 5

몸과 손 위치를 아는 그래픽.

<table>
<tr><td width="33%" valign="top"><img src="docs/gallery/body-behind-text.webp" width="100%" alt="Word behind you"><br><b>Word behind you</b><br><code>body/behind-text</code></td><td width="33%" valign="top"><img src="docs/gallery/body-contour-line.webp" width="100%" alt="Line around you"><br><b>Line around you</b><br><code>body/contour-line</code></td><td width="33%" valign="top"><img src="docs/gallery/body-finger-count.webp" width="100%" alt="Finger count stamp"><br><b>Finger count stamp</b><br><code>body/finger-count</code></td></tr>
<tr><td width="33%" valign="top"><img src="docs/gallery/body-hand-tag.webp" width="100%" alt="Tag on the hand"><br><b>Tag on the hand</b><br><code>body/hand-tag</code></td><td width="33%" valign="top"><img src="docs/gallery/body-point-ray.webp" width="100%" alt="Ray from your finger"><br><b>Ray from your finger</b><br><code>body/point-ray</code></td></tr>
</table>

### Remotion · 35

Remotion 공식 패키지: 경로, 도형, 손그림, three, GSAP, 전환.

<table>
<tr><td width="33%" valign="top"><img src="docs/gallery/remotion-animation-utils-chip.webp" width="100%" alt="Chip to card"><br><b>Chip to card</b><br><code>remotion/animation-utils-chip</code></td><td width="33%" valign="top"><img src="docs/gallery/remotion-captions-karaoke.webp" width="100%" alt="Words lit in time"><br><b>Words lit in time</b><br><code>remotion/captions-karaoke</code></td><td width="33%" valign="top"><img src="docs/gallery/remotion-gsap-letters.webp" width="100%" alt="Letters fold up (GSAP)"><br><b>Letters fold up (GSAP)</b><br><code>remotion/gsap-letters</code></td></tr>
<tr><td width="33%" valign="top"><img src="docs/gallery/remotion-layout-fit-word.webp" width="100%" alt="Fit-to-space word"><br><b>Fit-to-space word</b><br><code>remotion/layout-fit-word</code></td><td width="33%" valign="top"><img src="docs/gallery/remotion-light-leaks-glow.webp" width="100%" alt="Light leak behind you"><br><b>Light leak behind you</b><br><code>remotion/light-leaks-glow</code></td><td width="33%" valign="top"><img src="docs/gallery/remotion-mac-cursor-click.webp" width="100%" alt="Cursor clicks a button"><br><b>Cursor clicks a button</b><br><code>remotion/mac-cursor-click</code></td></tr>
<tr><td width="33%" valign="top"><img src="docs/gallery/remotion-motion-blur-trail.webp" width="100%" alt="Fast word with trail"><br><b>Fast word with trail</b><br><code>remotion/motion-blur-trail</code></td><td width="33%" valign="top"><img src="docs/gallery/remotion-noise-jitter-word.webp" width="100%" alt="Jitter to clean word"><br><b>Jitter to clean word</b><br><code>remotion/noise-jitter-word</code></td><td width="33%" valign="top"><img src="docs/gallery/remotion-noise-topo-label.webp" width="100%" alt="Contour map label"><br><b>Contour map label</b><br><code>remotion/noise-topo-label</code></td></tr>
<tr><td width="33%" valign="top"><img src="docs/gallery/remotion-paths-brackets.webp" width="100%" alt="Square brackets"><br><b>Square brackets</b><br><code>remotion/paths-brackets</code></td><td width="33%" valign="top"><img src="docs/gallery/remotion-paths-journey.webp" width="100%" alt="Journey A to B"><br><b>Journey A to B</b><br><code>remotion/paths-journey</code></td><td width="33%" valign="top"><img src="docs/gallery/remotion-paths-morph.webp" width="100%" alt="Shape morph, before to after"><br><b>Shape morph, before to after</b><br><code>remotion/paths-morph</code></td></tr>
<tr><td width="33%" valign="top"><img src="docs/gallery/remotion-paths-signal.webp" width="100%" alt="Signal wave"><br><b>Signal wave</b><br><code>remotion/paths-signal</code></td><td width="33%" valign="top"><img src="docs/gallery/remotion-paths-swoosh.webp" width="100%" alt="Swoosh underline"><br><b>Swoosh underline</b><br><code>remotion/paths-swoosh</code></td><td width="33%" valign="top"><img src="docs/gallery/remotion-rough-box.webp" width="100%" alt="Pen box"><br><b>Pen box</b><br><code>remotion/rough-box</code></td></tr>
<tr><td width="33%" valign="top"><img src="docs/gallery/remotion-rough-bracket-list.webp" width="100%" alt="Bracket list"><br><b>Bracket list</b><br><code>remotion/rough-bracket-list</code></td><td width="33%" valign="top"><img src="docs/gallery/remotion-rough-highlight.webp" width="100%" alt="Highlighter"><br><b>Highlighter</b><br><code>remotion/rough-highlight</code></td><td width="33%" valign="top"><img src="docs/gallery/remotion-rough-strike.webp" width="100%" alt="Strike out"><br><b>Strike out</b><br><code>remotion/rough-strike</code></td></tr>
<tr><td width="33%" valign="top"><img src="docs/gallery/remotion-rounded-message.webp" width="100%" alt="Message bubble"><br><b>Message bubble</b><br><code>remotion/rounded-message</code></td><td width="33%" valign="top"><img src="docs/gallery/remotion-shapes-arrow.webp" width="100%" alt="Arrow with a word"><br><b>Arrow with a word</b><br><code>remotion/shapes-arrow</code></td><td width="33%" valign="top"><img src="docs/gallery/remotion-shapes-bars.webp" width="100%" alt="Rising bars"><br><b>Rising bars</b><br><code>remotion/shapes-bars</code></td></tr>
<tr><td width="33%" valign="top"><img src="docs/gallery/remotion-shapes-callout.webp" width="100%" alt="Speech callout"><br><b>Speech callout</b><br><code>remotion/shapes-callout</code></td><td width="33%" valign="top"><img src="docs/gallery/remotion-shapes-pie.webp" width="100%" alt="Pie to a percent"><br><b>Pie to a percent</b><br><code>remotion/shapes-pie</code></td><td width="33%" valign="top"><img src="docs/gallery/remotion-shapes-polygon-badge.webp" width="100%" alt="Hexagon badge"><br><b>Hexagon badge</b><br><code>remotion/shapes-polygon-badge</code></td></tr>
<tr><td width="33%" valign="top"><img src="docs/gallery/remotion-shapes-star-seal.webp" width="100%" alt="Star seal"><br><b>Star seal</b><br><code>remotion/shapes-star-seal</code></td><td width="33%" valign="top"><img src="docs/gallery/remotion-shapes-triangle-marker.webp" width="100%" alt="Triangle marker"><br><b>Triangle marker</b><br><code>remotion/shapes-triangle-marker</code></td><td width="33%" valign="top"><img src="docs/gallery/remotion-starburst-rays.webp" width="100%" alt="Rays behind a number"><br><b>Rays behind a number</b><br><code>remotion/starburst-rays</code></td></tr>
<tr><td width="33%" valign="top"><img src="docs/gallery/remotion-svg3d-badge.webp" width="100%" alt="3D hex badge"><br><b>3D hex badge</b><br><code>remotion/svg3d-badge</code></td><td width="33%" valign="top"><img src="docs/gallery/remotion-three-coin.webp" width="100%" alt="3D gold coin"><br><b>3D gold coin</b><br><code>remotion/three-coin</code></td><td width="33%" valign="top"><img src="docs/gallery/remotion-transition-clock-wipe.webp" width="100%" alt="Clock wipe, before to after"><br><b>Clock wipe, before to after</b><br><code>remotion/transition-clock-wipe</code></td></tr>
<tr><td width="33%" valign="top"><img src="docs/gallery/remotion-transition-flip.webp" width="100%" alt="Card flip, before to after"><br><b>Card flip, before to after</b><br><code>remotion/transition-flip</code></td><td width="33%" valign="top"><img src="docs/gallery/remotion-transition-iris.webp" width="100%" alt="Iris, before to after"><br><b>Iris, before to after</b><br><code>remotion/transition-iris</code></td><td width="33%" valign="top"><img src="docs/gallery/remotion-transition-push-cut.webp" width="100%" alt="Push cut with flash, before to after"><br><b>Push cut with flash, before to after</b><br><code>remotion/transition-push-cut</code></td></tr>
<tr><td width="33%" valign="top"><img src="docs/gallery/remotion-transition-slide.webp" width="100%" alt="Push slide, before to after"><br><b>Push slide, before to after</b><br><code>remotion/transition-slide</code></td><td width="33%" valign="top"><img src="docs/gallery/remotion-transition-wipe.webp" width="100%" alt="Diagonal wipe, before to after"><br><b>Diagonal wipe, before to after</b><br><code>remotion/transition-wipe</code></td></tr>
</table>

### HyperFrames · 7

HTML + CSS + GSAP 블록.

<table>
<tr><td width="33%" valign="top"><img src="docs/gallery/hyperframes-gold-scramble-title.webp" width="100%" alt="Scramble title (GSAP)"><br><b>Scramble title (GSAP)</b><br><code>hyperframes/gold-scramble-title</code></td><td width="33%" valign="top"><img src="docs/gallery/hyperframes-ring-count.webp" width="100%" alt="Ring counter (GSAP)"><br><b>Ring counter (GSAP)</b><br><code>hyperframes/ring-count</code></td><td width="33%" valign="top"><img src="docs/gallery/hyperframes-split-words-rise.webp" width="100%" alt="Words rise (GSAP SplitText)"><br><b>Words rise (GSAP SplitText)</b><br><code>hyperframes/split-words-rise</code></td></tr>
<tr><td width="33%" valign="top"><img src="docs/gallery/hyperframes-warm-grain-circle-stat.webp" width="100%" alt="Circle stat (HyperFrames)"><br><b>Circle stat (HyperFrames)</b><br><code>hyperframes/warm-grain-circle-stat</code></td><td width="33%" valign="top"><img src="docs/gallery/hyperframes-warm-grain-pill-stat.webp" width="100%" alt="Pill stat (HyperFrames)"><br><b>Pill stat (HyperFrames)</b><br><code>hyperframes/warm-grain-pill-stat</code></td><td width="33%" valign="top"><img src="docs/gallery/hyperframes-warm-grain-shape-label.webp" width="100%" alt="Shape label (HyperFrames)"><br><b>Shape label (HyperFrames)</b><br><code>hyperframes/warm-grain-shape-label</code></td></tr>
<tr><td width="33%" valign="top"><img src="docs/gallery/hyperframes-warm-grain-title-card.webp" width="100%" alt="Title card (HyperFrames)"><br><b>Title card (HyperFrames)</b><br><code>hyperframes/warm-grain-title-card</code></td></tr>
</table>

### Lottie · 3

After Effects · LottieFiles 애니메이션.

<table>
<tr><td width="33%" valign="top"><img src="docs/gallery/lottie-arc-orbit.webp" width="100%" alt="Orbit arcs (Lottie)"><br><b>Orbit arcs (Lottie)</b><br><code>lottie/arc-orbit</code></td><td width="33%" valign="top"><img src="docs/gallery/lottie-gold-check.webp" width="100%" alt="Check mark (Lottie)"><br><b>Check mark (Lottie)</b><br><code>lottie/gold-check</code></td><td width="33%" valign="top"><img src="docs/gallery/lottie-signal-pulse.webp" width="100%" alt="Signal pulse (Lottie)"><br><b>Signal pulse (Lottie)</b><br><code>lottie/signal-pulse</code></td></tr>
</table>

### Kit · 7

키트 기본 그래픽.

<table>
<tr><td width="33%" valign="top"><img src="docs/gallery/kit-card.webp" width="100%" alt="Screen card + arrow"><br><b>Screen card + arrow</b><br><code>kit/card</code></td><td width="33%" valign="top"><img src="docs/gallery/kit-chapter.webp" width="100%" alt="Chapter line"><br><b>Chapter line</b><br><code>kit/chapter</code></td><td width="33%" valign="top"><img src="docs/gallery/kit-counter.webp" width="100%" alt="Number counter"><br><b>Number counter</b><br><code>kit/counter</code></td></tr>
<tr><td width="33%" valign="top"><img src="docs/gallery/kit-endcard.webp" width="100%" alt="End card"><br><b>End card</b><br><code>kit/endcard</code></td><td width="33%" valign="top"><img src="docs/gallery/kit-keyword.webp" width="100%" alt="Key word"><br><b>Key word</b><br><code>kit/keyword</code></td><td width="33%" valign="top"><img src="docs/gallery/kit-nametag.webp" width="100%" alt="Name tag"><br><b>Name tag</b><br><code>kit/nametag</code></td></tr>
<tr><td width="33%" valign="top"><img src="docs/gallery/kit-steps.webp" width="100%" alt="1 · 2 · 3 steps"><br><b>1 · 2 · 3 steps</b><br><code>kit/steps</code></td></tr>
</table>

<!-- gallery:end -->

## 보기

| | 파일 | 볼 것 |
|---|---|---|
| 카탈로그 페이지 | [docs/index.html](docs/index.html) | 그래픽 57종, 하나에 살아 있는 클립 하나, `kind` · 라이선스 · 복사할 프롬프트 |
| 몽타주 | [docs/hero.mp4](docs/hero.mp4) | 그중 열한 개, 한 박자에 하나 |
| 시트 | [docs/sheet.jpg](docs/sheet.jpg) | 그래픽마다 정점의 정지 화면 하나 |
| 몸 | [docs/body_sheet.jpg](docs/body_sheet.jpg) | 몸 인식이 보는 것: 사람 영역, 관절, 손, 손가락 수 |

## 해 보기

Node.js 18 이상만 있으면 됩니다. Python 은 필요 없고 ffmpeg 는 Remotion 안에 든 것을 씁니다.

```bash
git clone https://github.com/wonseokjung/connect-ai-video-motion.git
cd connect-ai-video-motion
npm install
npx github:wonseokjung/connect-ai-video-motion demo           # 들어 있는 샘플로 처음부터 끝까지
npx github:wonseokjung/connect-ai-video-motion catalog        # 부를 수 있는 그래픽 전부, 출처별
npx github:wonseokjung/connect-ai-video-motion gallery vm-demo --sheet
```

내 영상: `npx github:wonseokjung/connect-ai-video-motion my-talk.mp4`. 코딩 에이전트(Claude Code, Codex, Antigravity)로 하려면 `npx github:wonseokjung/connect-ai-video-motion install-skill` 한 뒤 "내 영상에 모션그래픽 얹어 줘" 라고 하면 됩니다.

## 어떻게 놓는가

1. **얼굴.** Mac 에서는 macOS Vision. Windows · Linux(또는 Xcode 도구가 없는 Mac)에서는 MediaPipe 얼굴 인식이 자동으로 찾습니다. 키트에 들어 있어 따로 받을 것이 없습니다. 얼굴을 못 찾으면 `face-sheet.jpg` 를 보고 사람이나 에이전트가 얼굴 상자를 적습니다.
2. **몸과 손.** macOS Vision 이 몸 관절(최대 19개), 손마다 21점, 사람 영역(64×36 격자)을 1초에 15번 찾고, 그래픽이 사람 뒤로 가는 구간에는 사람 매트도 만듭니다. Windows · Linux 에서는 MediaPipe 가 같은 일을 합니다(아래). 둘 다 없으면 0.1 처럼 얼굴 상자에서 몸을 짐작합니다.
3. **빈자리.** 보호 영역 = 얼굴 + 측정한 사람(팔 · 손 포함) + 여백, 그래픽이 떠 있는 시간 전체에 걸쳐서. 이름 붙은 자리(옆, 아래 띠, 위)를 먼저 보고 없으면 빈 곳 전체에서 찾습니다. 크게 움직여서 한 자리가 끝까지 비지 않으면 반으로 나눠 한 자리에서 다음 자리로 페이드합니다. 그래도 없으면 숨기고 리포트에 이유를 씁니다.
4. **말.** `plan.json` 은 "한 말 → 그래픽" 표입니다. 단어 시간이 있으면 단어 뒤 40 ms, 문장 자막이면 ±0.2 s 에 뜹니다.
5. **검사.** `check` 가 문제를 문장으로 씁니다: 얼굴을 가림, 사람(몸 · 팔 · 손, 측정값)을 가림, 다른 그래픽 위에 겹침, 화면 밖, 4단어 넘음, 대비 부족, 손가락 광선이 얼굴을 지남, 몸 윤곽선이 몸에 닿음, 같은 디자인 두 번.

## 카탈로그

`npx github:wonseokjung/connect-ai-video-motion catalog` 이 전부 보여 줍니다. 지금 **재생되는 그래픽 57개**, 그리고 아직 안 되는 4개는 이유와 함께 목록에 있습니다.

| 출처 | 수 | 예 |
|---|---|---|
| `kit/` | 7 | 이름표, 핵심 단어, 숫자 카운터, 1 · 2 · 3 단계, 화면 카드, 챕터, 엔드카드 |
| `remotion/` | 35 | rough-notation 박스 · 형광펜 · 취소선 · 괄호 목록, paths 여정 · 모핑 · 신호 · 밑줄, shapes 파이 · 막대 · 말풍선 · 별 도장 · 육각 배지, transitions 시계 와이프 · 아이리스 · 뒤집기 · 밀기 · 대각 와이프 · 푸시 컷, noise 흔들림 · 등고선, motion-blur 잔상, starburst 빛살, 사람 뒤 라이트 릭, 3D 육각 배지(svg-3d-engine), 3D 금화(three), GSAP 글자, macOS 커서 클릭, 말에 맞춰 켜지는 단어(captions) |
| `hyperframes/` | 7 | warm-grain 원 숫자 · 알약 숫자 · 도형 라벨 · 제목 카드, 스크램블 제목 · 단어 솟음 · 링 카운터(HyperFrames 형식으로 만든 우리 블록) |
| `lottie/` | 3 | 체크, 신호 펄스, 궤도 호 |
| `body/` | 5 | 사람 뒤 글자, 몸 윤곽선, 손 옆 태그, 손가락 수 도장, 손가락 광선 |

항목 하나 = 폴더 `catalog/<출처>/<이름>/` (컴포넌트 또는 `block.html` / `anim.json`) + `meta.json`:

```json
{
  "kind": "remotion/shapes-pie",
  "title": "Pie to a percent",
  "description": "A pie fills to the percent you said, the number counts with it.",
  "source": {"type": "remotion", "package": "@remotion/shapes", "version": "4.0.529"},
  "license": "MIT",
  "use": "number",
  "props": {"value": "percent 0-100", "text": "what it is (1-3 words)"},
  "place": "box",
  "size": {"aspect": 2.2, "minW": 0.22, "maxW": 0.34},
  "dur": 2.8,
  "family": "pie"
}
```

plan 한 줄에 `"scale": 1.3`(이 그래픽만 30 % 크게. 자리가 없으면 평소처럼 한 단계씩 줄어듭니다), `"slot": "beside-right"`(이쪽부터 시도), `"behind": true` 또는 `"head"`(글자를 내 뒤에 크게: 사람 매트 아래에 그리고, 낱말 경계에서 갈라 내 양옆에 놓아서 머리가 글자를 가리지 않습니다. 25 % 넘게 가리면 `check` 가 오류를 냅니다), `"side": "minutes"`(그래픽 반대편에 같은 높이로 놓는 큰 낱말 하나: 왼쪽 숫자, 오른쪽 낱말)를 적을 수 있고, `kit/keyword` 는 글자에 줄바꿈(`"Visual\nVibe Coding"`)을 넣으면 낱말을 쌓고 마지막 줄을 골드로 씁니다. `my-info.json` 의 `"style"` 로 분위기를 고릅니다: `connect`(검정 × 골드, 기본), `day`(밝은 방용 같은 분위기: 어두운 글자), `night`, `clean`.

`place` 는 층이 어떻게 다룰지입니다: `box`(옆 빈자리), `attach`(`hand`, `fingers`, `point`, `contour`: 몸을 따라감, 손이 잘 안 보이면 숨김), `behind`(사람 뒤, 사람 매트 아래), `edge`, `post`, `full`. `family` 는 디자인 이름이라 한 영상에 두 번 쓰면 경고가 나옵니다.

### 내 그래픽

| 가진 것 | plan.json 한 줄 |
|---|---|
| Remotion 컴포넌트 | `{"kind": "custom", "component": "./my/Thing.tsx", "at": 4.2, "meta": {"size": {"aspect": 2, "maxW": 0.3}}}` |
| HyperFrames 블록 | `{"kind": "hyperframes", "src": "./block.html", "at": 6, "meta": {"window": [0, 3], "text": {".title": "text"}}, "text": "Hello"}` |
| Lottie 파일 | `{"kind": "lottie", "src": "./anim.json", "at": 8}` |

컴포넌트는 `{it, r, lf, dur, st, ink, u, fps, L, mainF}` 를 받습니다: plan 한 줄, 자기 상자 `[x, y, w, h]`, 그래픽 안 프레임 등(`src/catalog/ui.tsx`). `r` 밖으로 나가면 안 됩니다.

### HyperFrames

어댑터가 블록(HTML + CSS + `window.__timelines` 의 멈춘 GSAP 타임라인)을 투명 iframe 안에서 돌리고 Remotion 프레임마다 그 시간으로 맞춥니다. GSAP 와 플러그인은 CDN 이 아니라 설치된 `gsap` 패키지에서 가져옵니다. `Math.random` 은 씨앗을 고정하고 CSS 애니메이션도 프레임 시간에 붙잡아 두어, 몇 번을 렌더해도 같은 그림이 나옵니다. `meta.window` 는 블록 타임라인의 몇 초를 쓸지, `meta.crop` 은 캔버스의 어느 부분을, `meta.text` 는 내 말을 어디에 넣을지입니다.

```bash
npx github:wonseokjung/connect-ai-video-motion hf-import <폴더>   # 레지스트리, 템플릿, 내 .html 파일
```

블록마다 검사합니다. WebGL · canvas, 자체 영상 · 소리, `requestAnimationFrame` 루프, 인터넷에서 가져오는 스크립트, 템플릿 자리표시자, 타임라인 없음은 `unsupported` 와 이유로 목록에 남습니다.

## Windows · Linux 에서 얼굴 · 몸 인식

얼굴은 어느 컴퓨터에서나 바로 됩니다. `@mediapipe/tasks-vision` 이 의존성으로 함께 설치되고, 얼굴 모델(`models/mediapipe/blaze_face_short_range.tflite`, 230 KB, Google, Apache-2.0)이 키트에 들어 있습니다. 시험 영상(3840x2160, 23번 비교)에서 머리 상자가 macOS Vision 상자와 중앙값 37 px 안쪽으로 맞았습니다. Mac 에서도 `VM_FACE=mediapipe` 로 돌려 볼 수 있습니다. `--verbose`(또는 `VM_VERBOSE=1`)를 붙이면 얼굴 탐지기가 본 내용을 한 장씩 출력합니다.

macOS 몸 인식은 따로 받을 것이 없습니다. 다른 컴퓨터에서는 MediaPipe 어댑터(`lib/adapters/mediapipe-body.mjs`)가 Remotion 의 Chrome 안에서 MediaPipe Pose + Hands 를 돌립니다. 패키지는 키트와 함께 설치되고, 몸 모델 두 개는 따로 받아야 합니다(Google, Apache-2.0):

| 무엇 | 넣을 곳 |
|---|---|
| `pose_landmarker_lite.task` | `models/mediapipe/` |
| `hand_landmarker.task` | `models/mediapipe/` |

받는 주소는 `lib/adapters/mediapipe-body.mjs` 맨 위에 있습니다. 파일이 있으면 `analyze` 가 알아서 MediaPipe 를 쓰고, 없으면 어느 파일이 없는지 말합니다. 사람 매트는 만들지 않아 사람 뒤 그래픽은 숨겨집니다. 이 어댑터는 tasks-vision 공식 API 대로 썼지만 Windows 에서 아직 시험하지 않았습니다. 보이는 그대로 이슈로 알려 주세요.

## 결과물

`out/final.mp4` · `out/short_9x16.mp4`(`--short`) · `out/overlay.mov`(`--overlay`, 알파 있는 ProRes 4444, Premiere / CapCut / DaVinci 용) · `out/sheet.jpg`(그래픽마다 등장 / 정점 / 퇴장, 측정한 사람 표시) · `out/report.md` · `out/gallery.mp4`, `out/gallery_sheet.jpg`(`gallery`) · `out/body-sheet.jpg`(`body-sheet`).

## 아직

HyperFrames 레지스트리 전체(456개)는 패키지에 없습니다. 받아서 `hf-import` 하면 됩니다. `@remotion/transitions` 의 셰이더 전환(book flip, crosswarp, ripple ...)은 실험 기능인 HTML-in-canvas 가 켜진 브라우저가 필요해서 unsupported 로 적어 두었습니다. 효과음과 자동 단어 시간(whisper)은 이번 버전에 없습니다.

## 출처

오픈소스 부품으로 만들었고 패키지 · 버전 · 라이선스를 [NOTICE.md](NOTICE.md) 에 하나씩 적었습니다. npm 패키지 안의 샘플 영상은 코드로 그린 대역과 합성 목소리입니다. `docs/` 의 클립에는 만든 사람이 허락하에 나옵니다. `tools/make-showcase.mjs` 와 `tools/make-docs.mjs` 로 만들었습니다.

MIT · CONNECT AI LAB
