// 교차 detector — 둘 이상의 요소가 만나는 지점을 읽는다.
// 요소 단위 문구로는 나올 수 없는 해석이 나오는 층 (공망×십신, 격국×용신, 신살×십신).

import type { SajuResult } from '@/engine/types';
import type { RawPattern, SipsinGroup } from '../types';
import { groupFromOhaeng, groupLabel, groupOfSlot, sipsinNameOfSlot, SIPSIN_SLOTS } from '../sipsin-groups';

const GYEOKGUK_GROUP_BY_PREFIX: Record<string, SipsinGroup> = {
  비견: 'bigeop',
  겁재: 'bigeop',
  식신: 'siksang',
  상관: 'siksang',
  편재: 'jaesung',
  정재: 'jaesung',
  편관: 'gwansung',
  정관: 'gwansung',
  편인: 'insung',
  정인: 'insung',
};

const GYEOKGUK_GROUP_BY_FULL: Record<string, SipsinGroup> = {
  '비견격': 'bigeop',
  '겁재격': 'bigeop',
  '건록격': 'bigeop',
  '양인격': 'bigeop',
  '식신격': 'siksang',
  '상관격': 'siksang',
  '편재격': 'jaesung',
  '정재격': 'jaesung',
  '편관격': 'gwansung',
  '정관격': 'gwansung',
  '편인격': 'insung',
  '정인격': 'insung',
  // 특수격 — 일간이 극강/극약하여 따르는 격
  '종강격': 'bigeop',
  '종재격': 'jaesung',
  '종살격': 'gwansung',
  '종아격': 'insung',
};

function gyeokgukGroup(result: SajuResult): SipsinGroup | null {
  const name = result.gyeokguk.name;
  if (GYEOKGUK_GROUP_BY_FULL[name]) return GYEOKGUK_GROUP_BY_FULL[name];
  // 특수격·부분 일치 대응 (예: '정관격(格)' 변형, 접미어가 붙는 경우)
  for (const [prefix, group] of Object.entries(GYEOKGUK_GROUP_BY_PREFIX)) {
    if (name.startsWith(prefix)) return group;
  }
  return null;
}

const GONGMANG_KEY: Record<SipsinGroup, string> = {
  bigeop: 'saju/cross/gongmang-bigeop',
  siksang: 'saju/cross/gongmang-siksang',
  jaesung: 'saju/cross/gongmang-jaesung',
  gwansung: 'saju/cross/gongmang-gwansung',
  insung: 'saju/cross/gongmang-insung',
};

/** 공망 지지가 어느 자리에 있고 그 자리 십신 묶음이 무엇인지 */
export function detectGongmangCross(result: SajuResult): RawPattern[] {
  const gongmang = result.gongmang;
  if (!gongmang || gongmang.length === 0) return [];
  const patterns: RawPattern[] = [];
  const seen = new Set<SipsinGroup>();
  for (const slot of SIPSIN_SLOTS) {
    const glyph = slotGlyph(result, slot);
    if (!glyph || !gongmang.includes(glyph)) continue;
    const group = groupOfSlot(result, slot);
    if (!group || seen.has(group)) continue;
    seen.add(group);
    patterns.push({
      key: GONGMANG_KEY[group],
      strength: 0.7,
      evidence: [`${slotLabel(slot)} ${glyph}(${sipsinNameOfSlot(result, slot)}) — 공망 ${gongmang.join('·')}`],
      slots: [{ slot, label: slotLabel(slot), glyph, sipsin: sipsinNameOfSlot(result, slot), group }],
    });
  }
  return patterns;
}

