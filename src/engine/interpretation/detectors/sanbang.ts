// 삼합(三合)·방합(方合) detector — 지지 4자리 중 세 자지가 한 국(局)/한 방(方)을 이루는지.
// 삼합(생왕묘)과 방합(계절 3지)은 서로 다른 조합이므로 별개로 감지한다.
// 4자리에서 삼합과 방합이 동시에 성립하는 경우는 없다(필요 지지가 5개 초과).

import type { SajuResult } from '@/engine/types';
import type { PatternSlot, RawPattern } from '../types';
import { toPatternSlot, SIPSIN_SLOTS } from '../sipsin-groups';

/** [생지, 왕지, 묘지, 국 오행] */
const SAMHAP_SETS: [string, string, string, string][] = [
  ['申', '子', '辰', '수'],
  ['寅', '午', '戌', '화'],
  ['巳', '酉', '丑', '금'],
  ['亥', '卯', '未', '목'],
];

/** [계절 첫지, 중지, 마침지, 방 오행] */
const BANGHAP_SETS: [string, string, string, string][] = [
  ['寅', '卯', '辰', '목'],
  ['巳', '午', '未', '화'],
  ['申', '酉', '戌', '금'],
  ['亥', '子', '丑', '수'],
];

const HANJI_OHAENG: Record<string, string> = { 목: '木', 화: '火', 토: '土', 금: '金', 수: '水' };

function jijiSlotList(result: SajuResult): PatternSlot[] {
  return SIPSIN_SLOTS.filter((s) => s.endsWith('Ji')).map((s) => toPatternSlot(result, s));
}

function findSet(result: SajuResult, sets: [string, string, string, string][]) {
  const slots = jijiSlotList(result);
  for (const [a, b, c, guk] of sets) {
    const members = [a, b, c].map((glyph) => slots.find((s) => s.glyph === glyph));
    if (members.every((m): m is PatternSlot => m !== undefined)) {
      return { members: members as PatternSlot[], guk };
    }
  }
  return null;
}

export function detectSamhapBanghap(result: SajuResult): RawPattern[] {
  const patterns: RawPattern[] = [];

  const samhap = findSet(result, SAMHAP_SETS);
  if (samhap) {
    const branches = samhap.members.map((m) => m.glyph).join('·');
    patterns.push({
      key: 'saju/relation/samhap',
      strength: 0.7,
      evidence: [`${branches} — 삼합 ${branches.split('·').join('')}${HANJI_OHAENG[samhap.guk] ?? ''}(${samhap.guk}국)`],
      slots: samhap.members,
      figures: { branches, guk: `${samhap.guk}국` },
    });
  }

  const banghap = findSet(result, BANGHAP_SETS);
  if (banghap) {
    const branches = banghap.members.map((m) => m.glyph).join('·');
    patterns.push({
      key: 'saju/relation/banghap',
      strength: 0.65,
      evidence: [`${branches} — 방합 ${branches.split('·').join('')}${HANJI_OHAENG[banghap.guk] ?? ''}(${banghap.guk}국)`],
      slots: banghap.members,
      figures: { branches, guk: `${banghap.guk}국` },
    });
  }

  return patterns;
}
