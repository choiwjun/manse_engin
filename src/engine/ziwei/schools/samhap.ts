// @TASK P8-R2-T1 - 삼합파(三合派) 분석 엔진
// @SPEC docs/planning/06-tasks.md#P8-R2-T1
// @TEST tests/engine/ziwei-samhap.test.ts

import type {
  ZiweiResult,
  ZiweiPalace,
  SamhapAnalysis,
  TriangleGroup,
  ZiweiGyeokguk,
} from '@/engine/types';

// ---------- 12궁 삼합 관계 테이블 ----------

/**
 * 4개 삼합 그룹 정의.
 * 삼합은 4간격으로 묶인 3궁 세트(120도 관계).
 *
 * - 명궁 삼합(0,4,8): 자신-재물-사업 → 개인 역량
 * - 형제 삼합(1,5,9): 형제-건강-부동산 → 생활 기반
 * - 부처 삼합(2,6,10): 배우자-외출-정신 → 대인 관계
 * - 자녀 삼합(3,7,11): 자녀-부하-부모 → 혈연 관계
 */
export const TRIANGLE_GROUPS: TriangleGroup[] = [
  {
    name: '명궁 삼합 (재관)',
    indices: [0, 4, 8],
    palaceNames: ['명궁', '재백', '관록'],
  },
  {
    name: '형제 삼합 (질전)',
    indices: [1, 5, 9],
    palaceNames: ['형제', '질액', '전택'],
  },
  {
    name: '부처 삼합 (천복)',
    indices: [2, 6, 10],
    palaceNames: ['부처', '천이', '복덕'],
  },
  {
    name: '자녀 삼합 (노부)',
    indices: [3, 7, 11],
    palaceNames: ['자녀', '노복', '부모'],
  },
];

// ---------- 삼합파 격국 정의 ----------

/**
 * 삼합파 핵심 격국(格局) 정의.
 *
 * 각 격국은 특정 주성 조합이 명궁 삼합(또는 동궁)에
 * 존재할 때 성립하는 특수 배치 패턴이다.
 */
export const SAMHAP_GYEOKGUKS: ZiweiGyeokguk[] = [
  {
    name: '자미조원격',
    hanja: '紫微朝元格',
    description:
      '자미성이 명궁에 묘/왕 밝기로 좌수하면 제왕의 기상으로 부귀를 이룬다.',
    fortune: '길',
    relatedStars: ['자미'],
  },
  {
    name: '기월동량격',
    hanja: '機月同梁格',
    description:
      '천기, 태음, 천동, 천량이 명궁 삼합에 모이면 공직이나 조직에서 안정적으로 출세한다.',
    fortune: '길',
    relatedStars: ['천기', '태음', '천동', '천량'],
  },
  {
    name: '일월병명격',
    hanja: '日月並明格',
    description:
      '태양과 태음이 함께 밝은 궁에 위치하면 문무겸전의 인재로 명성을 얻는다.',
    fortune: '길',
    relatedStars: ['태양', '태음'],
  },
  {
    name: '부성조원격',
    hanja: '府星朝元格',
    description:
      '천부성이 명궁 삼합에서 밝게 빛나면 재물과 관직을 겸비한 귀격이다.',
    fortune: '길',
    relatedStars: ['천부'],
  },
  {
    name: '칠살조두격',
    hanja: '七殺朝斗格',
    description:
      '칠살이 명궁 삼합에서 왕지에 있으면 무관에서 대성하는 장군의 격이다.',
    fortune: '길',
    relatedStars: ['칠살'],
  },
  {
    name: '화성탐랑격',
    hanja: '火星貪狼格',
    description:
      '탐랑성이 삼합에 있으면 예술적 재능과 돌발적 행운이 따른다.',
    fortune: '길',
    relatedStars: ['탐랑'],
  },
  {
    name: '풍류채장격',
    hanja: '風流彩杖格',
    description:
      '염정과 탐랑이 동궁하면 도화(연애/유흥)가 왕성하여 풍류에 빠지기 쉽다.',
    fortune: '흉',
    relatedStars: ['염정', '탐랑'],
  },
];

