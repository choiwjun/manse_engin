// @TASK P4-R3-T1 - 역학달력/일진 엔진
// @SPEC docs/planning/02-trd.md#역학달력-일진

import type { CalendarDay, MonthlyCalendar, Ohaeng } from '@/engine/types';
import { ManseryeokEngine } from '@/engine/core/manseryeok-engine';

// ManseryeokEngine을 통해 간지/절기/음양력 변환을 수행

// ---------------------------------------------------------------------------
// 상수 정의
// ---------------------------------------------------------------------------

/** 지지(地支) 12지 한글 순서 (인덱스 0=자 ~ 11=해) */
const JIJI_KOREAN = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'] as const;

/** 천간(天干) 한자→한글 매핑 */
const GAN_HANJA_TO_KOREAN: Record<string, string> = {
  '甲': '갑', '乙': '을', '丙': '병', '丁': '정', '戊': '무',
  '己': '기', '庚': '경', '辛': '신', '壬': '임', '癸': '계',
};

/** 지지(地支) 한자→한글 매핑 */
const JI_HANJA_TO_KOREAN: Record<string, string> = {
  '子': '자', '丑': '축', '寅': '인', '卯': '묘', '辰': '진', '巳': '사',
  '午': '오', '未': '미', '申': '신', '酉': '유', '戌': '술', '亥': '해',
};

/**
 * 십이직(十二直, 건제십이신) 순서 — 월건 지지부터 순서대로 배정.
 * 표준 명칭: 建·除·滿·平·定·執·破·危·成·收·開·閉
 * (민간 만세력에서 흔히 '12신살'로 불리지만 정식 명칭은 십이직이다)
 */
const SINSAL_12_ORDER = [
  '건일', '제일', '만일', '평일', '정일', '집일',
  '파일', '위일', '성일', '수일', '개일', '폐일',
] as const;

/** 길일 */
const GIL_SINSAL = new Set(['건일', '만일', '성일', '개일']);

/** 흉일 */
const HYUNG_SINSAL = new Set(['파일', '위일', '폐일']);

/** 천간 한글→오행 매핑 */
const GAN_OHAENG_MAP: Record<string, Ohaeng> = {
  '갑': '목', '을': '목',
  '병': '화', '정': '화',
  '무': '토', '기': '토',
  '경': '금', '신': '금',
  '임': '수', '계': '수',
};

/** 십이직별 택일 정보 */
const TAEKIL_MAP: Record<string, string> = {
  '건일': '사업 시작, 취직, 이사에 좋음',
  '제일': '청소, 치료, 제사에 적합',
  '만일': '혼인, 개업, 건축에 좋음',
  '평일': '평범한 날, 작은 일에 무난',
  '정일': '계약, 약속, 협의에 적합',
  '집일': '수리, 보수, 정리에 적합',
  '파일': '소송에 좋으나 건축/이사에 나쁨',
  '위일': '조심해야 할 날, 큰일 피할 것',
  '성일': '무역, 계약, 건축에 좋음',
  '수일': '수확, 정리, 마무리에 적합',
  '개일': '개업, 이사, 치료에 좋음',
  '폐일': '모든 일 불리, 특히 개업/이사 나쁨',
};

// JIEQI_KOREAN_MAP removed (unused, ManseryeokEngine.normalizeSolarTermName handles this mapping)

// ---------------------------------------------------------------------------
// 유틸리티
// ---------------------------------------------------------------------------

/**
 * 지지 한글을 JIJI_KOREAN 배열의 인덱스로 변환한다.
 */
function jiToIndex(ji: string): number {
  const idx = JIJI_KOREAN.indexOf(ji as typeof JIJI_KOREAN[number]);
  if (idx === -1) {
    throw new Error(`유효하지 않은 지지: ${ji}`);
  }
  return idx;
}

/**
 * 해당 월의 일수를 반환한다.
 */
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * 숫자를 2자리 0-패딩 문자열로 변환한다.
 */
function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

// ---------------------------------------------------------------------------
// 공개 함수
// ---------------------------------------------------------------------------

/**
 * 특정 날(양력)의 일진(日辰) 간지를 계산한다.
 *
 * ManseryeokEngine의 일주 계산을 이용하여
 * 한자를 한글로 변환하여 반환한다.
 *
 * @param year  양력 연도
 * @param month 양력 월 (1~12)
 * @param day   양력 일
 * @returns 일간(gan), 일지(ji), 간지 결합(ganJi)
 */
export function getDayGanJi(
  year: number,
  month: number,
  day: number
): { gan: string; ji: string; ganJi: string } {
  const dayPillar = ManseryeokEngine.getSolarDayPillar(year, month, day);
  const ganHanja = dayPillar.gan;
  const jiHanja = dayPillar.ji;

  const gan = GAN_HANJA_TO_KOREAN[ganHanja] ?? ganHanja;
  const ji = JI_HANJA_TO_KOREAN[jiHanja] ?? jiHanja;

  return { gan, ji, ganJi: `${gan}${ji}` };
}

/**
 * 월건(月建) 지지를 계산한다.
 *
 * 절기 기반으로 월지를 결정한다.
 * 절기 기반으로 월지를 결정하여 한글로 변환한다.
 *
 * @param year  양력 연도
 * @param month 양력 월 (1~12)
 * @param day   양력 일 (월 중간일 사용 권장, 절기 경계 판단용)
 * @returns 월지 한글 (예: '인', '묘')
 */
export function getMonthJi(year: number, month: number, day: number = 15): string {
  const monthZhiHanja = ManseryeokEngine.getLunarMonthGanJi(year, month, day).ji;
  return JI_HANJA_TO_KOREAN[monthZhiHanja] ?? monthZhiHanja;
}

