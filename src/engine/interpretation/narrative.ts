// 시점 서사 — 대운(큰 판)×세운(연 판)×월운(조율 지점)을 결합한 문장을 만든다.
// 상담사의 실전 기술을 시스템화하는 층: 과거 대운 구간은 "확인 질문"으로 표기해
// 고객 응답으로 역검증할 수 있게 한다.

import type { SajuResult } from '@/engine/types';
import { isChildOf, isSanggeukOf } from './sipsin-groups';
import { josa } from './sentence';
import { getOhaengForGan, getOhaengForJi } from '@/engine/adapter/hanja-mapper';

/** 용신·기신 축 대비 판정. 대운 detector(timing.ts)와 같은 판정 기준 */
export type TimingVerdict = 'fit' | 'tension' | 'neutral';

export interface TimingVerdictInfo {
  verdict: TimingVerdict;
  /** 판정 요약 ('용신 방향', '기신 방향', '중간 오행') */
  label: string;
  /** 판에 대한 한 문장 */
  line: string;
}

export interface TimingNarrative {
  /** 현재 대운 — daeun 중 isCurrent */
  daeun: {
    age: number;
    ganJi: string;
    ohaeng: string;
    verdict: TimingVerdict;
    line: string;
  } | null;
  /** 다음 대운 전환점 */
  next: {
    age: number;
    ganJi: string;
    ohaeng: string;
    line: string;
  } | null;
  /** 세운(현재 연 운) — result.seun 기준 */
  sewoon: {
    ganJi: string;
    ohaeng: string;
    verdict: TimingVerdict;
    line: string;
  } | null;
  /** 월운 — 제공된 경우 */
  wolun: {
    ganJi: string;
    line: string;
  } | null;
  /** 역검증 확인 질문 — 과거 대운 구간에서 예측되는 사건 유형 */
  checkQuestions: string[];
  /** 대운×세운 결합 서사 — 판 위의 판 */
  combined: string | null;
  /** 서사 전체를 읽는 순서로 이은 문장들 (대운 → 세운 → 월운 → 전환점) */
  lines: string[];
}

/** 오행이 용신/기신 축 중 어디에 서는지 — 생조·억제는 준(準)축으로 fit/tension 쪽에 둔다 */
export function judgeOhaeng(result: SajuResult, ohaeng: string): TimingVerdictInfo {
  const yongsin = result.yongsin.ohaeng;
  const gisin = result.yongsin.gisin.split('(')[0].trim();
  if (ohaeng === yongsin) {
    return {
      verdict: 'fit',
      label: '용신 방향',
      line: `용신 ${yongsin} 방향 — 기회 확장·전환이 열리는 판입니다`,
    };
  }
  if (ohaeng === gisin) {
    return {
      verdict: 'tension',
      label: '기신 방향',
      line: `기신 ${gisin} 방향 — 규모 조절과 기반 점검이 맞는 판입니다`,
    };
  }
  if (isChildOf(ohaeng, yongsin) || isSanggeukOf(ohaeng, gisin)) {
    return {
      verdict: 'fit',
      label: '준(準)용신 방향',
      line: `용신 ${yongsin}${josa(yongsin, '을를')} 돕는 ${ohaeng} 오행 — 간접적으로 순풍이 나는 판입니다`,
    };
  }
  if (isChildOf(ohaeng, gisin) || isSanggeukOf(ohaeng, yongsin)) {
    return {
      verdict: 'tension',
      label: '준(準)기신 방향',
      line: `기신 ${gisin}을(를) 돕는 ${ohaeng} 오행 — 소모가 늘기 쉬운 판입니다`,
    };
  }
  return {
    verdict: 'neutral',
    label: '중간 오행',
    line: `중간 오행(${ohaeng}) — 판이 크게 열리거나 닫히지 않는 유지·정비 구간입니다`,
  };
}

function ohaengOfGanJi(gan: string, ji: string): string {
  return getOhaengForGan(gan) ?? getOhaengForJi(ji) ?? '';
}

/** 과거 대운을 돌며 예측 사건 유형을 "확인 질문"으로 바꾼다 (상담 역검증 재료).
 *  판정은 judgeOhaeng과 동일 축을 따른다 — 서사와 확인 질문이 모순되지 않도록. */
