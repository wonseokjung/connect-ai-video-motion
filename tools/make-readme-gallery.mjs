// Dev tool: the gallery part of README.md and README.ko.md, between <!-- gallery:start --> and <!-- gallery:end -->.
//   node tools/make-readme-gallery.mjs
// SHOWCASE  12 big tiles (tools/showcase-picks.json, loops in docs/gallery/showcase/<name>.webp)
// START     3 steps
// MORE      every other graphic with a loop in docs/gallery/<name>.webp, folded by kind of graphic (Body aware open)
// The count comes from the catalog, and every <!--n-->12<!--/n--> in the READMEs is set to it.
import fs from 'node:fs';
import path from 'node:path';
import {KIT} from '../lib/analyze.mjs';
import {buildCatalog} from '../lib/catalog-build.mjs';
import {CATS, catOf, nameOf, picks} from './gallery-groups.mjs';

const {metas} = buildCatalog();
const ok = Object.values(metas).filter((m) => !m.status || m.status === 'ok');
const N = ok.length;
const GAL = path.join(KIT, 'docs', 'gallery');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const shown = new Set(picks.showcase.map((p) => p.name));
const last = new Set(picks.last || []); // character graphics go to the end of their group

function block(lang) {
  const en = lang === 'en';
  const out = [];
  out.push(en ? '## Showcase' : '## 쇼케이스', '');
  out.push(en
    ? "Made with this kit on the author's own videos (AI Mentor Jay, shown with his permission). The words on screen are words he said. Not one pixel of him was changed. Under each: what it does and its one line of `plan.json`."
    : '이 키트로 만든 사람(AI 멘토 제이)의 실제 영상 위에 올린 것입니다(허락하에 실었습니다). 화면 글자는 그가 한 말이고, 사람 픽셀은 한 점도 바꾸지 않았습니다. 아래에 하는 일과 `plan.json` 한 줄.', '');
  out.push('<table>');
  for (let i = 0; i < picks.showcase.length; i += 2) {
    let row = '';
    for (const p of picks.showcase.slice(i, i + 2)) {
      const m = metas[p.line.kind] || {};
      const t = esc(m.title || p.name);
      row += `<!-- slot: ${p.slot}${p.placeholder ? ` (placeholder: ${p.line.kind})` : ''} --><td width="50%" valign="top"><img src="docs/gallery/showcase/${p.name}.webp" width="100%" alt="${t}"><br><b>${t}</b><br>${esc(en ? p.en : p.ko)}<br><code>${esc(JSON.stringify(p.line))}</code></td>`;
    }
    out.push(`<tr>${row}</tr>`);
  }
  out.push('</table>', '');

  out.push(en ? '## Start' : '## 시작', '');
  out.push(
    en ? '1. Check your computer (Node, Remotion, face and body detection):' : '1. 내 컴퓨터 점검(Node, Remotion, 얼굴 · 몸 인식):', '',
    '   ```bash', '   npx github:wonseokjung/connect-ai-video-motion doctor', '   ```', '',
    en ? '2. Run the built-in sample, start to finish:' : '2. 들어 있는 샘플로 처음부터 끝까지:', '',
    '   ```bash', '   npx github:wonseokjung/connect-ai-video-motion demo', '   ```', '',
    `   <img src="docs/terminal.png" width="560" alt="${en ? 'What you see in the terminal' : '터미널에서 보이는 화면'}">`, '',
    en ? '3. Teach your coding agent (Claude Code, Codex, Antigravity) once, then ask it to "put motion graphics on my video":' : '3. 코딩 에이전트(Claude Code, Codex, Antigravity)에 한 번 가르치고, "내 영상에 모션그래픽 넣어줘" 라고 부탁하세요:', '',
    '   ```bash', '   npx github:wonseokjung/connect-ai-video-motion install-skill', '   ```', '',
  );

  out.push(en ? '## More you can make' : '## 이런 것도 만들 수 있어요', '');
  out.push(en
    ? `The catalog has <!--n-->${N}<!--/n--> graphics, each one line of \`plan.json\`. Open a group to see them; the [catalog page](docs/index.html) has every one as a living clip with a prompt to copy.`
    : `카탈로그에 그래픽 <!--n-->${N}<!--/n-->개, 하나에 \`plan.json\` 한 줄. 묶음을 열어 보세요. [카탈로그 페이지](docs/index.html)에는 전부 살아 있는 클립과 복사할 프롬프트가 있습니다.`, '');
  const rest = ok.map((m) => ({m, name: nameOf(m.kind)})).filter((x) => !shown.has(x.name) && fs.existsSync(path.join(GAL, x.name + '.webp')));
  for (const [key, ten, den, tko, dko] of CATS) {
    const ns = rest.filter((x) => catOf(x.m, x.name) === key).sort((a, b) => last.has(a.name) - last.has(b.name) || a.name.localeCompare(b.name));
    if (!ns.length) continue;
    out.push(`<details${key === 'body' ? ' open' : ''}><summary><b>${en ? ten : tko} · ${ns.length}</b>: ${en ? den : dko}</summary>`, '', '<table>');
    for (let i = 0; i < ns.length; i += 4) {
      out.push(`<tr>${ns.slice(i, i + 4).map(({m, name}) => `<td width="25%" valign="top"><img src="docs/gallery/${name}.webp" width="100%" alt="${esc(m.title)}"><br><sub>${esc(m.title)}</sub></td>`).join('')}</tr>`);
    }
    out.push('</table>', '', '</details>', '');
  }
  return out.join('\n');
}

for (const [f, lang] of [['README.md', 'en'], ['README.ko.md', 'ko']]) {
  const file = path.join(KIT, f);
  let s = fs.readFileSync(file, 'utf8');
  const A = '<!-- gallery:start -->', B = '<!-- gallery:end -->';
  const a = s.indexOf(A) + A.length, b = s.indexOf(B);
  if (a < A.length || b < 0) throw new Error(`${f}: gallery markers not found`);
  s = s.slice(0, a) + '\n' + block(lang) + '\n' + s.slice(b);
  s = s.replace(/<!--n-->\d+<!--\/n-->/g, `<!--n-->${N}<!--/n-->`);
  fs.writeFileSync(file, s);
  console.log(`${f}: ${N} graphics, ${picks.showcase.length} in the showcase`);
}