/**
 * 십이직(十二直)을 계산한다.
 *
 * 월건(月建)의 지지를 기준으로 십이직을 순서대로 배정한다.
 * 월지가 '인'이면: 인=건일, 묘=제일, 진=만일, ...
 * 임의의 월지에서 시작하여 순환 배정한다.
 *
 * @param monthJi 월건 지지 (한글)
 * @param dayJi   일지 (한글)
 * @returns 십이직 이름
 */
export function getSinsal12(monthJi: string, dayJi: string): string {
  const monthIdx = jiToIndex(monthJi);
  const dayIdx = jiToIndex(dayJi);

  // 월지 인덱스부터 건일이 시작. 일지까지의 거리가 곧 십이직 인덱스
  const offset = (dayIdx - monthIdx + 12) % 12;
  return SINSAL_12_ORDER[offset];
}

/**
 * 십이직에 따른 길흉을 판단한다.
 *
 * - 길: 건일, 만일, 성일, 개일
 * - 흉: 파일, 위일, 폐일
 * - 평: 제일, 평일, 정일, 집일, 수일
 *
 * @param sinsal12 십이직 이름
 * @returns '길' | '흉' | '평'
 */
export function getGilhyung(sinsal12: string): '길' | '흉' | '평' {
  if (GIL_SINSAL.has(sinsal12)) return '길';
  if (HYUNG_SINSAL.has(sinsal12)) return '흉';
  return '평';
}

/**
 * 십이직에 따른 택일 정보를 반환한다.
 *
 * @param sinsal12 십이직 이름
 * @returns 택일 설명 문자열
 */
export function getTaekilInfo(sinsal12: string): string {
  return TAEKIL_MAP[sinsal12] ?? '';
}

/**
 * 일간(천간, 한글)의 오행을 반환한다.
 *
 * @param gan 천간 한글 (예: '갑', '을')
 * @returns 오행
 */
export function getGanOhaeng(gan: string): Ohaeng {
  const ohaeng = GAN_OHAENG_MAP[gan];
  if (!ohaeng) {
    throw new Error(`유효하지 않은 천간: ${gan}`);
  }
  return ohaeng;
}

/**
 * 특정 날(양력)의 전체 역학달력 정보를 생성한다.
 *
 * 일진, 음력 변환, 12신살, 길흉, 택일, 절기 정보를 모두 포함한다.
 *
 * @param year  양력 연도
 * @param month 양력 월 (1~12)
 * @param day   양력 일
 * @returns CalendarDay 객체
 */
export function getCalendarDay(year: number, month: number, day: number): CalendarDay {
  const context = ManseryeokEngine.getSolarContext({ year, month, day });

  // 일간지 (한자 → 한글)
  const ganHanja = context.ganji.day.gan;
  const jiHanja = context.ganji.day.ji;
  const dayGan = GAN_HANJA_TO_KOREAN[ganHanja] ?? ganHanja;
  const dayJi = JI_HANJA_TO_KOREAN[jiHanja] ?? jiHanja;
  const dayGanJi = `${dayGan}${dayJi}`;

  // 오행
  const ohaeng = getGanOhaeng(dayGan);

  // 음력 정보
  const lunarYear = context.lunar.year;
  const isLeapMonth = context.lunar.isLeapMonth;
  const absLunarMonth = context.lunar.month;
  const lunarDay = context.lunar.day;

  // 음력 날짜 문자열
  const lunarDate = `${lunarYear}-${pad2(absLunarMonth)}-${pad2(lunarDay)}`;

  // 월건 지지 (절기 기준)
  const monthZhiHanja = context.ganji.month.ji;
  const monthJi = JI_HANJA_TO_KOREAN[monthZhiHanja] ?? monthZhiHanja;

  // 12신살
  const sinsal12 = getSinsal12(monthJi, dayJi);

  // 길흉
  const gilhyung = getGilhyung(sinsal12);

  // 택일 정보
  const taekil = getTaekilInfo(sinsal12);

  // 절기
  const jieqi = context.exactSolarTerm;

  // 양력 날짜 문자열
  const solarDate = `${year}-${pad2(month)}-${pad2(day)}`;

  return {
    solarDate,
    lunarDate,
    lunarMonth: absLunarMonth,
    lunarDay,
    isLeapMonth,
    dayGan,
    dayJi,
    dayGanJi,
    ohaeng,
    sinsal12,
    gilhyung,
    taekil,
    ...(jieqi !== undefined ? { jieqi } : {}),
  };
}

/**
 * 월별 달력 데이터를 생성한다.
 *
 * 해당 월의 모든 날에 대한 CalendarDay 배열과 월간지 정보를 포함한다.
 *
 * @param year  양력 연도
 * @param month 양력 월 (1~12)
 * @returns MonthlyCalendar 객체
 */
export function getMonthlyCalendar(year: number, month: number): MonthlyCalendar {
  const totalDays = getDaysInMonth(year, month);
  const days: CalendarDay[] = [];

  for (let d = 1; d <= totalDays; d++) {
    days.push(getCalendarDay(year, month, d));
  }

  // 월간지: 월 중간 날짜(15일)의 월간지를 사용하여 절기 경계 이슈 회피
  const midDay = Math.min(15, totalDays);
  const monthPillar = ManseryeokEngine.getLunarMonthGanJi(year, month, midDay);
  const monthGanHanja = monthPillar.gan;
  const monthZhiHanja = monthPillar.ji;
  const monthGanKorean = GAN_HANJA_TO_KOREAN[monthGanHanja] ?? monthGanHanja;
  const monthZhiKorean = JI_HANJA_TO_KOREAN[monthZhiHanja] ?? monthZhiHanja;
  const monthGanJi = `${monthGanKorean}${monthZhiKorean}`;

  return {
    year,
    month,
    days,
    monthGanJi,
  };
}
