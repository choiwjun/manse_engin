// 시점 서사 — 대운(큰 판)×세운(연 판)×월운(조율 지점)을 결합한 문장을 만든다.
// 상담사의 실전 기술을 시스템화하는 층: 과거 대운 구간은 "확인 질문"으로 표기해
// 고객 응답으로 역검증할 수 있게 한다. 세운은 일간 대비 십신까지 명시한다.

import type { SajuResult } from '@/engine/types';
import { isChildOf, isSanggeukOf } from './sipsin-groups';
import { determineSipsin } from '@/engine/saju/sipsin';
import { getOhaengForGan, getOhaengForJi, getKoreanForGan, getKoreanForJi } from '@/engine/adapter/hanja-mapper';

/** 용신·기신 축 대비 판정. 대운 detector(timing.ts)와 같은 판정 기준.
 *  'mixed'는 천간 축과 지지 축이 용신·기신으로 갈릴 때만 나오는 종합 판정이다. */
export type TimingVerdict = 'fit' | 'tension' | 'mixed' | 'neutral';

export interface TimingVerdictInfo {
  verdict: TimingVerdict;
  /** 판정 요약 ('용신 방향', '기신 방향', '중간 오행') */
  label: string;
  /** 그 판의 성격을 읽는 한 문장 (라벨 제외) */
  line: string;
}

export interface TimingNarrative {
  /** 대운 전체 흐름 — 8단계 각각의 나이·간지·오행·판정·한 줄 서사 */
  daeunFlow: {
    age: number;
    ganJi: string;
    ohaeng: string;
    /** 지지 오행 — 천간과 다른 축일 수 있다 */
    jiOhaeng?: string;
    verdict: TimingVerdict;
    /** 천간 축 단독 판정 */
    ganVerdict?: TimingVerdict;
    /** 지지 축 단독 판정 */
    jiVerdict?: TimingVerdict;
    line: string;
    isCurrent: boolean;
  }[];
  /** 현재 대운 — daeun 중 isCurrent */
  daeun: {
    age: number;
    ganJi: string;
    ohaeng: string;
    jiOhaeng?: string;
    verdict: TimingVerdict;
    ganVerdict?: TimingVerdict;
    jiVerdict?: TimingVerdict;
    line: string;
  } | null;
  /** 다음 대운 전환점 */
  next: {
    age: number;
    ganJi: string;
    ohaeng: string;
    jiOhaeng?: string;
    line: string;
  } | null;
  /** 세운(현재 연 운) — result.seun 기준. sipsin = 일간 대비 세운 천간의 십신 */
  sewoon: {
    ganJi: string;
    ohaeng: string;
    jiOhaeng?: string;
    sipsin: string | null;
    verdict: TimingVerdict;
    ganVerdict?: TimingVerdict;
    jiVerdict?: TimingVerdict;
    line: string;
  } | null;
  /** 월운 — 제공된 경우. verdict = 용신/기신 축 판정, cross = 세운과의 교차 */
  wolun: {
    ganJi: string;
    ohaeng: string;
    jiOhaeng?: string;
    sipsin: string | null;
    verdict: TimingVerdict;
    ganVerdict?: TimingVerdict;
    jiVerdict?: TimingVerdict;
    line: string;
    /** 세운과 월운의 방향 교차 — '같은 방향', '엇갈림', '축 혼재', '세운 중립' */
    cross: string | null;
  } | null;
  /** 대운 전환 임박 — 현재 대운 말기(전환 6개월 전후)일 때 서사 */
  transition: {
    /** 현재 대운 말기 여부 */
    imminent: boolean;
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
    return { verdict: 'fit', label: '용신 방향', line: '확장·전환 가능성을 참고할 수 있는 판입니다' };
  }
  if (ohaeng === gisin) {
    return { verdict: 'tension', label: '기신 방향', line: '규모 조절과 기반 점검이 맞는 판입니다' };
  }
  if (isChildOf(ohaeng, yongsin) || isSanggeukOf(ohaeng, gisin)) {
    return { verdict: 'fit', label: '준(準)용신 방향', line: '간접적인 도움 가능성을 참고할 수 있는 판입니다' };
  }
  if (isChildOf(ohaeng, gisin) || isSanggeukOf(ohaeng, yongsin)) {
    return { verdict: 'tension', label: '준(準)기신 방향', line: '소모가 늘기 쉬운 판입니다' };
  }
  return {
    verdict: 'neutral',
    label: '중간 오행',
    line: '크게 열리거나 닫히지 않는 유지·정비 구간입니다',
  };
}

