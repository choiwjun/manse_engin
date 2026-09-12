// @TASK P8-R1-T2 - 자미두수 명반 해석 엔진
// @SPEC docs/planning/06-tasks.md#P8-R1-T2

import type {
  ZiweiResult,
  ZiweiPalace,
  PalaceInterpretation,
  MutagenAnalysis,
  MutagenLocation,
  MutagenType,
  ZiweiInterpretation,
} from '@/engine/types';

// ---------- 밝기 파싱 ----------

/**
 * iztro brightness 문자열을 수치로 변환한다.
 * "[+3]" -> 3, "[-1]" -> -1, undefined -> 0
 */
export function parseBrightness(brightness: string | undefined): number {
  if (!brightness) return 0;
  const match = brightness.match(/\[([+-]?\d+)\]/);
  if (match) return parseInt(match[1], 10);
  return 0;
}

// ---------- 주성 조합 길흉 데이터 ----------

/** 14주성 기본 길흉 속성 (양수=길, 음수=흉) */
const STAR_BASE_FORTUNE: Record<string, number> = {
  '자미': 3,   // 제왕지성, 대길
  '천기': 1,   // 지혜, 소길
  '태양': 2,   // 광명, 길
  '무곡': 2,   // 재성, 길
  '천동': 1,   // 복성, 소길
  '염정': -1,  // 화성, 소흉
  '천부': 3,   // 재고, 대길
  '태음': 2,   // 재성, 길
  '탐랑': 0,   // 욕망, 중성
  '거문': -1,  // 구설, 소흉
  '천상': 2,   // 인성, 길
  '천량': 2,   // 음덕, 길
  '칠살': -2,  // 장성, 흉
  '파군': -2,  // 파괴, 흉
};

/** 사화 가중치 */
const MUTAGEN_WEIGHT: Record<string, number> = {
  '록': 3,  // 화록: 재물/기회
  '권': 2,  // 화권: 권력/능력
  '과': 1,  // 화과: 명예/학업
  '기': -3, // 화기: 파괴/시비
};

// ---------- 궁별 해석 ----------

/**
 * 단일 궁의 해석을 생성한다.
 * - 주성 조합에 따른 길흉 판별
 * - 밝기(brightness)에 따른 해석 가중치
 * - 사화(mutagen) 존재 시 해석 추가
 */
export function interpretPalace(palace: ZiweiPalace): PalaceInterpretation {
  const majorStarNames = palace.majorStars.map((s) => s.name);

  // 밝기 가중치 합산
  let brightnessScore = 0;
  for (const star of palace.majorStars) {
    brightnessScore += parseBrightness(star.brightness);
  }

  // 사화 수집 (주성 + 보성)
  const mutagens: { starName: string; mutagenType: MutagenType }[] = [];
  const allStars = [...palace.majorStars, ...palace.minorStars];
  for (const star of allStars) {
    if (star.mutagen) {
      mutagens.push({
        starName: star.name,
        mutagenType: star.mutagen as MutagenType,
      });
    }
  }

  // 길흉 계산: 주성 기본 + 밝기 + 사화
  let fortuneScore = 0;

  // 1) 주성 기본 길흉
  for (const star of palace.majorStars) {
    fortuneScore += STAR_BASE_FORTUNE[star.name] ?? 0;
  }

  // 2) 밝기 가중치 (밝으면 길에 보강, 어두우면 흉에 보강)
  fortuneScore += brightnessScore * 0.5;

  // 3) 사화 가중치
  for (const m of mutagens) {
    fortuneScore += MUTAGEN_WEIGHT[m.mutagenType] ?? 0;
  }

  // fortune 결정
  let fortune: '길' | '흉' | '평';
  if (fortuneScore >= 2) {
    fortune = '길';
  } else if (fortuneScore <= -2) {
    fortune = '흉';
  } else {
    fortune = '평';
  }

  // 해석 요약 생성
  const summary = buildPalaceSummary(palace, majorStarNames, fortune, mutagens, brightnessScore);

  return {
    palaceIndex: palace.index,
    palaceName: palace.name,
    majorStarNames,
    fortune,
    brightnessScore,
    mutagens,
    summary,
  };
}

/** 궁 해석 요약 문자열 생성 */
function buildPalaceSummary(
  palace: ZiweiPalace,
  majorStarNames: string[],
  fortune: '길' | '흉' | '평',
  mutagens: { starName: string; mutagenType: MutagenType }[],
  brightnessScore: number,
): string {
  const parts: string[] = [];

  // 궁 이름과 주성
  if (majorStarNames.length > 0) {
    parts.push(`${palace.name}에 ${majorStarNames.join(', ')} 좌수.`);
  } else {
    parts.push(`${palace.name}에 주성 없음 (공궁).`);
  }

  // 밝기
  if (brightnessScore > 0) {
    parts.push(`성요 밝기 양호 (${brightnessScore > 0 ? '+' : ''}${brightnessScore}).`);
  } else if (brightnessScore < 0) {
    parts.push(`성요 밝기 불량 (${brightnessScore}).`);
  }

  // 사화
  for (const m of mutagens) {
    const mutagenLabel = getMutagenLabel(m.mutagenType);
    parts.push(`${m.starName} ${mutagenLabel}.`);
  }

  // 길흉
  const fortuneLabel = fortune === '길' ? '길한 배치' : fortune === '흉' ? '흉한 배치' : '평범한 배치';
  parts.push(fortuneLabel + '.');

  return parts.join(' ');
}

