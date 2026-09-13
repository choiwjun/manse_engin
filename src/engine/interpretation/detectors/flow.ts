// 흐름류 detector — 십신 묶음의 상생 라인 감지.
// 십신 정의상 흐름 쌍(식상→재성 등)은 오행이 항상 상생이므로,
// 감지 조건은 존재 여부 + 자릿수 + 위치적 연결(인접성)로 본다.

import type { SajuResult } from '@/engine/types';
import type { RawPattern, SipsinGroup } from '../types';
import {
  areAdjacent,
  countGroups,
  formatGroupCounts,
  groupOfSlot,
  glyphOfSlot,
  sipsinNameOfSlot,
  SIPSIN_SLOTS,
} from '../sipsin-groups';

function slotsOfGroup(result: SajuResult, group: SipsinGroup) {
  return SIPSIN_SLOTS.filter((slot) => groupOfSlot(result, slot) === group);
}

function slotEvidence(result: SajuResult, slots: string[]): string[] {
  return slots.map((slot) => {
    const s = slot as (typeof SIPSIN_SLOTS)[number];
    return `${slotLabel(s)} ${glyphOfSlot(result, s)}=${sipsinNameOfSlot(result, s)}`;
  });
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

/** 두 묶음 사이에 인접 쌍(같은 기둥 또는 이웃 기둥)이 존재하는지 */
function hasAdjacency(aSlots: string[], bSlots: string[]): boolean {
  return aSlots.some((a) => bSlots.some((b) => areAdjacent(a as never, b as never)));
}

export function detectSangsaengSaengjae(result: SajuResult): RawPattern[] {
  const counts = countGroups(result);
  if (counts.siksang < 1 || counts.jaesung < 1) return [];
  const sikSlots = slotsOfGroup(result, 'siksang');
  const jaeSlots = slotsOfGroup(result, 'jaesung');
  const adjacent = hasAdjacency(sikSlots, jaeSlots);
  const strength = clamp(0.5 + (adjacent ? 0.2 : 0) + (counts.siksang + counts.jaesung - 2) * 0.15, 0.5, 1);
  return [
    {
      key: 'saju/flow/sangsaeng-saengjae',
      strength,
      evidence: [
        `식상 ${counts.siksang}·재성 ${counts.jaesung}${adjacent ? ' (인접 배치)' : ''}`,
        ...slotEvidence(result, [...sikSlots, ...jaeSlots]),
      ],
    },
  ];
}

export function detectGwaninSangsaeng(result: SajuResult): RawPattern[] {
  const counts = countGroups(result);
  if (counts.gwansung < 1 || counts.insung < 1) return [];
  const gwanSlots = slotsOfGroup(result, 'gwansung');
  const inSlots = slotsOfGroup(result, 'insung');
  const adjacent = hasAdjacency(gwanSlots, inSlots);
  const strength = clamp(0.5 + (adjacent ? 0.2 : 0) + (counts.gwansung + counts.insung - 2) * 0.15, 0.5, 1);
  return [
    {
      key: 'saju/flow/gwanin-sangsaeng',
      strength,
      evidence: [
        `관성 ${counts.gwansung}·인성 ${counts.insung}${adjacent ? ' (인접 배치)' : ''}`,
        ...slotEvidence(result, [...gwanSlots, ...inSlots]),
      ],
    },
  ];
}

export function detectJaesaengGwan(result: SajuResult): RawPattern[] {
  const counts = countGroups(result);
  // 재생관은 재성·관성이 모두 천간에 드러나야 '자원이 지위를 떠받치는' 구조로 본다
  const jaeGan = slotsOfGroup(result, 'jaesung').filter((s) => s.endsWith('Gan'));
  const gwanGan = slotsOfGroup(result, 'gwansung').filter((s) => s.endsWith('Gan'));
  if (jaeGan.length < 1 || gwanGan.length < 1) return [];
  const adjacent = hasAdjacency(jaeGan, gwanGan);
  const strength = clamp(0.5 + (adjacent ? 0.2 : 0) + (counts.jaesung + counts.gwansung - 2) * 0.1, 0.5, 1);
  return [
    {
      key: 'saju/flow/jaesaeng-gwan',
      strength,
      evidence: [`천간 노출 재성 ${jaeGan.length}·관성 ${gwanGan.length}`, ...slotEvidence(result, [...jaeGan, ...gwanGan])],
    },
  ];
}

export function detectSangsaengJesal(result: SajuResult): RawPattern[] {
  const counts = countGroups(result);
  // 식상제살은 편관이 둘 이상일 때 '압박'이 실재하는 것으로 본다
  const pyeongwan = SIPSIN_SLOTS.filter((s) => sipsinNameOfSlot(result, s) === '편관');
  if (counts.siksang < 1 || pyeongwan.length < 2) return [];
  const sikSlots = slotsOfGroup(result, 'siksang');
  const adjacent = hasAdjacency(sikSlots, pyeongwan);
  const strength = clamp(0.5 + (adjacent ? 0.2 : 0) + (pyeongwan.length - 2) * 0.2, 0.5, 1);
  return [
    {
      key: 'saju/flow/sangsaeng-jesal',
      strength,
      evidence: [`편관 ${pyeongwan.length}·식상 ${counts.siksang}`, ...slotEvidence(result, [...pyeongwan, ...sikSlots])],
    },
  ];
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
