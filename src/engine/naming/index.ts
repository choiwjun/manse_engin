// @TASK P4-R1-T1 - 작명 분석 엔진
// @SPEC docs/planning/02-trd.md#작명-분석-엔진

import type {
  Ohaeng,
  NamingAnalysis,
  NamingResult,
  NamingAnalysisExtended,
  NamingResultExtended,
  StrokeSchool,
  Suri81Entry,
  TripleOhaengComparison,
} from '@/engine/types';
import { analyzeJawonOhaeng, getHanjaStrokes } from './jawon-ohaeng';
import { ManseryeokRangeError } from '@/engine/core/errors';

// ---------- 한글 자모 획수 데이터 (강희자전 기준 자모 획수) ----------

/** 초성(자음) 획수 - 유니코드 초성 인덱스 순서 (ㄱ~ㅎ, 19개) */
const CHOSEONG_STROKES: Record<number, number> = {
  0: 2,   // ㄱ
  1: 4,   // ㄲ
  2: 2,   // ㄴ
  3: 3,   // ㄷ
  4: 6,   // ㄸ
  5: 5,   // ㄹ
  6: 4,   // ㅁ
  7: 4,   // ㅂ
  8: 8,   // ㅃ
  9: 2,   // ㅅ
  10: 4,  // ㅆ
  11: 1,  // ㅇ
  12: 3,  // ㅈ
  13: 6,  // ㅉ
  14: 4,  // ㅊ
  15: 3,  // ㅋ
  16: 4,  // ㅌ
  17: 4,  // ㅍ
  18: 3,  // ㅎ
};

/** 중성(모음) 획수 - 유니코드 중성 인덱스 순서 (ㅏ~ㅣ, 21개) */
const JUNGSEONG_STROKES: Record<number, number> = {
  0: 2,   // ㅏ
  1: 3,   // ㅐ
  2: 3,   // ㅑ
  3: 4,   // ㅒ
  4: 2,   // ㅓ
  5: 3,   // ㅔ
  6: 3,   // ㅕ
  7: 4,   // ㅖ
  8: 2,   // ㅗ
  9: 4,   // ㅘ
  10: 5,  // ㅙ
  11: 3,  // ㅚ
  12: 3,  // ㅛ
  13: 2,  // ㅜ
  14: 4,  // ㅝ
  15: 5,  // ㅞ
  16: 3,  // ㅟ
  17: 3,  // ㅠ
  18: 1,  // ㅡ
  19: 2,  // ㅢ
  20: 1,  // ㅣ
};

/** 종성(받침) 획수 - 유니코드 종성 인덱스 순서 (없음=0, ㄱ~ㅎ, 28개) */
const JONGSEONG_STROKES: Record<number, number> = {
  0: 0,   // 없음
  1: 2,   // ㄱ
  2: 4,   // ㄲ
  3: 4,   // ㄳ (ㄱ2+ㅅ2)
  4: 2,   // ㄴ
  5: 5,   // ㄵ (ㄴ2+ㅈ3)
  6: 5,   // ㄶ (ㄴ2+ㅎ3)
  7: 3,   // ㄷ
  8: 5,   // ㄹ
  9: 7,   // ㄺ (ㄹ5+ㄱ2)
  10: 9,  // ㄻ (ㄹ5+ㅁ4)
  11: 9,  // ㄼ (ㄹ5+ㅂ4)
  12: 7,  // ㄽ (ㄹ5+ㅅ2)
  13: 9,  // ㄾ (ㄹ5+ㅌ4)
  14: 9,  // ㄿ (ㄹ5+ㅍ4)
  15: 8,  // ㅀ (ㄹ5+ㅎ3)
  16: 4,  // ㅁ
  17: 4,  // ㅂ
  18: 6,  // ㅄ (ㅂ4+ㅅ2)
  19: 2,  // ㅅ
  20: 4,  // ㅆ
  21: 1,  // ㅇ
  22: 3,  // ㅈ
  23: 4,  // ㅊ
  24: 3,  // ㅋ
  25: 4,  // ㅌ
  26: 4,  // ㅍ
  27: 3,  // ㅎ
};