function getMutagenLabel(type: MutagenType): string {
  switch (type) {
    case '록': return '화록(재물/기회 증가)';
    case '권': return '화권(권력/능력 강화)';
    case '과': return '화과(명예/학업 상승)';
    case '기': return '화기(파괴/시비 주의)';
  }
}

// ---------- 사화 분석 ----------

/**
 * 12궁 전체에서 사화(록/권/과/기) 위치를 추적한다.
 */
export function interpretMutagens(palaces: ZiweiPalace[]): MutagenAnalysis {
  const locations: MutagenLocation[] = [];

  for (const palace of palaces) {
    const allStars = [...palace.majorStars, ...palace.minorStars];
    for (const star of allStars) {
      if (star.mutagen) {
        locations.push({
          type: star.mutagen as MutagenType,
          starName: star.name,
          palaceIndex: palace.index,
          palaceName: palace.name,
        });
      }
    }
  }

  const rok = locations.find((l) => l.type === '록') ?? null;
  const gwon = locations.find((l) => l.type === '권') ?? null;
  const gwa = locations.find((l) => l.type === '과') ?? null;
  const gi = locations.find((l) => l.type === '기') ?? null;

  // 요약 생성
  const summaryParts: string[] = [];
  if (rok) summaryParts.push(`화록: ${rok.starName} (${rok.palaceName})`);
  if (gwon) summaryParts.push(`화권: ${gwon.starName} (${gwon.palaceName})`);
  if (gwa) summaryParts.push(`화과: ${gwa.starName} (${gwa.palaceName})`);
  if (gi) summaryParts.push(`화기: ${gi.starName} (${gi.palaceName})`);

  return {
    locations,
    rok,
    gwon,
    gwa,
    gi,
    summary: summaryParts.length > 0
      ? `생년사화 배치: ${summaryParts.join(', ')}.`
      : '사화 정보 없음.',
  };
}

// ---------- 대궁 / 삼합궁 ----------

/**
 * 대궁 인덱스를 반환한다. (index + 6) % 12
 */
export function getOppositeIndex(index: number): number {
  return (index + 6) % 12;
}

/**
 * 삼합궁 인덱스를 반환한다.
 * 명궁(0)-재백(4)-관록(8), 형제(1)-질액(5)-전택(9), ...
 */
export function getTriangleIndices(index: number): number[] {
  const base = index % 4;
  return [base, base + 4, base + 8];
}

// ---------- 전체 해석 ----------

/**
 * ZiweiResult 전체를 해석한다.
 */
export function interpretResult(result: ZiweiResult): ZiweiInterpretation {
  // 12궁 해석
  const palaceInterpretations = result.palaces.map((p) => interpretPalace(p));

  // 사화 분석
  const mutagenAnalysis = interpretMutagens(result.palaces);

  // 명궁 찾기 (name이 '명궁'인 궁)
  const soulPalaceData = result.palaces.find((p) => p.name === '명궁');
  const soulPalace = soulPalaceData
    ? interpretPalace(soulPalaceData)
    : palaceInterpretations[0];

  // 신궁 찾기 (isBodyPalace=true인 궁)
  const bodyPalaceData = result.palaces.find((p) => p.isBodyPalace);
  const bodyPalace = bodyPalaceData
    ? interpretPalace(bodyPalaceData)
    : palaceInterpretations[0];

  // 종합 요약
  const overallParts: string[] = [];
  overallParts.push(`오행국: ${result.fiveElementsClass}.`);
  overallParts.push(`명주: ${result.soulStar}, 신주: ${result.bodyStar}.`);
  overallParts.push(soulPalace.summary);
  overallParts.push(mutagenAnalysis.summary);

  // 길한 궁, 흉한 궁 집계
  const gilCount = palaceInterpretations.filter((p) => p.fortune === '길').length;
  const hyungCount = palaceInterpretations.filter((p) => p.fortune === '흉').length;
  overallParts.push(`길한 궁 ${gilCount}개, 흉한 궁 ${hyungCount}개.`);

  return {
    palaceInterpretations,
    mutagenAnalysis,
    soulPalace,
    bodyPalace,
    overallSummary: overallParts.join(' '),
  };
}
