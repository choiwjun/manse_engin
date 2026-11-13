// 시점 detector — 현재 대운이 용신/기신 어느 축인지 판정하고,
// 대운×세운이 같은 축으로 가는 이중 교차를 감지한다. 동적 문장용 figures를 함께 채운다.
// 간지는 천간·지지 두 축으로 나눠 판정한다(judgeGanJi) — 한 축만 보면
// 천간 용신·지지 기신 같은 혼재 판을 한 방향으로 단정하는 오류가 생긴다.

import type { SajuResult } from '@/engine/types';
import type { RawPattern } from '../types';
import { judgeGanJi } from '../narrative';

export function detectDaeunYongsin(result: SajuResult): RawPattern[] {
  const current = result.daeun.find((d) => d.isCurrent);
  if (!current) return [];
  const yongsin = result.yongsin.ohaeng;
  const gisin = result.yongsin.gisin.split('(')[0].trim();
  const j = judgeGanJi(result, current.gan, current.ji);
  const evidence = [`${current.age}세 대운 ${current.gan}${current.ji}(${j.axisText}) — 용신 ${yongsin}·기신 ${gisin}`];
  const figures = {
    age: current.age,
    ganJi: `${current.gan}${current.ji}`,
    ohaeng: current.ohaeng,
    jiOhaeng: j.jiOhaeng ?? '',
    ganOhaeng: j.ganOhaeng ?? '',
    yongsin,
    gisin,
  };

  if (j.verdict === 'fit') {
    return [{ key: 'saju/timing/daeun-fit', strength: 0.7, evidence, figures }];
  }
  if (j.verdict === 'tension') {
    return [{ key: 'saju/timing/daeun-tension', strength: 0.7, evidence, figures }];
  }
  if (j.verdict === 'mixed') {
    return [{ key: 'saju/timing/daeun-mixed', strength: 0.65, evidence: [...evidence, '천간·지지 축 엇갈림'], figures }];
  }
  return [{ key: 'saju/timing/daeun-neutral', strength: 0.5, evidence, figures }];
}

/** 대운×세운 이중 교차 — 큰 판과 연 판이 같은 축을 가리킬 때만 감지(흔한 조합이 아니므로 정보량이 크다).
 *  어느 한쪽이 'mixed'면 같은 축 결론을 내리지 않는다 — 축이 갈리는 판을 단일 방향으로 읽지 않기 위함. */
export function detectDaeunSeunCross(result: SajuResult): RawPattern[] {
  const current = result.daeun.find((d) => d.isCurrent);
  if (!current || !result.seun.gan) return [];
  const yongsin = result.yongsin.ohaeng;
  const gisin = result.yongsin.gisin.split('(')[0].trim();
  const dj = judgeGanJi(result, current.gan, current.ji);
  const sj = judgeGanJi(result, result.seun.gan, result.seun.ji);
  if (!sj.ganOhaeng && !sj.jiOhaeng) return [];
  const evidence = [
    `대운 ${current.gan}${current.ji}(${dj.axisText}) × 세운 ${result.seun.gan}${result.seun.ji}(${sj.axisText})`,
    `용신 ${yongsin}·기신 ${gisin}`,
  ];
  const figures = {
    daeunGanJi: `${current.gan}${current.ji}`,
    seunGanJi: `${result.seun.gan}${result.seun.ji}`,
    daeunGanOhaeng: dj.ganOhaeng ?? '',
    daeunJiOhaeng: dj.jiOhaeng ?? '',
    seunGanOhaeng: sj.ganOhaeng ?? '',
    seunJiOhaeng: sj.jiOhaeng ?? '',
    yongsin,
    gisin,
  };
  if (dj.verdict === 'fit' && sj.verdict === 'fit') {
    return [{ key: 'saju/timing/daeun-seun-fit', strength: 0.8, evidence, figures }];
  }
  if (dj.verdict === 'tension' && sj.verdict === 'tension') {
    return [{ key: 'saju/timing/daeun-seun-tension', strength: 0.75, evidence, figures }];
  }
  return [];
}
