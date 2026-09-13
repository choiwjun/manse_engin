// 관계 detector — 천간합(직접 표)과 지지 합·충·형·해(엔진의 analyzeJijiRelations 재사용).

import type { SajuResult } from '@/engine/types';
import type { RawPattern } from '../types';
import { analyzeJijiRelations } from '@/engine/saju/sinsal';

const GAN_HAP_KEYS: Record<string, string> = {
  '甲己': 'saju/relation/gan-hap-gabgi',
  '乙庚': 'saju/relation/gan-hap-eulgyeong',
  '丙辛': 'saju/relation/gan-hap-byeongsin',
  '丁壬': 'saju/relation/gan-hap-jeongim',
  '戊癸': 'saju/relation/gan-hap-mugye',
};

const GAN_POSITION_LABEL: Record<string, string> = {
  yearGan: '년간',
  monthGan: '월간',
  dayGan: '일간',
  hourGan: '시간',
};

const JIJI_POSITION_LABEL: Record<string, string> = {
  yearJi: '년지',
  monthJi: '월지',
  dayJi: '일지',
  hourJi: '시지',
};

/** 천간합 — 일간과의 합은 강도를 높인다 (자아와의 결합이므로 해석 무게가 크다) */
export function detectGanHap(result: SajuResult): RawPattern[] {
  const { palja } = result;
  const gans: [string, string][] = [
    ['yearGan', palja.yearGan],
    ['monthGan', palja.monthGan],
    ['dayGan', palja.dayGan],
    ['hourGan', palja.hourGan],
  ];
  const patterns: RawPattern[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < gans.length; i++) {
    for (let j = i + 1; j < gans.length; j++) {
      const [posA, ganA] = gans[i];
      const [posB, ganB] = gans[j];
      if (!ganA || !ganB) continue;
      const pair = GAN_HAP_KEYS[`${ganA}${ganB}`] ?? GAN_HAP_KEYS[`${ganB}${ganA}`];
      if (!pair) continue;
      const involvesDayGan = posA === 'dayGan' || posB === 'dayGan';
      const evidence = `${GAN_POSITION_LABEL[posA]} ${ganA} ↔ ${GAN_POSITION_LABEL[posB]} ${ganB}`;
      // 같은 합이 두 번 감지되지 않도록 가장 강한 것 하나만
      if (seen.has(pair)) continue;
      seen.add(pair);
      patterns.push({
        key: pair,
        strength: involvesDayGan ? 0.8 : 0.6,
        evidence: [evidence],
      });
    }
  }
  return patterns;
}

/** 지지 관계 — 엔진 1층 facts(jijiRelations)를 패턴으로 변환 */
export function detectJijiRelations(result: SajuResult): RawPattern[] {
  const relations = result.jijiRelations ?? analyzeJijiRelations(result.palja);
  const patterns: RawPattern[] = [];
  for (const rel of relations) {
    let key: string | null = null;
    let strength = 0.6;
    switch (rel.type) {
      case '합':
        key = 'saju/relation/jiji-hap';
        break;
      case '충':
        key = 'saju/relation/jiji-chung';
        strength = 0.7;
        break;
      case '형':
        key = 'saju/relation/jiji-hyeong';
        strength = 0.7;
        break;
      case '해':
        key = 'saju/relation/jiji-hae';
        break;
      default:
        break; // 파(破)는 v1에서 텍스트를 붙이지 않는다
    }
    if (!key) continue;
    const positions = rel.positions.map((p) => JIJI_POSITION_LABEL[p] ?? p).join('+');
    patterns.push({
      key,
      strength,
      evidence: [`${positions}: ${rel.jijis.join('·')} (${rel.description})`],
    });
  }
  return patterns;
}
