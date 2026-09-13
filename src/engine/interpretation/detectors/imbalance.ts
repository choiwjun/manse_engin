// 과부족 detector — 십신 묶음 개수의 편중 감지.
// 8슬롯(천간 4 + 지지 4) 중 몇 슬롯이 같은 묶음에 몰려 있는지로 본다.

import type { SajuResult } from '@/engine/types';
import type { RawPattern } from '../types';
import { countGroups, formatGroupCounts } from '../sipsin-groups';

/** 과다 기준: 3개부터 편중, 4개 이상이면 뚜렷 */
function gwadaStrength(count: number): number {
  return Math.min(1, Math.max(0.3, (count - 2) * 0.25));
}

function gwadaEvidence(counts: ReturnType<typeof countGroups>, summary: string): string[] {
  return [summary, formatGroupCounts(counts)];
}

export function detectInsungGwada(result: SajuResult): RawPattern[] {
  const counts = countGroups(result);
  if (counts.insung < 3) return [];
  return [{ key: 'saju/imbalance/insung-gwada', strength: gwadaStrength(counts.insung), evidence: gwadaEvidence(counts, `인성 ${counts.insung}`) }];
}

export function detectBigeopGwada(result: SajuResult): RawPattern[] {
  const counts = countGroups(result);
  if (counts.bigeop < 3) return [];
  return [{ key: 'saju/imbalance/bigeop-gwada', strength: gwadaStrength(counts.bigeop), evidence: gwadaEvidence(counts, `비겁 ${counts.bigeop}`) }];
}

export function detectSiksangGwada(result: SajuResult): RawPattern[] {
  const counts = countGroups(result);
  if (counts.siksang < 3) return [];
  return [{ key: 'saju/imbalance/siksang-gwada', strength: gwadaStrength(counts.siksang), evidence: gwadaEvidence(counts, `식상 ${counts.siksang}`) }];
}

export function detectGwansungGwada(result: SajuResult): RawPattern[] {
  const counts = countGroups(result);
  if (counts.gwansung < 3) return [];
  return [{ key: 'saju/imbalance/gwansung-gwada', strength: gwadaStrength(counts.gwansung), evidence: gwadaEvidence(counts, `관성 ${counts.gwansung}`) }];
}

/** 재성 노출: 천간에 재성이 둘 이상 드러난 경우 */
export function detectJaesungNochul(result: SajuResult): RawPattern[] {
  const counts = countGroups(result);
  const ganSlots = ['yearGan', 'monthGan', 'hourGan'].filter(
    (s) =>
      result.sipsin[s] === '편재' || result.sipsin[s] === '정재',
  );
  if (ganSlots.length < 2) return [];
  return [
    {
      key: 'saju/imbalance/jaesung-nochul',
      strength: Math.min(1, 0.4 + ganSlots.length * 0.2),
      evidence: [`천간 재성 노출 ${ganSlots.length}`, formatGroupCounts(counts)],
    },
  ];
}