// ---------- 초성 인덱스 -> 발음오행 매핑 ----------

/** 초성 인덱스 -> 발음오행 */
const CHOSEONG_OHAENG: Record<number, Ohaeng> = {
  0: '목',   // ㄱ
  1: '목',   // ㄲ
  2: '화',   // ㄴ
  3: '화',   // ㄷ
  4: '화',   // ㄸ
  5: '화',   // ㄹ
  6: '수',   // ㅁ
  7: '수',   // ㅂ
  8: '수',   // ㅃ
  9: '금',   // ㅅ
  10: '금',  // ㅆ
  11: '토',  // ㅇ
  12: '금',  // ㅈ
  13: '금',  // ㅉ
  14: '금',  // ㅊ
  15: '목',  // ㅋ
  16: '화',  // ㅌ
  17: '수',  // ㅍ
  18: '토',  // ㅎ
};

// ---------- 81수리 데이터 ----------

/** 길(吉)한 수 목록 */
const GIL_NUMBERS: ReadonlySet<number> = new Set([
  1, 3, 5, 6, 7, 8, 11, 13, 15, 16, 17, 18, 21, 23, 24, 25, 29, 31, 32, 33,
  35, 37, 39, 41, 45, 47, 48, 52, 57, 61, 63, 65, 67, 68, 81,
]);

