// 시점 detector — 현재 대운이 용신/기신 어느 축인지 판정.

import type { SajuResult } from '@/engine/types';
import type { RawPattern } from '../types';
import { isSanggeukOf, isChildOf } from '../sipsin-groups';

export function detectDaeunYongsin(result: SajuResult): RawPattern[] {
  const current = result.daeun.find((d) => d.isCurrent);
  if (!current) return [];
  const yongsin = result.yongsin.ohaeng;
  const gisin = result.yongsin.gisin.split('(')[0].trim();
  const evidence = [`${current.age}세 대운 ${current.gan}${current.ji}(${current.ohaeng}) — 용신 ${yongsin}·기신 ${gisin}`];

  if (current.ohaeng === yongsin) {
    return [{ key: 'saju/timing/daeun-fit', strength: 0.7, evidence }];
  }
  if (current.ohaeng === gisin) {
    return [{ key: 'saju/timing/daeun-tension', strength: 0.7, evidence }];
  }
  // 용신을 생하면 준(準)용신 구간, 기신을 극하면 기신 억제 구간 — v1에서는 중립으로 본다
  if (isChildOf(current.ohaeng, yongsin) || isSanggeukOf(current.ohaeng, gisin)) {
    return [{ key: 'saju/timing/daeun-neutral', strength: 0.55, evidence: [...evidence, '용신 생조 또는 기신 억제 방향'] }];
  }
  return [{ key: 'saju/timing/daeun-neutral', strength: 0.5, evidence }];
}
