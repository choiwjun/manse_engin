// 택일 해석 계층 — 일진 계산(CalendarDay)을 소비해 상담 등급의 날짜 해석을 만든다.
// 사주·궁합·작명 해석 계층과 같은 품질 규칙: 근거는 1층 facts(십이직·길흉·택일),
// 문장은 날짜를 단정하지 않는 운영 가이드 톤.

import type { CalendarDay } from '@/engine/types';
import { josa } from './sentence';
import { getContentEntry } from './content';

export interface TaekilLine {
  /** 해석 축 라벨 ('십이직', '길흉', '택일 적합', '오행') */
  label: string;
  text: string;
}

export interface TaekilInterpretation {
  /** '{날짜} {간지} — {길흉}일 ({십이직})' */
  headline: string;
  /** 날짜 구조 해석 — 십이직·길흉·택일·오행 */
  lines: TaekilLine[];
  /** 이 날에 잘 맞는 일 */
  suited: string[];
  /** 이 날에 피할 일 */
  avoid: string[];
  /** 운영 가이드 */
  guidance: string[];
}

/** 십이직별 상세 해석 — 택일 정보를 운영 가이드로 확장 */
const SINSAL_DETAIL: Record<string, { suited: string[]; avoid: string[]; note: string }> = {
  '건일': {
    suited: ['사업 시작 검토', '취직·입사 일정 검토', '이사·입주 검토', '새 프로젝트 착수 검토'],
    avoid: ['소송·분쟁', '투자의 최종 확정은 조건 확인'],
    note: '새로운 일을 세우는 기운으로 해석하는 날입니다. 시작·착수·출발은 자원·일정·위험을 함께 확인합니다.',
  },
  '제일': {
    suited: ['청소·정리 검토', '치료·수술은 의료진과 상의', '제사·천도 검토', '빚 갚기 일정 검토'],
    avoid: ['개업·혼인', '새 계약 체결은 조건 확인'],
    note: '비우고 제거하는 기운으로 해석하는 날입니다. 정리 일정은 현실 조건과 관련 전문가의 판단을 함께 확인합니다.',
  },
  '만일': {
    suited: ['혼인·약혼 검토', '개업·창업 검토', '건축·상량 검토', '축하·잔치 일정 검토'],
    avoid: ['장례·수의', '소송'],
    note: '가득 차는 기운으로 해석하는 날입니다. 결실·성사 일정은 조건·준비도·당사자의 의사를 함께 확인합니다.',
  },
  '평일': {
    suited: ['평범한 일상', '작은 약속', '정기 점검'],
    avoid: ['큰 결정은 조건 검토', '새 사업 시작은 자원·위험 확인'],
    note: '평탄한 날로 해석하는 날입니다. 일상·유지·점검 일정은 현실 조건과 함께 검토합니다.',
  },
  '정일': {
    suited: ['계약·협상 검토', '약속·협의', '문서 확정 검토'],
    avoid: ['이사·여행', '큰 지출은 조건 확인'],
    note: '정하고 고정하는 기운으로 해석하는 날입니다. 약속·계약·협의는 조건·문서·당사자의 의사를 함께 확인합니다.',
  },
  '집일': {
    suited: ['수리·보수 검토', '정리·재고', '회수·수금 일정 검토'],
    avoid: ['새 투자는 조건 확인', '개업은 준비도 확인'],
    note: '잡고 고치는 기운으로 해석하는 날입니다. 수리·정리·회수 일정은 현실 조건과 함께 검토합니다.',
  },
  '파일': {
    suited: ['소송·분쟁 대응 검토', '철거·해체 검토'],
    avoid: ['건축·이사', '혼인·개업', '새 계약은 조건 확인'],
    note: '깨지고 파하는 기운으로 해석하는 날입니다. 세우는 일과 허무는 일의 일정은 현실 조건과 전문가 판단을 함께 확인합니다.',
  },
  '위일': {
    suited: ['점검·보완', '조심스러운 유지'],
    avoid: ['큰일·도박', '개업·혼인', '장거리 여행은 안전·비용 확인'],
    note: '위태로운 기운으로 해석하는 날입니다. 큰 일정은 안전·비용·대안과 당사자의 상황을 함께 점검합니다.',
  },
  '성일': {
    suited: ['무역·거래 검토', '계약·매매 검토', '건축·이전 검토'],
    avoid: ['소송', '허무는 일'],
    note: '이루고 성사시키는 기운으로 해석하는 날입니다. 거래·계약·성사 일정은 조건·문서·당사자의 의사를 함께 확인합니다.',
  },
  '수일': {
    suited: ['수확·정리', '마무리·결산', '회수·수금 일정 검토'],
    avoid: ['새 시작은 준비도 확인', '투자 확정은 조건 확인'],
    note: '거두고 수습하는 기운으로 해석하는 날입니다. 마무리·정리·수확 일정은 현실 조건과 함께 검토합니다.',
  },
  '개일': {
    suited: ['개업·오픈 검토', '이사·입주 검토', '치료 일정은 전문가와 상의'],
    avoid: ['폐업·해산', '장례'],
    note: '열고 시작하는 기운으로 해석하는 날입니다. 개업·이사·치료 일정은 현실 조건과 전문가 판단을 함께 확인합니다.',
  },
  '폐일': {
    suited: ['휴식·정지', '폐업·해산 검토'],
    avoid: ['개업·이사', '혼인·계약', '새 프로젝트는 조건 확인'],
    note: '닫고 멈추는 기운으로 해석하는 날입니다. 큰 일정은 날짜 외의 조건·위험·당사자 상황을 함께 검토합니다.',
  },
};

