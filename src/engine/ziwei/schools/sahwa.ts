// @TASK P8-R3-T1 - 사화파(四化派) 로직
// @SPEC docs/planning/06-tasks.md#P8-R3-T1

import type {
  ZiweiResult,
  ZiweiPalace,
  SahwaAnalysis,
  MutagenAnalysis,
  MutagenLocation,
  MutagenType,
  FlyingMutagen,
} from '@/engine/types';

// ---------- 비성 사화(飛星四化) 테이블 ----------

/**
 * 10 천간별 사화 성요 매핑.
 * 각 천간이 발동시키는 사화(록/권/과/기) 성요.
 *
 * 갑(甲): 염정록, 파군권, 무곡과, 태양기
 * 을(乙): 천기록, 천량권, 자미과, 태음기
 * 병(丙): 천동록, 천기권, 문창과, 염정기
 * 정(丁): 태음록, 천동권, 천기과, 거문기
 * 무(戊): 탐랑록, 태음권, 우필과, 천기기
 * 기(己): 무곡록, 탐랑권, 천량과, 문곡기
 * 경(庚): 태양록, 무곡권, 태음과, 천동기
 * 신(辛): 거문록, 태양권, 문곡과, 문창기
 * 임(壬): 천량록, 자미권, 좌보과, 무곡기
 * 계(癸): 파군록, 거문권, 태음과, 탐랑기
 */
export const FLYING_MUTAGEN_TABLE: Record<string, Record<string, string>> = {
  '갑': { '록': '염정', '권': '파군', '과': '무곡', '기': '태양' },
  '을': { '록': '천기', '권': '천량', '과': '자미', '기': '태음' },
  '병': { '록': '천동', '권': '천기', '과': '문창', '기': '염정' },
  '정': { '록': '태음', '권': '천동', '과': '천기', '기': '거문' },
  '무': { '록': '탐랑', '권': '태음', '과': '우필', '기': '천기' },
  '기': { '록': '무곡', '권': '탐랑', '과': '천량', '기': '문곡' },
  '경': { '록': '태양', '권': '무곡', '과': '태음', '기': '천동' },
  '신': { '록': '거문', '권': '태양', '과': '문곡', '기': '문창' },
  '임': { '록': '천량', '권': '자미', '과': '좌보', '기': '무곡' },
  '계': { '록': '파군', '권': '거문', '과': '태음', '기': '탐랑' },
};

// ---------- 생년사화 위치 분석 ----------

/**
 * 12궁에서 생년사화(록/권/과/기) 위치를 찾는다.
 * iztro가 이미 mutagen 필드에 매핑해놓은 데이터를 수집.
 */
export function findBirthMutagens(palaces: ZiweiPalace[]): MutagenAnalysis {
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

  const parts: string[] = [];
  if (rok) parts.push(`화록: ${rok.starName}(${rok.palaceName})`);
  if (gwon) parts.push(`화권: ${gwon.starName}(${gwon.palaceName})`);
  if (gwa) parts.push(`화과: ${gwa.starName}(${gwa.palaceName})`);
  if (gi) parts.push(`화기: ${gi.starName}(${gi.palaceName})`);

  return {
    locations,
    rok,
    gwon,
    gwa,
    gi,
    summary: parts.length > 0
      ? `생년사화: ${parts.join(', ')}.`
      : '사화 정보 없음.',
  };
}

// ---------- 비성 사화 추적 ----------

/**
 * 각 궁의 천간으로 비성 사화를 추적한다.
 *
 * 비성(飛星): 각 궁의 천간이 발동시키는 사화가
 * 해당 성요가 위치한 다른 궁으로 "날아가는" 효과.
 *
 * 예: 명궁 천간이 '갑'이면 갑의 화록=염정이므로,
 *     염정이 있는 궁에 명궁에서 화록이 날아감.
 */
export function trackFlyingMutagens(result: ZiweiResult): FlyingMutagen[] {
  const palaces = result.palaces;
  const flyingList: FlyingMutagen[] = [];

  // 성요 이름 -> 궁 매핑 (주성 + 보성)
  const starToPalace: Map<string, ZiweiPalace> = new Map();
  for (const palace of palaces) {
    for (const star of [...palace.majorStars, ...palace.minorStars]) {
      starToPalace.set(star.name, palace);
    }
  }

  // 각 궁의 천간으로 비성 추적
  for (const palace of palaces) {
    const gan = palace.heavenlyStem;
    const mutagenEntry = FLYING_MUTAGEN_TABLE[gan];
    if (!mutagenEntry) continue;

    const mutagenTypes: MutagenType[] = ['록', '권', '과', '기'];
    for (const mt of mutagenTypes) {
      const targetStarName = mutagenEntry[mt];
      const targetPalace = starToPalace.get(targetStarName);
      if (targetPalace && targetPalace.index !== palace.index) {
        flyingList.push({
          fromPalaceIndex: palace.index,
          fromPalaceName: palace.name,
          toPalaceIndex: targetPalace.index,
          toPalaceName: targetPalace.name,
          mutagenType: mt,
          starName: targetStarName,
        });
      }
    }
  }

  return flyingList;
}