/** 81수리 해설 */
const SURI81_DESCRIPTIONS: Record<number, string> = {
  1: '태초의 수. 만물의 시작으로 대길하다.',
  2: '분리의 수. 음유부단하여 불안정하다.',
  3: '번영의 수. 지혜와 복록이 따른다.',
  4: '파괴의 수. 고난과 좌절이 많다.',
  5: '건강의 수. 복록이 모이고 재물이 쌓인다.',
  6: '덕망의 수. 천덕을 받아 발전한다.',
  7: '강건의 수. 의지가 굳고 독립심이 강하다.',
  8: '발달의 수. 뜻을 이루고 번영한다.',
  9: '궁극의 수. 성공 직전에 실패하기 쉽다.',
  10: '공허의 수. 만사가 허무하고 불안정하다.',
  11: '신흥의 수. 가정이 융성하고 발전한다.',
  12: '박약의 수. 힘이 부족하여 뜻을 이루기 어렵다.',
  13: '지모의 수. 학문과 지혜로 출세한다.',
  14: '이산의 수. 가족과 이별하고 고독하다.',
  15: '통솔의 수. 덕망이 높아 사람을 이끈다.',
  16: '덕후의 수. 큰 인물이 되어 존경받는다.',
  17: '강장의 수. 권위와 힘으로 뜻을 이룬다.',
  18: '발전의 수. 지혜와 인내로 성공한다.',
  19: '고난의 수. 만사가 뜻대로 되지 않는다.',
  20: '허공의 수. 노력해도 성과가 적다.',
  21: '두령의 수. 큰 두목의 기운으로 성공한다.',
  22: '중절의 수. 도중에 좌절하기 쉽다.',
  23: '융창의 수. 창의력으로 크게 성공한다.',
  24: '입신의 수. 재물과 명예가 따른다.',
  25: '건실의 수. 실력으로 인정받고 성공한다.',
  26: '파란의 수. 변화가 심하여 불안정하다.',
  27: '중절의 수. 자기주장이 강해 충돌이 생긴다.',
  28: '파란의 수. 풍파가 많고 고독하다.',
  29: '성공의 수. 지혜와 능력으로 대성한다.',
  30: '부침의 수. 길흉이 반복되어 불안하다.',
  31: '융창의 수. 통솔력이 뛰어나 대업을 이룬다.',
  32: '요행의 수. 기회를 잡아 성공한다.',
  33: '승천의 수. 왕성한 기운으로 대성한다.',
  34: '파멸의 수. 재난과 고난이 많다.',
  35: '태평의 수. 평화롭고 안정된 삶이다.',
  36: '파란의 수. 의협심이 강하나 곤란이 따른다.',
  37: '인덕의 수. 사람의 도움으로 번영한다.',
  38: '학예의 수. 학문과 예술에 재능이 있으나 평범하다.',
  39: '부귀의 수. 부귀영화가 따른다.',
  40: '부침의 수. 지혜는 있으나 불안정하다.',
  41: '대업의 수. 큰 뜻을 이루고 번영한다.',
  42: '고행의 수. 재주는 많으나 실행이 어렵다.',
  43: '산재의 수. 성공과 실패가 반복된다.',
  44: '파멸의 수. 시작은 좋으나 끝이 좋지 않다.',
  45: '순풍의 수. 순조롭게 발전하고 번영한다.',
  46: '불우의 수. 기반이 약하여 고생한다.',
  47: '출세의 수. 뜻을 이루고 존경받는다.',
  48: '유덕의 수. 지도자의 자질이 있다.',
  49: '변전의 수. 길흉의 변화가 심하다.',
  50: '부침의 수. 반은 성공하고 반은 실패한다.',
  51: '성쇠의 수. 초년은 좋으나 말년이 불안하다.',
  52: '선견의 수. 지혜로 기회를 잡아 성공한다.',
  53: '내허의 수. 겉은 화려하나 속이 부실하다.',
  54: '곤궁의 수. 재난과 병이 따른다.',
  55: '미달의 수. 겉은 좋아 보이나 실속이 없다.',
  56: '한탄의 수. 뜻을 이루지 못하여 한탄한다.',
  57: '노력의 수. 꾸준한 노력으로 성공한다.',
  58: '후곤의 수. 초반에는 좋으나 후반에 어렵다.',
  59: '부족의 수. 의지가 약하여 실패하기 쉽다.',
  60: '암흑의 수. 앞길이 막혀 고생한다.',
  61: '영화의 수. 영예와 부귀가 따른다.',
  62: '쇠퇴의 수. 점점 쇠퇴하고 어려워진다.',
  63: '길상의 수. 만사가 순조롭고 행복하다.',
  64: '침체의 수. 불운이 계속된다.',
  65: '융창의 수. 가정이 화목하고 번영한다.',
  66: '실패의 수. 진퇴가 어렵고 고생한다.',
  67: '영달의 수. 목적을 달성하고 발전한다.',
  68: '발명의 수. 지혜로 새로운 길을 연다.',
  69: '동요의 수. 안정되지 못하고 흔들린다.',
  70: '공허의 수. 적막하고 쓸쓸하다.',
  71: '반길의 수. 반은 길하고 반은 흉하다.',
  72: '상반의 수. 전반은 길하나 후반은 흉하다.',
  73: '평범의 수. 평범하게 지내나 큰 발전은 없다.',
  74: '우매의 수. 지혜가 부족하여 실패한다.',
  75: '수성의 수. 지키면 길하고 진취하면 흉하다.',
  76: '이산의 수. 인연이 박하고 고독하다.',
  77: '전후의 수. 전반 길후반 흉 또는 그 반대이다.',
  78: '만성의 수. 초년은 좋으나 말년은 쓸쓸하다.',
  79: '궁핍의 수. 가난하고 고생이 많다.',
  80: '은퇴의 수. 물러나면 길하고 나서면 흉하다.',
  81: '환원의 수. 다시 1로 돌아가 대길하다.',
};

// ---------- 유틸리티 함수 ----------

/**
 * 한글 문자인지 확인한다.
 * 유니코드 범위: AC00(가) ~ D7A3(힣)
 */
function isHangulSyllable(char: string): boolean {
  const code = char.charCodeAt(0);
  return code >= 0xac00 && code <= 0xd7a3;
}

/**
 * 한글 글자를 초성/중성/종성 인덱스로 분해한다.
 */
function decomposeHangul(char: string): { cho: number; jung: number; jong: number } | null {
  if (!isHangulSyllable(char)) return null;

  const code = char.charCodeAt(0) - 0xac00;
  const cho = Math.floor(code / (21 * 28));
  const jung = Math.floor((code % (21 * 28)) / 28);
  const jong = code % 28;

  return { cho, jung, jong };
}

// ---------- 공개 함수 ----------

/**
 * 한 글자의 획수를 계산한다.
 * 한글 자모 획수 기반: 초성 + 중성 + 종성(있으면)
 *
 * @param char - 한글 한 글자
 * @returns 획수 (한글이 아니면 0)
 */
