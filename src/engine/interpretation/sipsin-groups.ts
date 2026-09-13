// 십신 묶음 헬퍼 — detector들이 공유하는 판단 단위.
// SajuResult.sipsin은 위치별 십신 이름을 주므로, 여기서 묶음(Group)·오행·인접성을 계산한다.

import type { SajuResult } from '@/engine/types';
import type { SipsinGroup } from './types';
import { getOhaengForGan } from '@/engine/adapter/hanja-mapper';

export const SIPSIN_SLOTS = [
  'yearGan',
  'yearJi',
  'monthGan',
  'monthJi',
  'dayJi',
  'hourGan',
  'hourJi',
] as const;

export type SipsinSlot = (typeof SIPSIN_SLOTS)[number];

const SIPSIN_GROUP: Record<string, SipsinGroup> = {
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

/** 자리(슬롯)의 기둥 인덱스: 년 0, 월 1, 일 2, 시 3 */
export function pillarIndex(slot: SipsinSlot): number {
  return slot.startsWith('year') ? 0 : slot.startsWith('month') ? 1 : slot.startsWith('day') ? 2 : 3;
}

/** 두 슬롯이 같은 기둥이거나 인접 기둥인지 */
export function areAdjacent(a: SipsinSlot, b: SipsinSlot): boolean {
  return Math.abs(pillarIndex(a) - pillarIndex(b)) <= 1;
}

/** 슬롯의 십신 묶음 (십신이 비어 있으면 null) */
export function groupOfSlot(result: SajuResult, slot: SipsinSlot): SipsinGroup | null {
  const sipsin = result.sipsin[slot];
  return sipsin ? SIPSIN_GROUP[sipsin] ?? null : null;
}

/** 슬롯의 십신 이름 (예: '식신') */
export function sipsinNameOfSlot(result: SajuResult, slot: SipsinSlot): string | null {
  return result.sipsin[slot] || null;
}

/** 슬롯의 팔자 글자 (예: '酉') */
export function glyphOfSlot(result: SajuResult, slot: SipsinSlot): string {
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
  }
}

/** '식신' → '식상(食傷)' 라벨 */
export function groupLabel(group: SipsinGroup): string {
  switch (group) {
    case 'bigeop':
      return '비겁';
    case 'siksang':
      return '식상';
    case 'jaesung':
      return '재성';
    case 'gwansung':
      return '관성';
    case 'insung':
      return '인성';
  }
}

/** 슬롯 묶음별 개수 집계 */
export function countGroups(result: SajuResult): Record<SipsinGroup, number> {
  const counts: Record<SipsinGroup, number> = {
    bigeop: 0,
    siksang: 0,
    jaesung: 0,
    gwansung: 0,
    insung: 0,
  };
  for (const slot of SIPSIN_SLOTS) {
    const group = groupOfSlot(result, slot);
    if (group) counts[group] += 1;
  }
  return counts;
}

/** 일간 오행 (예: '己' → '토'). 팔자의 천간은 항상 오행 대응표에 있으므로 실패 시 빈 문자열. */
export function dayGanOhaeng(result: SajuResult): string {
  return getOhaengForGan(result.palja.dayGan) ?? '';
}

/** 일간 대비 오행의 묶음. 오행이 일간 오행과 같거나 상생·상극 관계로 판단한다. */
export function groupFromOhaeng(result: SajuResult, ohaeng: string): SipsinGroup | null {
  const day = dayGanOhaeng(result);
  if (ohaeng === day) return 'bigeop';
  if (isChildOf(day, ohaeng)) return 'siksang'; // 일간이 생하는 오행
  if (isChildOf(ohaeng, day)) return 'insung'; // 일간을 생하는 오행
  if (isSanggeukOf(day, ohaeng)) return 'jaesung'; // 일간이 극하는 오행
  if (isSanggeukOf(ohaeng, day)) return 'gwansung'; // 일간을 극하는 오행
  return null;
}

/** a가 b를 생하면 true */
export function isChildOf(a: string, b: string): boolean {
  switch (a) {
    case '목':
      return b === '화';
    case '화':
      return b === '토';
    case '토':
      return b === '금';
    case '금':
      return b === '수';
    case '수':
      return b === '목';
    default:
      return false;
  }
}

/** a가 b를 극하면 true */
export function isSanggeukOf(a: string, b: string): boolean {
  switch (a) {
    case '목':
      return b === '토';
    case '토':
      return b === '수';
    case '수':
      return b === '화';
    case '화':
      return b === '금';
    case '금':
      return b === '목';
    default:
      return false;
  }
}

/** 묶음 문자열 렌더링: '식상 2·재성 2' */
export function formatGroupCounts(counts: Record<SipsinGroup, number>): string {
  return ['bigeop', 'siksang', 'jaesung', 'gwansung', 'insung']
    .map((g) => `${groupLabel(g as SipsinGroup)} ${counts[g as SipsinGroup]}`)
    .filter((s) => !s.endsWith(' 0'))
    .join('·');
}
