// 궁합 해석 계층 — 궁합 계산(CompatibilityResult) + 두 명식(SajuResult)을 소비해
// 상담 등급의 관계 해석을 만든다. 사주 해석 계층과 같은 품질 규칙: 근거는 1층 facts,
// 문장은 상대를 판단하지 않는 운영 가이드 톤.

import type { SajuResult } from '@/engine/types';
import type { CompatibilityResult } from '@/engine/compatibility/types';
import { determineSipsin } from '@/engine/saju/sipsin';
import { getOhaengForGan, getKoreanForGan } from '@/engine/adapter/hanja-mapper';
import { isChildOf, isSanggeukOf } from './sipsin-groups';
import { josa } from './sentence';
import { measureOhaeng } from './meter';

export interface CompatibilityLine {
  /** 관계 축 라벨 ('일간 십신', '배우자궁', '오행 보완', '강약 대비') */
  label: string;
  text: string;
}

export interface CompatibilityInterpretation {
  /** '{등급}등급 {점수}점 — {구조 요약}' */
  headline: string;
  /** 관계 구조 해석 — 십신·방향·궁·강약·오행 */
  lines: CompatibilityLine[];
  /** 잘 되는 축 */
  strengths: string[];
  /** 주의 축 */
  frictions: string[];
  /** 운영 가이드 — 마찰 축에 대응하는 행동 규칙 */
  guidance: string[];
}

export interface InterpretCompatibilityOptions {
  /** 문서에 쓸 두 사람 표기 (기본 'A'·'B') */
  nameA?: string;
  nameB?: string;
}

/** 상대를 A의 십신으로 볼 때의 관계 성향 (10십신) */
const SIPSIN_VIEW: Record<string, string> = {
  비견: '동등한 동반자 — 같은 언어를 쓰고 서로를 바로 이해하는 관계',
  겁재: '경쟁하며 성장하는 친구 — 경쟁이 건강할 때는 시너지, 어긋날 때는 각축이 되는 관계',
  식신: '돌보고 기뻐하는 대상 — 한쪽이 아끼며 키워주는 흐름이 자연스러운 관계',
  상관: '재기는 뚜렷하나 예측이 어려운 대상 — 말과 행동에 반응이 크게 오가는 관계',
  편재: '현실적으로 끌리는 파트너 — 활동적이고 거래·교류가 많은 관계',
  정재: '안정적인 생활 동반자 — 일상 운영과 실속이 잘 맞는 관계',
  편관: '긴장감을 주는 강한 상대 — 눌리지 않으려 애쓰는 만큼 성장도 큰 관계',
  정관: '반듯하고 믿을 수 있는 상대 — 상대의 기준을 신뢰하게 되는 관계',
  편인: '직관적으로 통하는 상대 — 설명 없이 이해되는 부분이 있는 관계',
  정인: '의지하고 배우는 상대 — 기대며 안정을 얻는 흐름이 생기는 관계',
};

function directionLine(a: SajuResult, b: SajuResult, nameA: string, nameB: string): string | null {
  const aOhaeng = getOhaengForGan(a.palja.dayGan);
  const bOhaeng = getOhaengForGan(b.palja.dayGan);
  if (!aOhaeng || !bOhaeng) return null;
  const aKor = getKoreanForGan(a.palja.dayGan) ?? a.palja.dayGan;
  const bKor = getKoreanForGan(b.palja.dayGan) ?? b.palja.dayGan;
  if (aOhaeng === bOhaeng) {
    return `${nameA}와(과) ${nameB}는 같은 ${aOhaeng} 일간 — 비슷한 속도와 취향이라 편하지만, 서로의 빈 곳을 채워주지는 못합니다.`;
  }
  if (isChildOf(aOhaeng, bOhaeng)) {
    return `${nameA}(${aKor})${josa(nameA, '이가')} ${nameB}(${bKor})${josa(nameB, '을를')} 생하는 방향 — ${nameA}가 주고 ${nameB}가 충전받는 흐름이 기본값입니다.`;
  }
  if (isChildOf(bOhaeng, aOhaeng)) {
    return `${nameB}(${bKor})${josa(nameB, '이가')} ${nameA}(${aKor})${josa(nameA, '을를')} 생하는 방향 — ${nameB}가 주고 ${nameA}가 충전받는 흐름이 기본값입니다.`;
  }
  if (isSanggeukOf(aOhaeng, bOhaeng)) {
    return `${nameA}(${aKor})${josa(nameA, '이가')} ${nameB}(${bKor})${josa(nameB, '을를')} 극하는 방향 — 다듬고 통제하려는 흐름이 깔려 있어, 요청 방식을 부드럽게 두는 것이 마찰을 줄입니다.`;
  }
  if (isSanggeukOf(bOhaeng, aOhaeng)) {
    return `${nameB}(${bKor})${josa(nameB, '이가')} ${nameA}(${aKor})${josa(nameA, '을를')} 극하는 방향 — ${nameB}의 기준이 ${nameA}를 압박하는 흐름이 깔려 있어, ${nameA}의 의사 표현을 존중하는 약속이 필요합니다.`;
  }
  return null;
}