/** 격국 오행 축과 용신 축이 같은지 */
export function detectGyeokgukYongsin(result: SajuResult): RawPattern[] {
  const gkGroup = gyeokgukGroup(result);
  const ysGroup = groupFromOhaeng(result, result.yongsin.ohaeng);
  if (!gkGroup || !ysGroup) return [];
  if (gkGroup === ysGroup) {
    return [
      {
        key: 'saju/cross/gyeokguk-yongsin-fit',
        strength: 0.8,
        evidence: [`격국 ${result.gyeokguk.name} — 용신 ${result.yongsin.ohaeng}(${groupLabel(ysGroup)})`],
        figures: { gyeokguk: result.gyeokguk.name, yongsin: result.yongsin.ohaeng },
      },
    ];
  }
  return [
    {
      key: 'saju/cross/gyeokguk-yongsin-split',
      strength: 0.6,
      evidence: [
        `격국 ${result.gyeokguk.name}(${groupLabel(gkGroup)} 축) — 용신 ${result.yongsin.ohaeng}(${groupLabel(ysGroup)} 축)`,
      ],
      figures: {
        gyeokguk: result.gyeokguk.name,
        yongsin: result.yongsin.ohaeng,
        gyeokgukGroup: groupLabel(gkGroup),
        yongsinGroup: groupLabel(ysGroup),
      },
    },
  ];
}

/** 신살 자리 지지의 십신 묶음과 신살을 교차. 레지스트리에 등록된 조합만 내보낸다. */
export function detectSinsalSipsin(result: SajuResult): RawPattern[] {
  const patterns: RawPattern[] = [];
  for (const sin of result.sinsal) {
    const group = groupOfSlot(result, sin.position as never);
    if (!group) continue;
    const key = `saju/cross/sinsal-${sin.name}-${group}`;
    // 등록되지 않은 조합은 의도적으로 생략 (문구 품질 게이트)
    if (!KNOWN_SINSAL_CROSS.has(key)) continue;
    patterns.push({
      key,
      strength: 0.6,
      evidence: [`${slotLabel(sin.position)} ${sin.name} + ${sipsinNameOfSlot(result, sin.position as never)}(${groupLabel(group)})`],
      slots: [
        {
          slot: sin.position,
          label: slotLabel(sin.position),
          glyph: slotGlyph(result, sin.position) ?? '',
          sipsin: sipsinNameOfSlot(result, sin.position as never),
          group,
        },
      ],
      figures: { sin: sin.name },
    });
  }
  return patterns;
}

// --- 내부 유틸 ---

function slotGlyph(result: SajuResult, slot: string): string | null {
  const { palja } = result;
  switch (slot) {
    case 'yearGan':
      return palja.yearGan;
    case 'yearJi':
      return palja.yearJi;
    case 'monthGan':
      return palja.monthGan;
    case 'monthJi':
      return palja.monthJi;
    case 'dayJi':
      return palja.dayJi;
    case 'hourGan':
      return palja.hourGan;
    case 'hourJi':
      return palja.hourJi;
    default:
      return null;
  }
}

function slotLabel(slot: string): string {
  return slot === 'yearGan'
    ? '년간'
    : slot === 'yearJi'
      ? '년지'
      : slot === 'monthGan'
        ? '월간'
        : slot === 'monthJi'
          ? '월지'
          : slot === 'dayJi'
            ? '일지'
            : slot === 'hourGan'
              ? '시간'
              : '시지';
}

const KNOWN_SINSAL_CROSS = new Set<string>([
  'saju/cross/sinsal-장성-siksang',
  'saju/cross/sinsal-장성-gwansung',
  'saju/cross/sinsal-장성-bigeop',
  'saju/cross/sinsal-장성-jaesung',
  'saju/cross/sinsal-화개-insung',
  'saju/cross/sinsal-화개-siksang',
  'saju/cross/sinsal-화개-bigeop',
  'saju/cross/sinsal-화개-jaesung',
  'saju/cross/sinsal-연살-jaesung',
  'saju/cross/sinsal-역마-jaesung',
  'saju/cross/sinsal-역마-siksang',
  'saju/cross/sinsal-역마-gwansung',
]);