// ---------- 사화 집중 궁 ----------

/**
 * 사화가 2개 이상 집중된 궁을 찾는다.
 * (생년사화 기준)
 */
export function findConcentratedPalaces(
  palaces: ZiweiPalace[],
): { palaceIndex: number; palaceName: string; mutagenCount: number }[] {
  const countMap: Map<number, { palaceName: string; count: number }> = new Map();

  for (const palace of palaces) {
    let count = 0;
    const allStars = [...palace.majorStars, ...palace.minorStars];
    for (const star of allStars) {
      if (star.mutagen) count++;
    }
    if (count >= 2) {
      countMap.set(palace.index, { palaceName: palace.name, count });
    }
  }

  return Array.from(countMap.entries()).map(([idx, data]) => ({
    palaceIndex: idx,
    palaceName: data.palaceName,
    mutagenCount: data.count,
  }));
}

// ---------- 화기 충돌 분석 ----------

/**
 * 화기(忌) 성요가 중요 궁에 위치할 때의 충돌/위험 분석.
 */
export function analyzeGiConflicts(
  palaces: ZiweiPalace[],
): { description: string; severity: '경' | '중' | '위험' }[] {
  const conflicts: { description: string; severity: '경' | '중' | '위험' }[] = [];

  // 화기가 있는 궁 찾기
  for (const palace of palaces) {
    const allStars = [...palace.majorStars, ...palace.minorStars];
    for (const star of allStars) {
      if (star.mutagen === '기') {
        // 중요 궁에 화기가 있으면 위험도 높음
        const criticalPalaces = ['명궁', '재백', '관록', '부처'];
        const moderatePalaces = ['복덕', '전택', '부모'];

        if (criticalPalaces.includes(palace.name)) {
          conflicts.push({
            description: `${star.name} 화기가 ${palace.name}에 위치. 해당 궁의 기능이 크게 손상될 수 있음.`,
            severity: '위험',
          });
        } else if (moderatePalaces.includes(palace.name)) {
          conflicts.push({
            description: `${star.name} 화기가 ${palace.name}에 위치. 해당 궁의 기능에 지장이 있을 수 있음.`,
            severity: '중',
          });
        } else {
          conflicts.push({
            description: `${star.name} 화기가 ${palace.name}에 위치. 경미한 영향.`,
            severity: '경',
          });
        }
      }
    }
  }

  return conflicts;
}

// ---------- 공개 API ----------

/**
 * 사화파 분석을 수행한다.
 *
 * - 생년사화 위치 분석
 * - 비성 사화 추적
 * - 사화 집중 궁 파악
 * - 화기 충돌 분석
 */
export function analyzeSahwa(result: ZiweiResult): SahwaAnalysis {
  const birthMutagens = findBirthMutagens(result.palaces);
  const flyingMutagens = trackFlyingMutagens(result);
  const concentratedPalaces = findConcentratedPalaces(result.palaces);
  const giConflicts = analyzeGiConflicts(result.palaces);

  // 요약 생성
  const summaryParts: string[] = [];
  summaryParts.push(birthMutagens.summary);

  if (flyingMutagens.length > 0) {
    summaryParts.push(`비성 사화 ${flyingMutagens.length}건 추적됨.`);
  }

  if (concentratedPalaces.length > 0) {
    const names = concentratedPalaces.map((c) => `${c.palaceName}(${c.mutagenCount}개)`);
    summaryParts.push(`사화 집중 궁: ${names.join(', ')}.`);
  }

  if (giConflicts.length > 0) {
    const dangerous = giConflicts.filter((c) => c.severity === '위험');
    if (dangerous.length > 0) {
      summaryParts.push(`주의: 화기 위험 ${dangerous.length}건.`);
    }
  }

  return {
    birthMutagens,
    flyingMutagens,
    concentratedPalaces,
    giConflicts,
    summary: summaryParts.join(' '),
  };
}