export function getStrokeCount(char: string): number {
  const decomposed = decomposeHangul(char);
  if (!decomposed) return 0;

  const { cho, jung, jong } = decomposed;

  return (
    (CHOSEONG_STROKES[cho] ?? 0) +
    (JUNGSEONG_STROKES[jung] ?? 0) +
    (JONGSEONG_STROKES[jong] ?? 0)
  );
}

/**
 * 원형이정(元亨利貞) 사격을 계산한다.
 *
 * - 원격(元格): 성 + 이름 첫째 글자 획수 (초년운)
 * - 형격(亨格): 이름 첫째 + 이름 둘째 글자 획수 (청년운)
 * - 이격(利格): 성 + 이름 마지막 글자 획수 (중년운)
 * - 정격(貞格): 성 + 이름 전체 획수 합 (말년운/총운)
 *
 * 외자 이름일 경우 형격은 이름 한 글자의 획수만 사용한다.
 *
 * @param surname - 성 (한 글자)
 * @param givenName - 이름 (1~2글자)
 * @returns 원형이정 사격 객체
 */
export function calculateWonhyeong(
  surname: string,
  givenName: string
): { won: number; hyeong: number; yi: number; jeong: number } {
  const surnameStrokes = getStrokeCount(surname);
  const givenChars = [...givenName];
  const givenStrokes = givenChars.map(getStrokeCount);

  const firstGiven = givenStrokes[0] ?? 0;
  const lastGiven = givenStrokes[givenStrokes.length - 1] ?? 0;
  const totalGiven = givenStrokes.reduce((sum, s) => sum + s, 0);

  // 원격: 성 + 이름 첫째
  const won = surnameStrokes + firstGiven;

  // 형격: 이름 첫째 + 이름 둘째 (외자면 이름 획수만)
  const hyeong = givenStrokes.length >= 2
    ? firstGiven + givenStrokes[1]
    : firstGiven;

  // 이격: 성 + 이름 마지막
  const yi = surnameStrokes + lastGiven;

  // 정격: 전체 합
  const jeong = surnameStrokes + totalGiven;

  return { won, hyeong, yi, jeong };
}

/**
 * 81수리 길흉을 판단한다.
 *
 * 수리가 81을 초과하면 81로 나눈 나머지를 사용한다.
 * 나머지가 0이면 81로 처리한다.
 * 입력이 0이하이면 절대값을 취한 후 처리한다.
 *
 * @param num - 판단할 수
 * @returns 81수리 엔트리 (번호, 길흉, 해설)
 */
export function getSuri81(num: number): Suri81Entry {
  let normalized: number;

  if (num <= 0) {
    // 0 이하인 경우: 81에서 나머지 처리
    normalized = ((num % 81) + 81) % 81;
    if (normalized === 0) normalized = 81;
  } else if (num > 81) {
    normalized = num % 81;
    if (normalized === 0) normalized = 81;
  } else {
    normalized = num;
  }

  const gilhyung: '길' | '흉' = GIL_NUMBERS.has(normalized) ? '길' : '흉';
  const description = SURI81_DESCRIPTIONS[normalized] ?? `${normalized}수`;

  return { number: normalized, gilhyung, description };
}

/**
 * 수리오행을 계산한다.
 * 획수의 끝자리(일의 자리)로 오행을 결정한다.
 *
 * - 1,2 -> 목(木)
 * - 3,4 -> 화(火)
 * - 5,6 -> 토(土)
 * - 7,8 -> 금(金)
 * - 9,0 -> 수(水)
 *
 * @param strokeCount - 획수
 * @returns 오행
 */
export function getSuriOhaeng(strokeCount: number): Ohaeng {
  const lastDigit = strokeCount % 10;
  if (lastDigit === 1 || lastDigit === 2) return '목';
  if (lastDigit === 3 || lastDigit === 4) return '화';
  if (lastDigit === 5 || lastDigit === 6) return '토';
  if (lastDigit === 7 || lastDigit === 8) return '금';
  return '수'; // 9 or 0
}