// ---------- 표준 12궁 이름 순서 ----------

/** 인덱스 0~11에 대응하는 궁 이름 */
const PALACE_NAME_ORDER = [
  '명궁',
  '형제',
  '부처',
  '자녀',
  '재백',
  '질액',
  '천이',
  '노복',
  '관록',
  '전택',
  '복덕',
  '부모',
] as const;

// ---------- 밝기 파싱 ----------

/**
 * 밝기(brightness) 문자열을 수치로 변환한다.
 *
 * iztro 라이브러리는 brightness를 "[+N]" 형식으로 제공하므로
 * 이를 우선 파싱하고, 한자/한글 라벨도 폴백으로 지원한다.
 *
 * 한자/한글 매핑:
 *   "廟"/"묘" -> 3  (가장 밝음)
 *   "旺"/"왕" -> 2
 *   "得"/"득" -> 1
 *   "平"/"평" -> 0
 *   "不"/"불"/"閒"/"한" -> -1
 *   "陷"/"함" -> -3  (가장 어두움)
 */
function brightnessToScore(brightness: string | undefined): number {
  if (!brightness) return 0;

  // iztro "[+N]"/["[-N]" 형식 우선 처리
  const bracketMatch = brightness.match(/\[([+-]?\d+)\]/);
  if (bracketMatch) return parseInt(bracketMatch[1], 10);

  // 한자/한글 라벨 폴백
  const label = brightness.trim();
  if (label === '廟' || label === '묘') return 3;
  if (label === '旺' || label === '왕') return 2;
  if (label === '得' || label === '득') return 1;
  if (label === '平' || label === '평') return 0;
  if (label === '不' || label === '불' || label === '閒' || label === '한')
    return -1;
  if (label === '陷' || label === '함') return -3;

  return 0;
}

// ---------- 유틸리티 함수 ----------

/**
 * 궁 인덱스로 해당 삼합 그룹을 찾는다.
 *
 * 삼합은 4간격이므로 index % 4 로 그룹을 결정한다.
 *   0,4,8  -> TRIANGLE_GROUPS[0] (명궁 삼합)
 *   1,5,9  -> TRIANGLE_GROUPS[1] (형제 삼합)
 *   2,6,10 -> TRIANGLE_GROUPS[2] (부처 삼합)
 *   3,7,11 -> TRIANGLE_GROUPS[3] (자녀 삼합)
 */
export function getTriangleGroupByIndex(index: number): TriangleGroup {
  const base = index % 4;
  return TRIANGLE_GROUPS[base];
}

/**
 * 주어진 궁 인덱스 배열에 해당하는 궁들에서 주성(majorStars) 이름을 수집한다.
 *
 * palaces 배열에서 palace.index 로 매칭하며, 폴백으로 궁 이름 매칭도 시도한다.
 * 3궁의 모든 주성 이름을 하나의 배열로 반환한다.
 */
export function collectTriangleStars(
  palaces: ZiweiPalace[],
  indices: number[] | readonly [number, number, number],
): string[] {
  const stars: string[] = [];

  for (const idx of indices) {
    // 우선 palace.index 로 매칭 (테스트 기대 방식)
    let palace = palaces.find((p) => p.index === idx);

    // 폴백: 궁 이름으로 매칭
    if (!palace) {
      const targetName = PALACE_NAME_ORDER[idx];
      palace = palaces.find((p) => p.name === targetName);
    }

    if (palace) {
      for (const star of palace.majorStars) {
        stars.push(star.name);
      }
    }
  }

  return stars;
}

/**
 * 삼합궁 3개의 주성 밝기를 합산한다.
 */
function calcTriangleBrightness(
  palaces: ZiweiPalace[],
  indices: number[],
): number {
  let total = 0;

  for (const idx of indices) {
    let palace = palaces.find((p) => p.index === idx);
    if (!palace) {
      const targetName = PALACE_NAME_ORDER[idx];
      palace = palaces.find((p) => p.name === targetName);
    }

    if (palace) {
      for (const star of palace.majorStars) {
        total += brightnessToScore(star.brightness);
      }
    }
  }

  return total;
}