function meterPairText(a: SajuResult, b: SajuResult, nameA: string, nameB: string): { text: string; friction: string | null } | null {
  const ma = measureOhaeng(a).dayMaster;
  const mb = measureOhaeng(b).dayMaster;
  if (ma.verdict === 'strong' && mb.verdict === 'weak') {
    return { text: `${nameA} 신강 × ${nameB} 신약 — ${nameA}의 두터운 축이 ${nameB}의 빈 곳을 받쳐주는 보완 구조입니다.`, friction: null };
  }
  if (ma.verdict === 'weak' && mb.verdict === 'strong') {
    return { text: `${nameA} 신약 × ${nameB} 신강 — ${nameB}의 두터운 축이 ${nameA}의 빈 곳을 받쳐주는 보완 구조입니다.`, friction: null };
  }
  if (ma.verdict === 'weak' && mb.verdict === 'weak') {
    return {
      text: `${nameA}·${nameB} 모두 신약 — 서로 기대는 만큼 소모가 되기 쉬운 구조입니다.`,
      friction: '둘 다 소모되는 결정은 회복을 먼저 하고 내리는 규칙을 정해두세요.',
    };
  }
  if (ma.verdict === 'strong' && mb.verdict === 'strong') {
    return {
      text: `${nameA}·${nameB} 모두 신강 — 주도권 경쟁이 생기기 쉬운 구조입니다.`,
      friction: '결정권을 영역별로 나눠 각자의 구역에서만 주도하는 게 안전판입니다.',
    };
  }
  if (ma.verdict === 'balanced' && mb.verdict === 'balanced') {
    return { text: `${nameA}·${nameB} 모두 중화에 가까워, 관계의 등락이 시점(대운·세운)보다 환경에 따라 움직입니다.`, friction: null };
  }
  return null;
}

function wonjinCross(a: SajuResult, b: SajuResult): boolean {
  const PAIRS = new Set(['子未', '未子', '丑午', '午丑', '寅酉', '酉寅', '卯申', '申卯', '辰亥', '亥辰', '巳戌', '戌巳']);
  return PAIRS.has(`${a.palja.dayJi}${b.palja.dayJi}`);
}