/**
 * 발음오행을 계산한다.
 * 한글 초성(자음)으로 오행을 배정한다.
 *
 * - 목(木): ㄱ, ㅋ (ㄲ 포함)
 * - 화(火): ㄴ, ㄷ, ㄹ, ㅌ (ㄸ 포함)
 * - 토(土): ㅇ, ㅎ
 * - 금(金): ㅅ, ㅈ, ㅊ (ㅆ, ㅉ 포함)
 * - 수(水): ㅁ, ㅂ, ㅍ (ㅃ 포함)
 *
 * @param char - 한글 한 글자
 * @returns 오행 (한글이 아니면 null)
 */
export function getBalumOhaeng(char: string): Ohaeng | null {
  const decomposed = decomposeHangul(char);
  if (!decomposed) return null;

  return CHOSEONG_OHAENG[decomposed.cho] ?? null;
}

/**
 * 두 오행 간의 관계를 판단한다.
 *
 * 상생: 목->화->토->금->수->목 (순환)
 * 상극: 목->토, 화->금, 토->수, 금->목, 수->화
 * 비화: 같은 오행
 *
 * 방향에 관계없이 상생/상극을 판단한다.
 * (예: 목-화 = 상생, 화-목 = 상생)
 *
 * @param a - 첫 번째 오행
 * @param b - 두 번째 오행
 * @returns 관계 ('상생' | '상극' | '비화')
 */
export function getOhaengRelation(a: Ohaeng, b: Ohaeng): '상생' | '상극' | '비화' {
  if (a === b) return '비화';

  // 상생 쌍 (방향 무관)
  const sangsaengPairs: ReadonlySet<string> = new Set([
    '목-화', '화-목',
    '화-토', '토-화',
    '토-금', '금-토',
    '금-수', '수-금',
    '수-목', '목-수',
  ]);

  const key = `${a}-${b}`;
  if (sangsaengPairs.has(key)) return '상생';

  return '상극';
}

/**
 * 단일 이름을 분석한다.
 *
 * @param surname - 성 (한 글자)
 * @param givenName - 이름 (1~2글자)
 * @returns 이름 분석 결과
 */
export function analyzeName(surname: string, givenName: string): NamingAnalysis {
  const fullName = surname + givenName;
  const chars = [...fullName];

  for (const ch of chars) {
    if (!isHangulSyllable(ch)) {
      throw new ManseryeokRangeError(`이름은 한글 음절이어야 합니다: '${ch}'`, { char: ch });
    }
  }

  // 1. 각 글자의 획수
  const strokes = chars.map(getStrokeCount);

  // 2. 원형이정 사격
  const wonhyeong = calculateWonhyeong(surname, givenName);

  // 3. 81수리 길흉 (각 격에 대해)
  const suri81 = {
    won: getSuri81(wonhyeong.won),
    hyeong: getSuri81(wonhyeong.hyeong),
    yi: getSuri81(wonhyeong.yi),
    jeong: getSuri81(wonhyeong.jeong),
  };

  // 4. 수리오행 (각 글자의 획수 기반)
  const suriOhaeng: Ohaeng[] = strokes.map(getSuriOhaeng);

  // 5. 발음오행 (각 글자의 초성 기반)
  const balumOhaeng: Ohaeng[] = chars.map((ch) => getBalumOhaeng(ch) ?? '토');

  // 6. 오행 관계 (인접 글자 간 발음오행 기준)
  const pairs: { first: string; second: string; relation: '상생' | '상극' | '비화' }[] = [];
  for (let i = 0; i < chars.length - 1; i++) {
    const relation = getOhaengRelation(balumOhaeng[i], balumOhaeng[i + 1]);
    pairs.push({
      first: chars[i],
      second: chars[i + 1],
      relation,
    });
  }

  // 오행 관계 점수 계산
  const ohaengScore = calculateOhaengScore(pairs);

  // 7. 종합 점수 계산
  const totalScore = calculateTotalScore(suri81, ohaengScore);

  return {
    name: givenName,
    strokes,
    wonhyeong,
    suri81,
    suriOhaeng,
    balumOhaeng,
    ohaengRelation: { pairs, score: ohaengScore },
    totalScore,
  };
}