/**
 * 격국 판별: 명궁 삼합(0,4,8)의 주성 조합에서 격국 패턴을 탐색한다.
 *
 * - 동궁격(이름에 '동궁' 포함): 관련 성요가 모두 같은 궁에 있어야 성립
 * - 삼합격(일반): 관련 성요가 명궁 삼합 3궁에 걸쳐 모두 존재하면 성립
 */
function detectGyeokguks(palaces: ZiweiPalace[]): ZiweiGyeokguk[] {
  const found: ZiweiGyeokguk[] = [];

  for (const gk of SAMHAP_GYEOKGUKS) {
    const isDonggung = gk.name.includes('동궁');

    if (isDonggung) {
      // 동궁격: 관련 성요가 모두 같은 궁 안에 있어야 함
      for (const palace of palaces) {
        const palaceMajorNames = palace.majorStars.map((s) => s.name);
        const allPresent = gk.relatedStars.every((star) =>
          palaceMajorNames.includes(star),
        );
        if (allPresent) {
          found.push(gk);
          break;
        }
      }
    } else {
      // 삼합격: 명궁 삼합(0,4,8) 3궁에 걸쳐 관련 성요가 모두 존재
      const soulTriangleStars = collectTriangleStars(palaces, [0, 4, 8]);
      const allPresent = gk.relatedStars.every((star) =>
        soulTriangleStars.includes(star),
      );
      if (allPresent) {
        found.push(gk);
      }
    }
  }

  return found;
}

// ---------- 공개 API ----------

/**
 * 삼합파(三合派) 종합 분석을 수행한다.
 *
 * 삼합파 분석의 핵심:
 * 1. 명궁 삼합(명-재백-관록) 중심 해석 → 개인의 역량, 재물, 사업 종합 평가
 * 2. 4개 삼합 그룹 구조 제공
 * 3. 격국(格局) 패턴 판별 → 특수한 성요 배치로 인한 길흉 판단
 * 4. 밝기 합산으로 전체 운세 방향 판정
 */
export function analyzeSamhap(result: ZiweiResult): SamhapAnalysis {
  const { palaces } = result;

  // 1. 명궁 삼합 분석
  const soulTriangleGroup = TRIANGLE_GROUPS[0];
  const soulTriangleIndices = [...soulTriangleGroup.indices];
  const soulTriangleStars = collectTriangleStars(
    palaces,
    soulTriangleGroup.indices,
  );
  const soulBrightness = calcTriangleBrightness(palaces, soulTriangleIndices);

  // 밝기 합산으로 길흉 판정
  //   +3 이상: 길 (밝은 별이 많다)
  //   -3 이하: 흉 (어두운 별이 많다)
  //   그 외: 평 (보통)
  const soulFortune: '길' | '흉' | '평' =
    soulBrightness >= 3 ? '길' : soulBrightness <= -3 ? '흉' : '평';

  // 2. 격국 판별
  const gyeokguks = detectGyeokguks(palaces);

  // 3. 분석 요약 생성
  const summaryParts: string[] = [];
  summaryParts.push(
    `명궁 삼합(명-재백-관록) 주성: ${soulTriangleStars.join(', ') || '없음'}.`,
  );
  summaryParts.push(`밝기 합산: ${soulBrightness}, 판정: ${soulFortune}.`);

  if (gyeokguks.length > 0) {
    summaryParts.push(
      `발견된 격국: ${gyeokguks.map((g) => g.name).join(', ')}.`,
    );
  } else {
    summaryParts.push('특수 격국 없음.');
  }

  return {
    soulTriangle: {
      group: soulTriangleGroup,
      majorStars: soulTriangleStars,
      brightnessTotal: soulBrightness,
      fortune: soulFortune,
    },
    triangleGroups: [...TRIANGLE_GROUPS],
    gyeokguks,
    summary: summaryParts.join(' '),
  };
}
