import type { TojeongResult } from '@/engine/types';

export interface TojeongLine { label: string; text: string }
export interface TojeongInterpretationReport {
  headline: string;
  contentStatus: 'unverified';
  lines: TojeongLine[];
  cautions: string[];
  guidance: string[];
  basisRefs: string[];
}

/** 계산 사실에 한정한 풀이. 판본 대조 전에는 보관 중인 144괘 문구를 소비하지 않는다. */
export function interpretTojeong(result: TojeongResult): TojeongInterpretationReport {
  const c = result.calculation;
  if (!c || c.policyId !== 'tojeong-8x6x3-regular-clamp-v2') {
    throw new Error('토정비결 계산 기준을 확인할 수 없습니다. 새 기준으로 다시 계산하세요.');
  }
  const g = result.gwae;
  const b = c.lunarBirth;
  const lines: TojeongLine[] = [
    { label: '개인별 입력', text: `음력 ${b.year}년 ${b.isLeapMonth ? '윤' : ''}${b.month}월 ${b.day}일 출생 · 대상 ${result.targetYear}년 · 세는나이 ${c.koreanAge}세입니다. 이 결과를 같은 띠 전체의 운세로 일반화하지 않습니다.` },
    { label: '상괘', text: `세는나이 ${c.koreanAge} + 태세수 ${c.taeseSu} = ${c.koreanAge + c.taeseSu}, 8로 나눈 나머지로 상괘 ${g.sangGwae}을 구합니다(나머지 0은 8).` },
    { label: '중괘', text: `대상 연도 생월 ${c.monthDays}일 + 월건수 ${c.wolgeonSu} = ${c.monthDays + c.wolgeonSu}, 6으로 나눈 나머지로 중괘 ${g.jungGwae}을 구합니다(나머지 0은 6).` },
    { label: '하괘', text: `적용 생일 ${c.effectiveDay}일 + 일진수 ${c.iljinSu} = ${c.effectiveDay + c.iljinSu}, 3으로 나눈 나머지로 하괘 ${g.haGwae}을 구합니다(나머지 0은 3).` },
    { label: '계산 정책', text: `윤달 기준: ${c.leapMonthPolicy === 'reject' ? '윤달 출생 계산 거부' : '같은 월의 평달로 환산'}. 대상 월에 30일이 없으면 29일을 적용합니다. 윤달·말일 처리는 서비스가 채택한 정책입니다.` },
    { label: '해설 상태', text: '144괘 원문·판본 대응이 미검증 상태입니다. 연간·월별 길흉 해설은 제공하지 않으며, 괘 숫자만으로 좋고 나쁨을 판단하지 않습니다.' },
  ];
  const cautions = ['개인별 계산 근거를 설명하는 자료이며 운세 해설의 검증 완료를 뜻하지 않습니다.'];
  if (c.leapMonthAdjusted) cautions.push(`윤${b.month}월 출생을 평${b.month}월로 환산했습니다.`);
  if (c.dayAdjusted) cautions.push(`대상 생월이 ${c.monthDays}일까지 있어 생일 ${b.day}일 대신 ${c.effectiveDay}일로 계산했습니다.`);
  return {
    headline: `${result.targetYear}년 토정비결 — ${g.gwaeCode}괘 (상 ${g.sangGwae} · 중 ${g.jungGwae} · 하 ${g.haGwae})`,
    contentStatus: 'unverified', lines, cautions,
    guidance: ['음력 생일과 대상 연도, 윤달·말일 적용 내역을 확인하세요. 검증된 원문 해설이 확보되기 전에는 계산 근거로만 참고하세요.'],
    basisRefs: [c.policyId, `tojeong:year:${result.targetYear}:gwae:${g.gwaeCode}`, c.source],
  };
}