/**
 * 여러 후보 이름을 비교 분석한다.
 * 최대 6개 후보만 처리한다.
 *
 * @param surname - 성
 * @param givenNames - 이름 후보 목록
 * @returns 비교 분석 결과
 */
export function analyzeNames(surname: string, givenNames: string[]): NamingResult {
  const limitedNames = givenNames.slice(0, 6);
  const candidates = limitedNames.map((name) => analyzeName(surname, name));

  return {
    surname,
    candidates,
  };
}

// ---------- 확장 분석 (성명학: 자원오행 + 학파 분기) ----------

/**
 * 단일 이름을 확장 분석한다.
 * 기존 분석에 자원오행, 3중 오행 비교, 한자 획수를 추가한다.
 *
 * @param surname - 성 (한 글자 한글)
 * @param givenName - 이름 (1~2글자 한글)
 * @param options - 확장 옵션
 * @param options.hanjaChars - 한자 배열 (성 포함, e.g., ['金', '明', '浩']). null이면 자원오행 미분석
 * @param options.school - 학파 ('kangxi' | 'modern'). 기본값 'kangxi'
 * @returns 확장 이름 분석 결과
 */
export function analyzeNameExtended(
  surname: string,
  givenName: string,
  options: { hanjaChars?: string[] | null; school?: StrokeSchool } = {},
): NamingAnalysisExtended {
  // 1. 기존 분석 수행 (한글 자모 기준 — 폴백)
  const base = analyzeName(surname, givenName);
  const school = options.school ?? 'kangxi';
  const hanjaChars = options.hanjaChars ?? null;

  // 2. 한자가 제공되지 않으면 기본 결과 반환
  if (!hanjaChars || hanjaChars.length === 0) {
    return {
      ...base,
      hanjaChars: null,
      jawonOhaeng: null,
      tripleOhaeng: null,
      school,
      hanjaStrokes: null,
    };
  }

  // 한자 배열은 성+이름 전체 글자 수와 일치해야 한다.
  // 부분 배열은 인덱스가 어긋나 잘못된 글자에 한자가 배정되므로 거부한다.
  const expectedLen = [...surname].length + [...givenName].length;
  if (hanjaChars.length !== expectedLen) {
    throw new ManseryeokRangeError(
      `hanjaChars 길이(${hanjaChars.length})가 성+이름 글자 수(${expectedLen})와 일치해야 합니다.`,
      { hanjaChars, expectedLen },
    );
  }

  // 3. 자원오행 분석
  const jawonOhaeng = analyzeJawonOhaeng(hanjaChars);

  // 4. 한자 획수 (학파 기반)
  const hanjaStrokes = hanjaChars.map(c => getHanjaStrokes(c, school));

  // 5. 한자 획수가 유효하면 원형이정/수리/점수를 한자 기준으로 재계산
  //    한자가 빈 문자열('')이면 한글 획수로 폴백
  const fullName = surname + givenName;
  const chars = [...fullName];
  const effectiveStrokes = chars.map((ch, idx) => {
    const hStroke = hanjaStrokes[idx];
    if (hStroke !== null && hStroke > 0) return hStroke;
    return getStrokeCount(ch); // 한글 폴백
  });

  // 성씨 획수 / 이름 획수 분리
  const surnameLen = [...surname].length;
  const surnameStrokesSum = effectiveStrokes.slice(0, surnameLen).reduce((a, b) => a + b, 0);
  const givenStrokesArr = effectiveStrokes.slice(surnameLen);
  const firstGiven = givenStrokesArr[0] ?? 0;
  const lastGiven = givenStrokesArr[givenStrokesArr.length - 1] ?? 0;
  const totalGiven = givenStrokesArr.reduce((a, b) => a + b, 0);

  const wonhyeong = {
    won: surnameStrokesSum + firstGiven,
    hyeong: givenStrokesArr.length >= 2 ? firstGiven + givenStrokesArr[1] : firstGiven,
    yi: surnameStrokesSum + lastGiven,
    jeong: surnameStrokesSum + totalGiven,
  };

  const suri81 = {
    won: getSuri81(wonhyeong.won),
    hyeong: getSuri81(wonhyeong.hyeong),
    yi: getSuri81(wonhyeong.yi),
    jeong: getSuri81(wonhyeong.jeong),
  };

  const suriOhaeng: Ohaeng[] = effectiveStrokes.map(getSuriOhaeng);

  // 오행 관계 재계산
  const pairs: { first: string; second: string; relation: '상생' | '상극' | '비화' }[] = [];
  for (let i = 0; i < chars.length - 1; i++) {
    const relation = getOhaengRelation(base.balumOhaeng[i], base.balumOhaeng[i + 1]);
    pairs.push({ first: chars[i], second: chars[i + 1], relation });
  }
  const ohaengScore = calculateOhaengScore(pairs);
  const totalScore = calculateTotalScore(suri81, ohaengScore);

  // 6. 3중 오행 비교표 구축
  const tripleOhaeng: TripleOhaengComparison[] = chars.map((ch, idx) => ({
    charIndex: idx,
    char: ch,
    jawon: idx < hanjaChars.length ? jawonOhaeng.ohaengs[idx] : null,
    suri: suriOhaeng[idx],
    balum: base.balumOhaeng[idx],
  }));

  return {
    ...base,
    strokes: effectiveStrokes,
    wonhyeong,
    suri81,
    suriOhaeng,
    ohaengRelation: { pairs, score: ohaengScore },
    totalScore,
    hanjaChars,
    jawonOhaeng,
    tripleOhaeng,
    school,
    hanjaStrokes,
  };
}

