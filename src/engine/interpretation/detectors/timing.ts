// 시점 detector — 현재 대운이 용신/기신 어느 축인지 판정하고,
// 대운×세운이 같은 축으로 가는 이중 교차를 감지한다. 동적 문장용 figures를 함께 채운다.

import type { SajuResult } from '@/engine/types';
import type { RawPattern } from '../types';
import { isSanggeukOf, isChildOf } from '../sipsin-groups';
import { getOhaengForGan, getOhaengForJi } from '@/engine/adapter/hanja-mapper';

export function detectDaeunYongsin(result: SajuResult): RawPattern[] {
  const current = result.daeun.find((d) => d.isCurrent);
  if (!current) return [];
  const yongsin = result.yongsin.ohaeng;
  const gisin = result.yongsin.gisin.split('(')[0].trim();
  const evidence = [`${current.age}세 대운 ${current.gan}${current.ji}(${current.ohaeng}) — 용신 ${yongsin}·기신 ${gisin}`];
  const figures = { age: current.age, ganJi: `${current.gan}${current.ji}`, ohaeng: current.ohaeng, yongsin, gisin };

  if (current.ohaeng === yongsin) {
    return [{ key: 'saju/timing/daeun-fit', strength: 0.7, evidence, figures }];
  }
  if (current.ohaeng === gisin) {
    return [{ key: 'saju/timing/daeun-tension', strength: 0.7, evidence, figures }];
  }
  // 용신을 생하면 준(準)용신 구간, 기신을 극하면 기신 억제 구간 — v1에서는 중립으로 본다
  if (isChildOf(current.ohaeng, yongsin) || isSanggeukOf(current.ohaeng, gisin)) {
    return [{ key: 'saju/timing/daeun-neutral', strength: 0.55, evidence: [...evidence, '용신 생조 또는 기신 억제 방향'], figures }];
  }
  return [{ key: 'saju/timing/daeun-neutral', strength: 0.5, evidence, figures }];
}

/** 세운 글자(천간→지지 순)의 오행 — 천간 우선, 비어 있으면 지지 */
function seunOhaeng(result: SajuResult): string {
  const gan = getOhaengForGan(result.seun.gan);
  if (gan) return gan;
  return getOhaengForJi(result.seun.ji) ?? '';
}

/** 대운×세운 이중 교차 — 큰 판과 연 판이 같은 축을 가리킬 때만 감지(흔한 조합이 아니므로 정보량이 크다) */
export function detectDaeunSeunCross(result: SajuResult): RawPattern[] {
  const current = result.daeun.find((d) => d.isCurrent);
  if (!current || !result.seun.gan) return [];
  const yongsin = result.yongsin.ohaeng;
  const gisin = result.yongsin.gisin.split('(')[0].trim();
  const seunO = seunOhaeng(result);
  if (!seunO) return [];
  const evidence = [
    `대운 ${current.gan}${current.ji}(${current.ohaeng}) × 세운 ${result.seun.gan}${result.seun.ji}(${seunO})`,
    `용신 ${yongsin}·기신 ${gisin}`,
  ];
  const figures = {
    daeunGanJi: `${current.gan}${current.ji}`,
    seunGanJi: `${result.seun.gan}${result.seun.ji}`,
    yongsin,
    gisin,
  };
  if (current.ohaeng === yongsin && seunO === yongsin) {
    return [{ key: 'saju/timing/daeun-seun-fit', strength: 0.8, evidence, figures }];
  }
  if (current.ohaeng === gisin && seunO === gisin) {
    return [{ key: 'saju/timing/daeun-seun-tension', strength: 0.75, evidence, figures }];
  }
  return [];
}
