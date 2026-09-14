// 조합(교차) detector — 두 구조 조건이 겹칠 때만 나오는 깊은 해석.
// 전문가가 만세력을 보며 하나하나 조합하는 판단(강약×흐름×시점)을 키로 시스템화한다.
// 다른 detector의 결과에 의존하지 않고 원시 조건을 직접 판정한다 (detector 간 결합 방지).

import type { SajuResult } from '@/engine/types';
import type { RawPattern } from '../types';
import { countGroups, SIPSIN_SLOTS } from '../sipsin-groups';
import { measureOhaeng } from '../meter';

function isDaeunFit(result: SajuResult): boolean {
  const current = result.daeun.find((d) => d.isCurrent);
  return !!current && current.ohaeng === result.yongsin.ohaeng;
}

function isDaeunTension(result: SajuResult): boolean {
  const current = result.daeun.find((d) => d.isCurrent);
  const gisin = result.yongsin.gisin.split('(')[0].trim();
  return !!current && current.ohaeng === gisin;
}

function hasSangsaengSaengjae(result: SajuResult): boolean {
  const counts = countGroups(result);
  return counts.siksang >= 1 && counts.jaesung >= 1;
}

function hasGwaninSangsaeng(result: SajuResult): boolean {
  const counts = countGroups(result);
  return counts.gwansung >= 1 && counts.insung >= 1;
}

/** 재성 천간 노출 수 (detector/imbalance의 재성 노출과 동일 기준) */
function exposedJaeCount(result: SajuResult): number {
  return SIPSIN_SLOTS.filter(
    (s) => s.endsWith('Gan') && (result.sipsin[s] === '편재' || result.sipsin[s] === '정재'),
  ).length;
}

export function detectCombos(result: SajuResult): RawPattern[] {
  const meter = measureOhaeng(result);
  const weak = meter.dayMaster.verdict === 'weak';
  const strong = meter.dayMaster.verdict === 'strong';
  const counts = countGroups(result);
  const jaeExposed = exposedJaeCount(result) >= 2;
  const bigeopGwada = counts.bigeop >= 3;
  const insungGwada = counts.insung >= 3;
  const daeunFit = isDaeunFit(result);
  const daeunTension = isDaeunTension(result);
  const meterEvidence = [
    `비겁+인성 ${meter.dayMaster.score}% — ${meter.dayMaster.verdictLabel}`,
    `식상 ${counts.siksang}·재성 ${counts.jaesung}·관성 ${counts.gwansung}·인성 ${counts.insung}`,
  ];

  const patterns: RawPattern[] = [];
  const push = (key: string, strength: number, extra: string[]) =>
    patterns.push({ key, strength, evidence: [...meterEvidence, ...extra] });

  if (hasSangsaengSaengjae(result) && weak) {
    push('saju/combo/sangsaeng-saengjae--daymaster-weak', 0.6, ['식상생재 구조 + 신약']);
  }
  if (hasSangsaengSaengjae(result) && strong) {
    push('saju/combo/sangsaeng-saengjae--daymaster-strong', 0.65, ['식상생재 구조 + 신강']);
  }
  if (jaeExposed && bigeopGwada) {
    push('saju/combo/jaesung-nochul--bigeop-gwada', 0.65, [`천간 재성 노출 ${exposedJaeCount(result)} + 비겁 ${counts.bigeop}`]);
  }
  if (hasGwaninSangsaeng(result) && insungGwada) {
    push('saju/combo/gwanin-sangsaeng--insung-gwada', 0.6, [`관인상생 + 인성 ${counts.insung}`]);
  }
  if (weak && daeunFit) {
    push('saju/combo/daymaster-weak--daeun-fit', 0.7, ['신약 + 용신 대운']);
  }
  if (weak && daeunTension) {
    push('saju/combo/daymaster-weak--daeun-tension', 0.7, ['신약 + 기신 대운']);
  }
  if (strong && daeunFit) {
    push('saju/combo/daymaster-strong--daeun-fit', 0.65, ['신강 + 용신 대운']);
  }
  if (strong && daeunTension) {
    push('saju/combo/daymaster-strong--daeun-tension', 0.6, ['신강 + 기신 대운']);
  }
  return patterns;
}