function buildCheckQuestions(result: SajuResult): string[] {
  const currentIdx = result.daeun.findIndex((d) => d.isCurrent);
  if (currentIdx < 0) return [];
  const questions: string[] = [];
  for (const d of result.daeun.slice(0, currentIdx + 1)) {
    const nextAge = result.daeun[result.daeun.indexOf(d) + 1]?.age;
    const range = nextAge ? `${d.age}~${nextAge - 1}세` : `${d.age}세 이후`;
    const ganJi = `${d.gan}${d.ji}`;
    const info = judgeOhaeng(result, d.ohaeng);
    if (info.verdict === 'tension') {
      questions.push(`${range} ${ganJi} 대운(기신 축) — 이 시기에 축소·정리·건강 이슈가 있었는지 확인 질문으로 던지세요.`);
    } else if (info.verdict === 'fit') {
      questions.push(`${range} ${ganJi} 대운(용신 축) — 이 시기에 기회 확장(이직·창업·결실)이 있었는지 확인 질문으로 던지세요.`);
    }
  }
  return questions.slice(-3);
}

/** SajuResult → 대운×세운×월운 결합 서사 */
export function buildTimingNarrative(result: SajuResult): TimingNarrative {
  const current = result.daeun.find((d) => d.isCurrent) ?? null;
  const currentIdx = result.daeun.findIndex((d) => d.isCurrent);
  const next = currentIdx >= 0 ? result.daeun[currentIdx + 1] ?? null : null;

  const daeunInfo = current ? judgeOhaeng(result, current.ohaeng) : null;
  const daeun = current && daeunInfo
    ? {
        age: current.age,
        ganJi: `${current.gan}${current.ji}`,
        ohaeng: current.ohaeng,
        verdict: daeunInfo.verdict,
        line: `${current.age}세 무렵 ${current.gan}${current.ji} 대운(${current.ohaeng})${josa(current.ohaeng, '은는')} ${daeunInfo.line}.`,
      }
    : null;

  const nextInfo = next ? judgeOhaeng(result, next.ohaeng) : null;
  const nextEntry = next && nextInfo
    ? {
        age: next.age,
        ganJi: `${next.gan}${next.ji}`,
        ohaeng: next.ohaeng,
        line: `${next.age}세 무렵 ${next.gan}${next.ji} 대운(${next.ohaeng}) 진입 — ${nextInfo.label} 판으로 전환됩니다.`,
      }
    : null;

  let sewoon: TimingNarrative['sewoon'] = null;
  if (result.seun.gan) {
    const seunOhaeng = ohaengOfGanJi(result.seun.gan, result.seun.ji);
    if (seunOhaeng) {
      const info = judgeOhaeng(result, seunOhaeng);
      sewoon = {
        ganJi: `${result.seun.gan}${result.seun.ji}`,
        ohaeng: seunOhaeng,
        verdict: info.verdict,
        line: `올해 세운 ${result.seun.gan}${result.seun.ji}(${seunOhaeng})${josa(seunOhaeng, '은는')} ${info.line}.`,
      };
    }
  }

  let wolun: TimingNarrative['wolun'] = null;
  if (result.wolun?.gan) {
    wolun = {
      ganJi: `${result.wolun.gan}${result.wolun.ji}`,
      line: `이번 달 월운 ${result.wolun.gan}${result.wolun.ji} — 세운 방향 안에서 달·주 단위 조율 지점입니다.`,
    };
  }

  const checkQuestions = buildCheckQuestions(result);

  const combined =
    daeun && sewoon
      ? `큰 판(${daeun.ganJi} 대운, ${daeunInfo?.label}) 위에서 올해(${sewoon.ganJi})는 ${sewoon.verdict === 'fit' ? '순풍' : sewoon.verdict === 'tension' ? '역풍' : '잔잔한'} 구간 — 대운의 방향을 세운이 증폭하거나 누릅니다.`
      : null;

  const lines = [daeun?.line, sewoon?.line, wolun?.line, nextEntry?.line, combined].filter(
    (s): s is string => typeof s === 'string',
  );

  return { daeun, next: nextEntry, sewoon, wolun, checkQuestions, combined, lines };
}
