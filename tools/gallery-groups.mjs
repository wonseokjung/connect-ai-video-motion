// Shared by tools/make-readme-gallery.mjs and tools/make-docs.mjs: the showcase picks and the groups of the rest.
import path from 'node:path';
import {KIT, readJson} from '../lib/analyze.mjs';

export const picks = readJson(path.join(KIT, 'tools', 'showcase-picks.json'));
const scenes = new Set(picks.scenes || []);
// [key, English title, English line, Korean title, Korean line]
export const CATS = [
  ['body', 'Body aware', 'Follow a hand, count fingers, stand behind you, trace your outline.', '몸을 아는 그래픽', '손을 따라가고, 손가락을 세고, 사람 뒤에 서고, 윤곽을 따라갑니다.'],
  ['text', 'Text', 'Your own words, set big: key words, titles, quotes, chapters.', '글자', '내가 한 말을 크게: 핵심 낱말, 제목, 인용, 챕터.'],
  ['labels', 'Labels and pointers', 'Tags, arrows, lists and steps that point at what you mean.', '라벨 · 가리키기', '태그, 화살표, 목록, 단계로 가리킵니다.'],
  ['data', 'Numbers and charts', 'A number or a comparison you said, drawn.', '숫자 · 차트', '말한 숫자와 비교를 그림으로.'],
  ['scenes', 'Whole-frame scenes', 'Graphics that fill a frame with nobody in it, light behind you, the end card.', '화면 전체 장면', '사람 없이 화면을 채우는 그래픽, 사람 뒤의 빛, 엔드 카드.'],
  ['transitions', 'Transitions', 'From one shot to the next.', '전환', '한 장면에서 다음 장면으로.'],
];
export const nameOf = (kind) => kind.replace('/', '-');
export const catOf = (m, name = nameOf(m.kind)) => {
  if (scenes.has(name) || ['background', 'end'].includes(m.use)) return 'scenes';
  if (m.kind.startsWith('body/')) return 'body';
  if (m.kind.includes('/transition-')) return 'transitions';
  if (['number', 'compare'].includes(m.use)) return 'data';
  if (['label', 'pointer', 'list', 'steps', 'card'].includes(m.use)) return 'labels';
  return 'text';
};
