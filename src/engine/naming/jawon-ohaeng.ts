// @TASK EXT-NAMING-2 - 자원오행 분석 엔진
// @SPEC 성명학 확장: 자원오행 (부수 기반 오행 판별)

import { HANJA_DB, type HanjaEntry } from './hanja-data';
import type { Ohaeng } from '@/engine/types';

// ---------------------------------------------------------------------------
// 오행 상생/상극 참조 (index.ts의 getOhaengRelation 과 일관)
// ---------------------------------------------------------------------------

const SANGSAENG_PAIRS: ReadonlySet<string> = new Set([
  '목-화', '화-목',
  '화-토', '토-화',
  '토-금', '금-토',
  '금-수', '수-금',
  '수-목', '목-수',
]);

function getOhaengRelationInternal(a: Ohaeng, b: Ohaeng): '상생' | '상극' | '비화' {
  if (a === b) return '비화';
  if (SANGSAENG_PAIRS.has(`${a}-${b}`)) return '상생';
  return '상극';
}

// ---------------------------------------------------------------------------
// 빠른 검색을 위한 인덱스 (한 번만 구축)
// ---------------------------------------------------------------------------

const charIndex: Map<string, HanjaEntry> = new Map();
const readingIndex: Map<string, HanjaEntry[]> = new Map();

for (const entry of HANJA_DB) {
  // char -> entry (동일 char가 중복이면 첫 번째 사용)
  if (!charIndex.has(entry.char)) {
    charIndex.set(entry.char, entry);
  }

  // reading -> entry[]
  const list = readingIndex.get(entry.reading);
  if (list) {
    // 중복 char 방지
    if (!list.some(e => e.char === entry.char)) {
      list.push(entry);
    }
  } else {
    readingIndex.set(entry.reading, [entry]);
  }
}

// ---------------------------------------------------------------------------
// 공개 API
// ---------------------------------------------------------------------------

/**
 * 한자에서 자원오행을 찾는다.
 *
 * @param char - 한자 한 글자 (e.g., '明')
 * @returns 자원오행 ('목' | '화' | '토' | '금' | '수') 또는 DB에 없으면 null
 */
export function getJawonOhaeng(char: string): Ohaeng | null {
  const entry = charIndex.get(char);
  return entry?.ohaeng ?? null;
}

/**
 * 한자의 획수를 반환한다.
 * 학파에 따라 강희자전 획수 또는 현대 획수를 선택한다.
 *
 * @param char - 한자 한 글자
 * @param school - 'kangxi' (강희자전파) | 'modern' (현대획수파)
 * @returns 획수. DB에 없으면 null
 */
export function getHanjaStrokes(char: string, school: 'kangxi' | 'modern'): number | null {
  const entry = charIndex.get(char);
  if (!entry) return null;
  return school === 'kangxi' ? entry.kangxi : entry.modern;
}

/**
 * 한글 음으로 한자 후보를 검색한다.
 *
 * @param reading - 한글 음 (e.g., '명')
 * @returns 매칭되는 HanjaEntry 배열 (없으면 빈 배열)
 */
export function searchHanjaByReading(reading: string): HanjaEntry[] {
  return readingIndex.get(reading) ?? [];
}

/**
 * 한자로 HanjaEntry 를 조회한다.
 *
 * @param char - 한자 한 글자
 * @returns HanjaEntry 또는 null
 */
export function lookupHanja(char: string): HanjaEntry | null {
  return charIndex.get(char) ?? null;
}

/**
 * 이름의 자원오행 조합을 분석한다.
 *
 * - 각 글자의 자원오행을 결정한다.
 * - 인접 글자 간 상생/상극/비화 관계를 판단한다.
 * - 조화 점수(0-100)를 산출한다.
 *
 * @param hanjaChars - 한자 배열 (성 포함, e.g., ['金', '明', '浩'])
 * @returns 자원오행 분석 결과
 */
export function analyzeJawonOhaeng(hanjaChars: string[]): {
  ohaengs: (Ohaeng | null)[];
  pairs: { first: string; second: string; firstOhaeng: Ohaeng | null; secondOhaeng: Ohaeng | null; relation: '상생' | '상극' | '비화' | '판별불가' }[];
  harmony: string;
  score: number;
} {
  const ohaengs = hanjaChars.map(c => getJawonOhaeng(c));

  // 인접 쌍 관계 분석
  const pairs: {
    first: string;
    second: string;
    firstOhaeng: Ohaeng | null;
    secondOhaeng: Ohaeng | null;
    relation: '상생' | '상극' | '비화' | '판별불가';
  }[] = [];

  for (let i = 0; i < hanjaChars.length - 1; i++) {
    const a = ohaengs[i];
    const b = ohaengs[i + 1];

    let relation: '상생' | '상극' | '비화' | '판별불가';
    if (a && b) {
      relation = getOhaengRelationInternal(a, b);
    } else {
      relation = '판별불가';
    }

    pairs.push({
      first: hanjaChars[i],
      second: hanjaChars[i + 1],
      firstOhaeng: a,
      secondOhaeng: b,
      relation,
    });
  }

  // 점수 계산
  const scorablePairs = pairs.filter(p => p.relation !== '판별불가');
  let totalPoints = 0;
  for (const pair of scorablePairs) {
    if (pair.relation === '상생') totalPoints += 100;
    else if (pair.relation === '비화') totalPoints += 50;
    // 상극: 0
  }
  const score = scorablePairs.length > 0
    ? Math.round(totalPoints / scorablePairs.length)
    : 0;

  // 조화 판정
  let harmony: string;
  if (scorablePairs.length === 0) {
    harmony = '판별불가 (DB에 없는 한자 포함)';
  } else if (score >= 80) {
    harmony = '대길 - 자원오행이 상생 조화를 이룬다';
  } else if (score >= 50) {
    harmony = '중길 - 자원오행이 무난하다';
  } else if (score > 0) {
    harmony = '소흉 - 자원오행에 일부 상극이 있다';
  } else {
    harmony = '흉 - 자원오행이 상극 관계이다';
  }

  return { ohaengs, pairs, harmony, score };
}
