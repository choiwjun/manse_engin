// 조후(調候) detector — 계절(월지 왕오행)×일간 오행의 균형 관계를 감지한다.
// 계량기(measureOhaeng)의 season을 재료로 쓴다. 조후는 격국과 별개로
// "이 명식이 태어난 환경이 일간에게 편한가"를 읽는 축이다.

import type { SajuResult } from '@/engine/types';
import type { RawPattern } from '../types';
import { measureOhaeng } from '../meter';
import { dayGanOhaeng, isChildOf, isSanggeukOf } from '../sipsin-groups';

export function detectJohu(result: SajuResult): RawPattern[] {
  const meter = measureOhaeng(result);
  const king = meter.season.kingOhaeng;
  const day = dayGanOhaeng(result);
  if (!king || !day || !meter.season.name) return [];
  const figures = {
    season: meter.season.name,
    monthJi: meter.season.monthJi,
    king,
    dayOhaeng: day,
  };
  const evidence = [
    `월지 ${meter.season.monthJi} — ${meter.season.name}·왕오행 ${king}`,
    `일간 ${result.palja.dayGan}(${day})`,
  ];

  if (king === day) {
    return [{ key: 'saju/johu/season-command', strength: 0.6, evidence, figures }];
  }
  if (isChildOf(king, day)) {
    // 계절(왕오행)이 일간을 생함
    return [{ key: 'saju/johu/season-support', strength: 0.65, evidence, figures }];
  }
  if (isChildOf(day, king)) {
    // 일간이 계절을 생함 — 기운을 밖으로 흘려보내는 형태
    return [{ key: 'saju/johu/season-drain', strength: 0.5, evidence, figures }];
  }
  if (isSanggeukOf(king, day)) {
    // 계절이 일간을 극함
    return [{ key: 'saju/johu/season-pressure', strength: 0.65, evidence, figures }];
  }
  if (isSanggeukOf(day, king)) {
    // 일간이 계절을 극함
    return [{ key: 'saju/johu/season-control', strength: 0.55, evidence, figures }];
  }
  return [];
}
