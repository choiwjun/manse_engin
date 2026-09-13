// 강약 detector — 계량기(measureOhaeng)의 수치를 해석 패턴으로 변환.
// 동적 문장용 figures(dayMasterScore, top/bottom, missing)를 함께 채운다.

import type { SajuResult } from '@/engine/types';
import type { RawPattern } from '../types';
import { measureOhaeng } from '../meter';

export function detectDayMasterStrong(result: SajuResult): RawPattern[] {
  const meter = measureOhaeng(result);
  if (meter.dayMaster.verdict !== 'strong') return [];
  return [
    {
      key: 'saju/imbalance/daymaster-strong',
      strength: 0.7,
      evidence: [
        `비겁+인성 ${meter.dayMaster.score}% — ${meter.dayMaster.verdictLabel}`,
        `비겁 ${meter.groupPercents.bigeop}%·인성 ${meter.groupPercents.insung}% vs 식상 ${meter.groupPercents.siksang}%·재성 ${meter.groupPercents.jaesung}%·관성 ${meter.groupPercents.gwansung}%`,
      ],
      figures: { dayMasterScore: meter.dayMaster.score },
    },
  ];
}

export function detectDayMasterWeak(result: SajuResult): RawPattern[] {
  const meter = measureOhaeng(result);
  if (meter.dayMaster.verdict !== 'weak') return [];
  return [
    {
      key: 'saju/imbalance/daymaster-weak',
      strength: 0.7,
      evidence: [
        `비겁+인성 ${meter.dayMaster.score}% — ${meter.dayMaster.verdictLabel}`,
        `비겁 ${meter.groupPercents.bigeop}%·인성 ${meter.groupPercents.insung}% vs 식상 ${meter.groupPercents.siksang}%·재성 ${meter.groupPercents.jaesung}%·관성 ${meter.groupPercents.gwansung}%`,
      ],
      figures: { dayMasterScore: meter.dayMaster.score },
    },
  ];
}

/** 오행 편중 — 최고/최저 점유율 격차가 크고, 결(缺)오행이 있으면 별도 표기 */
export function detectOhaengSkew(result: SajuResult): RawPattern[] {
  const meter = measureOhaeng(result);
  const sorted = [...meter.distribution].sort((a, b) => b.percent - a.percent);
  const top = sorted[0];
  const bottom = sorted[sorted.length - 1];
  const gap = Math.round((top.percent - bottom.percent) * 10) / 10;
  const missing = meter.distribution.filter((d) => d.percent === 0).map((d) => d.ohaeng);

  const patterns: RawPattern[] = [];
  if (gap >= 15) {
    patterns.push({
      key: 'saju/imbalance/ohaeng-skew',
      strength: Math.min(1, 0.4 + gap / 50),
      evidence: [`${top.ohaeng} ${top.percent}% — ${bottom.ohaeng} ${bottom.percent}% (격차 ${gap}%p)`, meter.season.name ? `월지 계절: ${meter.season.name}·왕오행 ${meter.season.kingOhaeng}` : ''].filter(Boolean),
      figures: { top: top.ohaeng, topPercent: top.percent, bottom: bottom.ohaeng, bottomPercent: bottom.percent },
    });
  }
  if (missing.length > 0) {
    patterns.push({
      key: 'saju/imbalance/ohaeng-missing',
      strength: 0.5,
      evidence: [`결(缺)오행: ${missing.join('·')}`, `분포 — ${meter.distribution.map((d) => `${d.ohaeng} ${d.percent}%`).join(', ')}`],
      figures: { missing: missing.join('·') },
    });
  }
  return patterns;
}