/** 두 명식 + 궁합 계산 결과 → 상담 등급 궁합 해석 */
export function interpretCompatibility(
  a: SajuResult,
  b: SajuResult,
  compat: CompatibilityResult,
  opts: InterpretCompatibilityOptions = {},
): CompatibilityInterpretation {
  const nameA = opts.nameA ?? 'A';
  const nameB = opts.nameB ?? 'B';
  const lines: CompatibilityLine[] = [];
  const strengths: string[] = [];
  const frictions: string[] = [];
  const guidance: string[] = [];

  // 1) 일간 십신 — 서로가 서로를 어떤 상대로 인식하는지
  const sipsinAB = determineSipsin(a.palja.dayGan, b.palja.dayGan);
  const sipsinBA = determineSipsin(b.palja.dayGan, a.palja.dayGan);
  if (sipsinAB && sipsinBA) {
    const viewAB = SIPSIN_VIEW[sipsinAB] ?? '독특한 각도에서 서로를 이해하는 관계';
    const viewBA = SIPSIN_VIEW[sipsinBA] ?? '독특한 각도에서 서로를 이해하는 관계';
    lines.push({
      label: '일간 십신',
      text: `${nameA} 눈에 ${nameB}${josa(nameB, '은는')} ${sipsinAB} — ${viewAB}입니다. 반대로 ${nameB} 눈에 ${nameA}${josa(nameA, '은는')} ${sipsinBA} — ${viewBA}입니다.`,
    });
  }

  // 2) 일간 오행 방향 (생·극)
  const direction = directionLine(a, b, nameA, nameB);
  if (direction) lines.push({ label: '일간 방향', text: direction });

  // 3) 배우자궁(일지) 관계
  const dayJiType = compat.dayJiRelation.type;
  if (dayJiType.includes('합')) {
    lines.push({ label: '배우자궁', text: `일지가 ${dayJiType} — 함께 있는 시간이 자연스럽고 감정 교류가 깊은 결속형입니다. (${compat.dayJiRelation.description})` });
    strengths.push(`배우자궁 ${dayJiType} — 일상 공유에 강한 구조`);
  } else if (dayJiType.includes('충')) {
    lines.push({ label: '배우자궁', text: `일지가 ${dayJiType} — 함께 사는 일상에 재정비 주기가 옵니다. 공간·역할의 경계가 완충 역할을 합니다. (${compat.dayJiRelation.description})` });
    frictions.push('배우자궁 충 — 가사·일정·공간의 재정비 주기를 미리 인정해두기');
  } else if (dayJiType.includes('형') || dayJiType.includes('해')) {
    lines.push({ label: '배우자궁', text: `일지가 ${dayJiType} — 사소한 약속을 지키는 일이 관계 비용을 좌우합니다. (${compat.dayJiRelation.description})` });
    frictions.push(`배우자궁 ${dayJiType} — 약속·절차의 문서화가 관계 방어가 됨`);
  } else {
    lines.push({ label: '배우자궁', text: `일지 관계는 ${dayJiType} — 극단적 결속이나 충돌보다 병행·조율형입니다. (${compat.dayJiRelation.description})` });
  }

  // 4) 강약 대비
  const meterPair = meterPairText(a, b, nameA, nameB);
  if (meterPair) {
    lines.push({ label: '강약 대비', text: meterPair.text });
    if (meterPair.friction) {
      frictions.push(meterPair.friction);
      if (meterPair.text.includes('보완 구조')) strengths.push('강약 보완 — 서로의 빈 곳이 상대의 두터운 곳');
    } else if (meterPair.text.includes('보완')) {
      strengths.push('강약 보완 — 서로의 빈 곳이 상대의 두터운 곳');
    }
  }

  // 5) 오행 보완
  const ohaengScore = compat.ohaengComplement.score;
  if (ohaengScore >= 20) {
    lines.push({ label: '오행 보완', text: `두 명식을 합쳤을 때 오행 분포가 고르게 닫혀(${ohaengScore}/25) 서로의 빈 오행을 채워주는 구조입니다.` });
    strengths.push(`오행 보완 ${ohaengScore}/25 — 합쳤을 때 밸런스가 완성됨`);
  } else if (ohaengScore < 10) {
    lines.push({ label: '오행 보완', text: `두 명식이 비슷한 오행에 치우쳐(${ohaengScore}/25) 같은 영역이 함께 얇습니다. 부족한 오행은 사람·활동으로 함께 채우는 과제입니다.` });
    frictions.push(`오행 편중 동조화(${ohaengScore}/25) — 같은 쪽으로 함께 기울기 쉬움`);
  } else {
    lines.push({ label: '오행 보완', text: `오행 보완은 보통 수준(${ohaengScore}/25) — 상호 보완보다 병행 관계에 가깝습니다.` });
  }

  // 6) 일지 원진 교차
  if (wonjinCross(a, b)) {
    frictions.push('일지 원진 — 가까울수록 은근한 소모가 생기니 소통 주기를 정해두기');
  }

  // 7) 운영 가이드 — 마찰 축에 대응
  if (compat.dayGanRelation.type.includes('합') && compat.dayJiRelation.type.includes('충')) {
    guidance.push('일간 합(끌림)과 일지 충(마찰)이 공존하는 구조 — 관계가 좋을 때의 기준·약속을 남겨두면 충 구간의 방어가 됩니다.');
  }
  if (sipsinAB === '편관' || sipsinAB === '정관' || sipsinBA === '편관' || sipsinBA === '정관') {
    guidance.push('상대가 관성으로 보이는 방향이 한쪽에 있으면, 통제가 아니라 요청의 형식으로 말하는 것이 마찰을 줄입니다.');
  }
  if (compat.ohaengComplement.score >= 20) {
    guidance.push('서로의 빈 오행을 채워주는 구조이므로, 함께하는 활동(여행·운동·취미)에 상대의 강 오행 방향을 심으면 관계 소모가 줄어듭니다.');
  }
  if (guidance.length === 0) {
    guidance.push('서로가 서로를 어떤 십신으로 보는지 인지하고 쓰기만 해도 마찰 비용이 줄어듭니다 — 합이 좋을 때의 조건을 기록해두세요.');
  }

  // 8) 헤드라인
  const ganSummary = compat.dayGanRelation.type.includes('합')
    ? '일간 결합'
    : compat.dayGanRelation.type.includes('충')
      ? '일간 충돌'
      : '일간 병행';
  const jiSummary = compat.dayJiRelation.type.includes('합')
    ? '배우자궁 결속'
    : compat.dayJiRelation.type.includes('충')
      ? '배우자궁 재정비'
      : '배우자궁 병행';
  const headline = `${compat.grade}등급 ${compat.totalScore}점 — ${ganSummary} × ${jiSummary} 궁합`;

  return { headline, lines, strengths, frictions, guidance };
}