/** 십이직 한글 → content DB 키 접미어 (로마자 파일명) */
const SINSAL_KEY: Record<string, string> = {
  '건일': 'geonil', '제일': 'jeil', '만일': 'manil', '평일': 'pyeongil',
  '정일': 'jeongil', '집일': 'jipil', '파일': 'pail', '위일': 'wiil',
  '성일': 'seongil', '수일': 'suil', '개일': 'gaeil', '폐일': 'pyeil',
};

/** 십이직 해석 — content DB(taekil/sinsal12/*) 우선, 없으면 코드 fallback */
function sinsalDetail(sinsal12: string): { suited: string[]; avoid: string[]; note: string } {
  const key = SINSAL_KEY[sinsal12];
  const entry = key ? getContentEntry(`taekil/sinsal12/${key}`) : null;
  const body = entry?.body as Record<string, unknown> | undefined;
  const fallback = SINSAL_DETAIL[sinsal12] ?? { suited: [], avoid: [], note: '' };
  if (body) {
    return {
      suited: Array.isArray(body.suited) ? (body.suited as string[]) : fallback.suited,
      avoid: Array.isArray(body.avoid) ? (body.avoid as string[]) : fallback.avoid,
      note: typeof body.note === 'string' ? body.note : fallback.note,
    };
  }
  return fallback;
}

/** 단일 날짜 해석 */
export function interpretTaekil(day: CalendarDay): TaekilInterpretation {
  const detail = sinsalDetail(day.sinsal12);
  const lines: TaekilLine[] = [];
  const guidance: string[] = [];

  // 십이직·길흉
  lines.push({
    label: '십이직',
    text: `${day.sinsal12}(${day.gilhyung}일) — ${detail.note}`,
  });

  // 택일 적합
  if (day.taekil) {
    lines.push({ label: '택일', text: `전통 택일: ${day.taekil}` });
  }

  // 오행
  lines.push({
    label: '일진 오행',
    text: `${day.dayGanJi}(${day.ohaeng}) — 일간 ${day.dayGan}의 ${day.ohaeng} 기운이 일지 ${day.dayJi}${josa(day.dayJi, '을를')} 타는 날입니다.`,
  });

  // 절기
  if (day.jieqi) {
    lines.push({ label: '절기', text: `${day.jieqi} — 절기가 바뀌는 날이라 기운의 전환으로 해석합니다. 중요한 일은 절기 해석만으로 정하지 않고 실제 일정·준비도·당사자의 상황을 함께 검토합니다.` });
  }

  // 운영 가이드
  if (day.gilhyung === '길') {
    guidance.push('길일로 분류되는 날입니다. 적합 목록은 전통 택일의 참고 신호로 보고, 실제 일정은 안전·비용·당사자의 준비도와 함께 판단합니다.');
  } else if (day.gilhyung === '흉') {
    guidance.push('흉일로 분류되는 날입니다. 큰 결정·시작·결합은 날짜 해석만으로 정하지 말고, 일정 조정 가능성·위험·당사자의 상황을 함께 검토합니다.');
  } else {
    guidance.push('평일로 분류되는 날입니다. 길흉 해석은 참고 신호로 보고, 일상·유지·점검 일정은 현실 조건과 함께 판단합니다.');
  }
  if (detail.suited.length > 0) {
    guidance.push(`이 날에 맞는 일: ${detail.suited.join('·')}`);
  }
  if (detail.avoid.length > 0) {
    guidance.push(`이 날에 피할 일: ${detail.avoid.join('·')}`);
  }

  const headline = `${day.solarDate} ${day.dayGanJi} — ${day.gilhyung}일 (${day.sinsal12})`;

  return {
    headline,
    lines,
    suited: detail.suited,
    avoid: detail.avoid,
    guidance,
  };
}