/** 간지(干支)의 천간·지지 이중 판정 — 두 축을 각각 용신/기신 축에 대조한 뒤 종합한다.
 *  한 축만 보면 丁亥 대운을 '화 용신'으로 단정하는 오류가 생긴다(지지 亥는 수).
 *  종합 규칙: 두 축이 fit·tension으로 갈리면 'mixed', 한 축만 방향이 있으면 그 축,
 *  같은 방향이면 그 방향, 둘 다 중간이면 'neutral'. */
export interface GanJiJudgement {
  /** 천간 오행 / 천간 축 판정 */
  ganOhaeng: string | null;
  ganAxis: TimingVerdictInfo | null;
  /** 지지 오행 / 지지 축 판정 */
  jiOhaeng: string | null;
  jiAxis: TimingVerdictInfo | null;
  /** 종합 판정 — 두 축이 용신·기신으로 갈리면 'mixed' */
  verdict: TimingVerdict;
  /** 종합 라벨 */
  label: string;
  /** 종합 한 문장 */
  line: string;
  /** '천간 금 용신 방향 · 지지 화 기신 방향' 식 축 요약 */
  axisText: string;
}

export function judgeGanJi(result: SajuResult, gan?: string, ji?: string): GanJiJudgement {
  const ganOhaeng = gan ? getOhaengForGan(gan) : null;
  const jiOhaeng = ji ? getOhaengForJi(ji) : null;
  const ganAxis = ganOhaeng ? judgeOhaeng(result, ganOhaeng) : null;
  const jiAxis = jiOhaeng ? judgeOhaeng(result, jiOhaeng) : null;
  const ganV = ganAxis?.verdict ?? null;
  const jiV = jiAxis?.verdict ?? null;
  const axisText = [
    ganAxis && ganOhaeng ? `천간 ${ganOhaeng} ${ganAxis.label}` : null,
    jiAxis && jiOhaeng ? `지지 ${jiOhaeng} ${jiAxis.label}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  let verdict: TimingVerdict;
  let label: string;
  let line: string;
  if (ganV && jiV && ganV !== jiV && ganV !== 'neutral' && jiV !== 'neutral') {
    verdict = 'mixed';
    label = '엇갈림(용신·기신 혼재)';
    line = '천간과 지지가 용신·기신으로 갈리는 판입니다 — 한 축만으로 방향을 단정하지 않고 구간 안의 완급을 함께 살핍니다';
  } else {
    const rep = (ganV && ganV !== 'neutral' ? ganAxis : jiV && jiV !== 'neutral' ? jiAxis : ganAxis ?? jiAxis)!;
    verdict = rep.verdict;
    label = rep.label;
    line = rep.line;
  }
  return { ganOhaeng, ganAxis, jiOhaeng, jiAxis, verdict, label, line, axisText };
}

/** 축 요약이 없을 때를 대비한 오행 표기 (기존 ohaeng 필드 호환) */
function ohaengOfGanJi(gan: string, ji: string): string {
  return getOhaengForGan(gan) ?? getOhaengForJi(ji) ?? '';
}

/** 간지 한글 읽기 (예: 丙午 → '병오'). 조사 부착용 — Hanja에는 조사를 붙일 수 없다 */
function koreanReading(gan: string, ji: string): string {
  const kGan = getKoreanForGan(gan);
  const kJi = getKoreanForJi(ji);
  return kGan && kJi ? `${kGan}${kJi}` : '';
}

/** 과거 대운을 돌며 예측 사건 유형을 "확인 질문"으로 바꾼다 (상담 역검증 재료).
 *  판정은 judgeGanJi와 동일 축을 따른다 — 서사와 확인 질문이 모순되지 않도록. */
function buildCheckQuestions(result: SajuResult): string[] {
  const currentIdx = result.daeun.findIndex((d) => d.isCurrent);
  if (currentIdx < 0) return [];
  const questions: string[] = [];
  for (const d of result.daeun.slice(0, currentIdx + 1)) {
    const nextAge = result.daeun[result.daeun.indexOf(d) + 1]?.age;
    const range = nextAge ? `${d.age}~${nextAge - 1}세` : `${d.age}세 이후`;
    const ganJi = `${d.gan}${d.ji}`;
    const info = judgeGanJi(result, d.gan, d.ji);
    if (info.verdict === 'tension') {
      questions.push(`${range} ${ganJi} 대운(기신 축) — 이 구간에 축소·정리나 생활 리듬 변화로 느낀 일이 있었는지 확인하는 질문입니다. 운세가 원인이나 결과를 정한다고 보지는 않습니다.`);
    } else if (info.verdict === 'fit') {
      questions.push(`${range} ${ganJi} 대운(용신 축) — 이 구간에 이직·창업·결실처럼 변화로 느낀 일이 있었는지 확인하는 질문입니다. 운세가 원인이나 결과를 정한다고 보지는 않습니다.`);
    } else if (info.verdict === 'mixed') {
      questions.push(`${range} ${ganJi} 대운(${info.axisText}) — 이 구간에 잘 풀리는 일과 무거운 일이 함께 섞여 있었는지 확인하는 질문입니다. 운세가 원인이나 결과를 정한다고 보지는 않습니다.`);
    }
  }
  return questions.slice(-3);
}

/** SajuResult → 대운×세운×월운 결합 서사.
 *  now를 넘기면 대운 전환 임박을 그 시각으로 판정한다.
 *  생략 시 result.asOf(결과 계산 기준시각)를 써서 재현성을 보장한다. */
export function buildTimingNarrative(result: SajuResult, now?: Date): TimingNarrative {
  const refTime = now ?? (result.asOf ? new Date(result.asOf) : new Date());
  const current = result.daeun.find((d) => d.isCurrent) ?? null;
  const currentIdx = result.daeun.findIndex((d) => d.isCurrent);
  const next = currentIdx >= 0 ? result.daeun[currentIdx + 1] ?? null : null;

  const daeunInfo = current ? judgeGanJi(result, current.gan, current.ji) : null;
  const daeun = current && daeunInfo
    ? {
        age: current.age,
        ganJi: `${current.gan}${current.ji}`,
        ohaeng: current.ohaeng,
        jiOhaeng: daeunInfo.jiOhaeng ?? undefined,
        verdict: daeunInfo.verdict,
        ganVerdict: daeunInfo.ganAxis?.verdict,
        jiVerdict: daeunInfo.jiAxis?.verdict,
        line: `${current.age}세 무렵 ${koreanReading(current.gan, current.ji) || `${current.gan}${current.ji}`}(${current.gan}${current.ji}) 대운은 ${daeunInfo.label}(${daeunInfo.axisText}) — ${daeunInfo.line}.`,
      }
    : null;

  const nextInfo = next ? judgeGanJi(result, next.gan, next.ji) : null;
  const nextEntry = next && nextInfo
    ? {
        age: next.age,
        ganJi: `${next.gan}${next.ji}`,
        ohaeng: next.ohaeng,
        jiOhaeng: nextInfo.jiOhaeng ?? undefined,
        line: `${next.age}세 무렵 ${next.gan}${next.ji} 대운(${nextInfo.axisText}) 진입 — ${nextInfo.label} 판으로 전환됩니다.`,
      }
    : null;

  let sewoon: TimingNarrative['sewoon'] = null;
  if (result.seun.gan) {
    const seunJ = judgeGanJi(result, result.seun.gan, result.seun.ji);
    if (seunJ.ganOhaeng || seunJ.jiOhaeng) {
      const sipsin = determineSipsin(result.palja.dayGan, result.seun.gan) || null;
      const reading = koreanReading(result.seun.gan, result.seun.ji) || `${result.seun.gan}${result.seun.ji}`;
      const sipsinPart = sipsin ? ` 일간 대비 ${sipsin} 운,` : '';
      sewoon = {
        ganJi: `${result.seun.gan}${result.seun.ji}`,
        ohaeng: seunJ.ganOhaeng ?? ohaengOfGanJi(result.seun.gan, result.seun.ji),
        jiOhaeng: seunJ.jiOhaeng ?? undefined,
        sipsin,
        verdict: seunJ.verdict,
        ganVerdict: seunJ.ganAxis?.verdict,
        jiVerdict: seunJ.jiAxis?.verdict,
        line: `올해 ${reading}(${result.seun.gan}${result.seun.ji}) 세운은${sipsinPart} ${seunJ.label}(${seunJ.axisText}) — ${seunJ.line}.`,
      };
    }
  }

  let wolun: TimingNarrative['wolun'] = null;
  if (result.wolun?.gan) {
    const wolunJ = judgeGanJi(result, result.wolun.gan, result.wolun.ji);
    if (wolunJ.ganOhaeng || wolunJ.jiOhaeng) {
      const sipsin = determineSipsin(result.palja.dayGan, result.wolun.gan) || null;
      const reading = koreanReading(result.wolun.gan, result.wolun.ji) || `${result.wolun.gan}${result.wolun.ji}`;
      const sipsinPart = sipsin ? ` 일간 대비 ${sipsin} 운,` : '';

      // 세운×월운 교차 — 세운이 용신/기신일 때 월운이 같은 방향인지 엇갈리는지
      let cross: string | null = null;
      if (sewoon) {
        if (sewoon.verdict === wolunJ.verdict) {
          cross = '같은 방향';
        } else if (sewoon.verdict === 'neutral' || wolunJ.verdict === 'neutral') {
          cross = '세운 중립';
        } else if (sewoon.verdict === 'mixed' || wolunJ.verdict === 'mixed') {
          cross = '축 혼재';
        } else {
          cross = '엇갈림';
        }
      }
      const crossText =
        cross === '같은 방향'
          ? ' 세운과 같은 방향이라 이 달의 조율이 연운을 증폭합니다.'
          : cross === '엇갈림'
            ? ' 세운과 엇갈리는 방향이라 이 달의 조율이 연운을 누르거나 되돌립니다.'
            : cross === '축 혼재'
              ? ' 한쪽 운이 축이 갈리는 판이라 이 달의 조율은 부분적입니다.'
              : '';
      wolun = {
        ganJi: `${result.wolun.gan}${result.wolun.ji}`,
        ohaeng: wolunJ.ganOhaeng ?? ohaengOfGanJi(result.wolun.gan, result.wolun.ji),
        jiOhaeng: wolunJ.jiOhaeng ?? undefined,
        sipsin,
        verdict: wolunJ.verdict,
        ganVerdict: wolunJ.ganAxis?.verdict,
        jiVerdict: wolunJ.jiAxis?.verdict,
        line: `이번 달 월운 ${reading}(${result.wolun.gan}${result.wolun.ji})은${sipsinPart} ${wolunJ.label}(${wolunJ.axisText}) — ${wolunJ.line}.${crossText}`,
        cross,
      };
    }
  }

  // 대운 전환 임박 — 현재 대운 종료(endsAt)까지 남은 실제 기간으로 판정.
  // 전환 12개월 전부터 '다가오는 전환', 6개월 전부터 '임박'으로 서사를 세분한다.
  let transition: TimingNarrative['transition'] = null;
  if (current && next && current.endsAt != null) {
    const monthsLeft = (current.endsAt - refTime.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
    if (monthsLeft <= 12 && monthsLeft > 0) {
      const nextInfo2 = judgeGanJi(result, next.gan, next.ji);
      const direction =
        nextInfo2.verdict === 'fit'
          ? '용신 방향으로 열리는'
          : nextInfo2.verdict === 'tension'
            ? '기신 방향으로 무거워지는'
            : nextInfo2.verdict === 'mixed'
              ? '용신·기신이 엇갈리는'
              : '중간 오행으로 바뀌는';
      const phase = monthsLeft <= 6 ? '임박' : '다가오는';
      const monthText = monthsLeft <= 1 ? '한 달 안쪽' : `약 ${Math.round(monthsLeft)}개월`;
      transition = {
        imminent: monthsLeft <= 6,
        line: `대운 ${phase} 전환기입니다 — ${current.gan}${current.ji} 대운이 ${monthText} 후 ${next.gan}${next.ji} 대운(${nextInfo2.axisText})으로 바뀝니다. 판이 ${direction} 구간으로 읽히므로, 큰 결정은 다음 대운의 해석과 현실 조건을 함께 검토합니다. `,
      };
    }
  }

  const checkQuestions = buildCheckQuestions(result);

  const sewoonDesc =
    sewoon?.verdict === 'fit'
      ? '도움 가능성'
      : sewoon?.verdict === 'tension'
        ? '점검 필요성'
        : sewoon?.verdict === 'mixed'
          ? '축이 엇갈리는'
          : '중립적인';
  const combined =
    daeun && sewoon
      ? `큰 판(${daeun.ganJi} 대운, ${daeunInfo?.label}) 위에서 올해(${sewoon.ganJi})는 ${sewoonDesc} 구간으로 참고할 수 있습니다 — 대운의 방향과 세운의 관계를 함께 살핍니다.`
      : null;

  // 대운 전체 흐름 — 8단계 각각의 서사를 생성한다
  const daeunFlow = result.daeun.map((d) => {
    const info = judgeGanJi(result, d.gan, d.ji);
    const reading = koreanReading(d.gan, d.ji) || `${d.gan}${d.ji}`;
    const currentMark = d.isCurrent ? ' ← 현재' : '';
    return {
      age: d.age,
      ganJi: `${d.gan}${d.ji}`,
      ohaeng: d.ohaeng,
      jiOhaeng: info.jiOhaeng ?? undefined,
      verdict: info.verdict,
      ganVerdict: info.ganAxis?.verdict,
      jiVerdict: info.jiAxis?.verdict,
      line: `${d.age}세 ${reading}(${d.gan}${d.ji}) 대운 — ${info.label}(${info.axisText}): ${info.line}${currentMark}`,
      isCurrent: d.isCurrent,
    };
  });

  const lines = [daeun?.line, sewoon?.line, wolun?.line, transition?.line, nextEntry?.line, combined].filter(
    (s): s is string => typeof s === 'string',
  );

  return { daeun, next: nextEntry, sewoon, wolun, transition, checkQuestions, combined, daeunFlow, lines };
}