/**
 * 여러 후보 이름을 확장 분석한다.
 * 기존 analyzeNames 와 동일한 제한(최대 6개)을 적용한다.
 *
 * @param surname - 성
 * @param candidates - 후보 배열. 각 항목은 { givenName, hanjaChars? }
 * @param school - 학파. 기본값 'kangxi'
 * @returns 확장 비교 분석 결과
 */
export function analyzeNamesExtended(
  surname: string,
  candidates: Array<{ givenName: string; hanjaChars?: string[] | null }>,
  school: StrokeSchool = 'kangxi',
): NamingResultExtended {
  const limited = candidates.slice(0, 6);
  const analyzed = limited.map(c =>
    analyzeNameExtended(surname, c.givenName, {
      hanjaChars: c.hanjaChars,
      school,
    }),
  );

  return {
    surname,
    school,
    candidates: analyzed,
  };
}

// ---------- 내부 점수 계산 헬퍼 ----------

/**
 * 오행 관계 쌍으로부터 점수를 계산한다 (0~100).
 * - 상생: +100 per pair
 * - 비화: +50 per pair
 * - 상극: +0 per pair
 */
function calculateOhaengScore(
  pairs: Array<{ relation: '상생' | '상극' | '비화' }>
): number {
  if (pairs.length === 0) return 50;

  let total = 0;
  for (const pair of pairs) {
    if (pair.relation === '상생') total += 100;
    else if (pair.relation === '비화') total += 50;
    // 상극: 0
  }

  return Math.round(total / pairs.length);
}

/**
 * 종합 점수를 계산한다 (0~100).
 *
 * 배점:
 * - 81수리 길흉 (4격): 60% (각 격 15점)
 * - 오행 관계: 40%
 */
function calculateTotalScore(
  suri81: {
    won: Suri81Entry;
    hyeong: Suri81Entry;
    yi: Suri81Entry;
    jeong: Suri81Entry;
  },
  ohaengScore: number
): number {
  // 81수리 점수 (각 격 15점, 길이면 15점, 흉이면 0점 -> 총 60점)
  let suriPoints = 0;
  if (suri81.won.gilhyung === '길') suriPoints += 15;
  if (suri81.hyeong.gilhyung === '길') suriPoints += 15;
  if (suri81.yi.gilhyung === '길') suriPoints += 15;
  if (suri81.jeong.gilhyung === '길') suriPoints += 15;

  // 오행 점수 (40점 만점)
  const ohaengPoints = Math.round(ohaengScore * 0.4);

  return suriPoints + ohaengPoints;
}
