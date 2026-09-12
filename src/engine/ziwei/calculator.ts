// @TASK ZIWEI-SELF - 자미두수 자체 명반 생성 엔진
// @SPEC docs/planning/06-tasks.md#자미두수-자체엔진

import type { ZiweiResult, ZiweiPalace, ZiweiStar } from '@/engine/types';
import { ManseryeokEngine } from '@/engine/core/manseryeok-engine';
import {
  STEMS, BRANCHES,
  STEMS_KR, BRANCHES_KR,
  SHICHEN_NAMES,
  PALACE_NAMES_KR,
  getWuxingJu, getWuxingJuName,
  getZiweiPosition, getTianfuPosition,
  ZIWEI_SERIES_OFFSETS, TIANFU_SERIES_OFFSETS,
  SIHUA_TABLE, SIHUA_TYPES,
  LUCUN_POSITIONS,
  TIANKUI_TIANYUE,
  HUOXING_BASE, LINGXING_BASE,
  TIANMA_TABLE,
  WUHU_DUN,
  BRIGHTNESS_TABLE, brightnessToScore,
  ZODIAC_NAMES, getWesternSign,
} from './data';

// ---------- 유틸리티 ----------

function mod(a: number, m: number): number {
  return ((a % m) + m) % m;
}

function stemIndex(stem: string): number {
  const idx = STEMS.indexOf(stem as (typeof STEMS)[number]);
  if (idx < 0) throw new Error(`Invalid stem: ${stem}`);
  return idx;
}

function branchIndex(branch: string): number {
  const idx = BRANCHES.indexOf(branch as (typeof BRANCHES)[number]);
  if (idx < 0) throw new Error(`Invalid branch: ${branch}`);
  return idx;
}

/** 시간(hour 0~23)을 시진 인덱스(0~11)로 변환 */
function hourToShichenIndex(hour: number): number {
  if (hour === 23 || hour === 0) return 0;
  return Math.floor((hour + 1) / 2);
}

// ---------- 명궁(命宮) 위치 계산 ----------

/**
 * 명궁 지지 인덱스를 계산한다.
 * 공식: 인(寅=2)궁에서 시작, 월수만큼 순행, 시진수만큼 역행
 * 명궁 = 寅 + (월-1) - 시진idx = 2 + (月-1) - 時
 * 더 정확하게: 인궁에서 출발해 월수를 세고, 거기서 시진을 역으로 센다
 * 명궁지지인덱스 = (2 + 월 - 1 - 시진인덱스 + 12) % 12 = (월 + 1 - 시진인덱스 + 12) % 12
 */
function getMingGongBranch(lunarMonth: number, shichenIdx: number): number {
  return mod(2 + lunarMonth - 1 - shichenIdx, 12);
}

// ---------- 신궁(身宮) 위치 계산 ----------

/**
 * 신궁 지지 인덱스를 계산한다.
 * 공식: 인(寅)궁에서 시작, 월수만큼 순행, 시진수만큼도 순행
 * 신궁 = 寅 + (월-1) + 시진idx = 2 + (月-1) + 時
 */
function getShenGongBranch(lunarMonth: number, shichenIdx: number): number {
  return mod(2 + lunarMonth - 1 + shichenIdx, 12);
}

// ---------- 12궁 천간 배치 (오호둔) ----------

/**
 * 12궁 각각의 천간을 결정한다.
 * 년간에 따라 인궁(寅)의 천간이 결정되고, 순서대로 배치된다.
 */
function getPalaceStems(yearStem: string): string[] {
  const yinStemIdx = WUHU_DUN[yearStem];
  const palaceStems: string[] = [];
  for (let i = 0; i < 12; i++) {
    // i=0 은 子궁, i=2 은 寅궁
    // 오호둔은 寅궁 천간에서 시작해 寅→卯→…→亥→子→丑 순행으로 배치하므로
    // 子·丑궁은 사이클의 끝(寅으로부터 +10, +11)에 온다
    const stemIdx = mod(yinStemIdx + mod(i - 2, 12), 10);
    palaceStems[i] = STEMS[stemIdx];
  }
  return palaceStems;
}

// ---------- 명반 생성 인터페이스 ----------

interface ChartInput {
  lunarYear: number;
  lunarMonth: number;
  lunarDay: number;
  hour: number; // 0~23
  gender: 'male' | 'female';
  // 양력 정보 (표시용)
  solarYear: number;
  solarMonth: number;
  solarDay: number;
  // 간지 정보
  yearStem: string;   // 한자 (甲~癸)
  yearBranch: string; // 한자 (子~亥)
  monthStem: string;
  monthBranch: string;
  dayStem: string;
  dayBranch: string;
  hourStem: string;
  hourBranch: string;
  isLeapMonth?: boolean;
}

// ---------- 내부 궁 구조 ----------

interface PalaceBuild {
  branchIdx: number; // 지지 인덱스 (0=子 ~ 11=亥)
  stem: string;      // 천간 (한자)
  branch: string;    // 지지 (한자)
  name: string;      // 궁 이름 (한글)
  isBodyPalace: boolean;
  majorStars: ZiweiStar[];
  minorStars: ZiweiStar[];
  adjectiveStars: ZiweiStar[];
  decadalRange: [number, number];
  decadalStem: string;
  decadalBranch: string;
  ages: number[];
}

/**
 * 자미두수 명반을 생성한다.
 */
export function generateChart(input: ChartInput): ZiweiResult {
  const yearStemIdx = stemIndex(input.yearStem);
  const yearBranchIdx = branchIndex(input.yearBranch);
  const shichenIdx = hourToShichenIndex(input.hour);

  // 1. 명궁/신궁 위치
  const mingGongBranch = getMingGongBranch(input.lunarMonth, shichenIdx);
  const shenGongBranch = getShenGongBranch(input.lunarMonth, shichenIdx);

  // 2. 12궁 천간 배치
  const palaceStems = getPalaceStems(input.yearStem);

  // 3. 오행국 결정: 명궁의 천간+지지 납음으로 결정한다
  const mingGongStem = palaceStems[mingGongBranch];
  const juNumber = getWuxingJu(stemIndex(mingGongStem), mingGongBranch);
  const juName = getWuxingJuName(juNumber);

  // 4. 12궁 초기화: 명궁 위치부터 12궁 이름 배치
  // 명궁→형제→부처→…는 지지 역행 방향으로 배치한다
  const palaces: PalaceBuild[] = [];
  for (let i = 0; i < 12; i++) {
    const branchIdx = mod(mingGongBranch - i, 12);
    palaces.push({
      branchIdx,
      stem: palaceStems[branchIdx],
      branch: BRANCHES[branchIdx],
      name: PALACE_NAMES_KR[i],
      isBodyPalace: branchIdx === shenGongBranch,
      majorStars: [],
      minorStars: [],
      adjectiveStars: [],
      decadalRange: [0, 0],
      decadalStem: '',
      decadalBranch: '',
      ages: [],
    });
  }

  // 궁 위치 검색 함수 (지지인덱스 → 궁 배열 인덱스)
  function findPalaceByBranch(branchIdx: number): PalaceBuild {
    const normalized = mod(branchIdx, 12);
    return palaces.find((p) => p.branchIdx === normalized)!;
  }

  // 5. 자미성 위치 결정
  const ziweiPos = getZiweiPosition(juNumber, input.lunarDay);

  // 6. 자미계열 6성 배치
  for (const [starName, offset] of Object.entries(ZIWEI_SERIES_OFFSETS)) {
    const pos = mod(ziweiPos + offset, 12);
    const palace = findPalaceByBranch(pos);
    const brightness = BRIGHTNESS_TABLE[starName]?.[pos];
    palace.majorStars.push({
      name: starName,
      type: 'major',
      brightness: brightness ? brightnessToScore(brightness) : undefined,
    });
  }

  // 7. 천부계열 8성 배치
  const tianfuPos = getTianfuPosition(ziweiPos);
  for (const [starName, offset] of Object.entries(TIANFU_SERIES_OFFSETS)) {
    const pos = mod(tianfuPos + offset, 12);
    const palace = findPalaceByBranch(pos);
    const brightness = BRIGHTNESS_TABLE[starName]?.[pos];
    palace.majorStars.push({
      name: starName,
      type: 'major',
      brightness: brightness ? brightnessToScore(brightness) : undefined,
    });
  }

  // 8. 보성(輔星) 배치
  placeMinorStars(palaces, findPalaceByBranch, input, shichenIdx, yearStemIdx, yearBranchIdx);

  // 9. 사화(四化) 배치
  placeSihua(palaces, input.yearStem);

  // 10. 대한(大限) 계산
  const isYangMale = (yearStemIdx % 2 === 0 && input.gender === 'male');
  const isYinFemale = (yearStemIdx % 2 === 1 && input.gender === 'female');
  const isForward = isYangMale || isYinFemale; // 순행

  calculateDecadals(palaces, juNumber, isForward, mingGongBranch, palaceStems);

  // 11. 소한(小限) 계산
  calculateSmallLimits(palaces, yearBranchIdx);

  // 12. 명주(命主)/신주(身主) 결정
  const soulStar = getSoulStar(mingGongBranch);
  const bodyStar = getBodyStar(yearBranchIdx);

  // 13. 결과 조립
  const solarDateStr = `${input.solarYear}-${input.solarMonth}-${input.solarDay}`;
  const lunarDateStr = `${input.lunarYear}-${input.lunarMonth}-${input.lunarDay}`;

  const yearGanjiKr = STEMS_KR[yearStemIdx] + BRANCHES_KR[yearBranchIdx];
  const monthGanjiKr = STEMS_KR[stemIndex(input.monthStem)] + BRANCHES_KR[branchIndex(input.monthBranch)];
  const dayGanjiKr = STEMS_KR[stemIndex(input.dayStem)] + BRANCHES_KR[branchIndex(input.dayBranch)];
  const hourGanjiKr = STEMS_KR[stemIndex(input.hourStem)] + BRANCHES_KR[branchIndex(input.hourBranch)];
  const chineseDate = `${yearGanjiKr}년 ${monthGanjiKr}월 ${dayGanjiKr}일 ${hourGanjiKr}시`;

  const genderStr = input.gender === 'male' ? '남' : '여';
  const timeStr = SHICHEN_NAMES[shichenIdx];
  const zodiac = ZODIAC_NAMES[yearBranchIdx];
  const sign = getWesternSign(input.solarMonth, input.solarDay);

  // 궁 결과 변환 (순서를 index 0~11로)
  const resultPalaces: ZiweiPalace[] = palaces.map((p, idx) => ({
    index: idx,
    name: p.name,
    heavenlyStem: STEMS_KR[stemIndex(p.stem)],
    earthlyBranch: BRANCHES_KR[branchIndex(p.branch)],
    isBodyPalace: p.isBodyPalace,
    majorStars: p.majorStars,
    minorStars: p.minorStars,
    adjectiveStars: p.adjectiveStars,
    decadal: {
      range: p.decadalRange,
      heavenlyStem: p.decadalStem,
      earthlyBranch: p.decadalBranch,
    },
    ages: p.ages,
  }));

  return {
    solarDate: solarDateStr,
    lunarDate: lunarDateStr,
    chineseDate,
    gender: genderStr,
    time: timeStr,
    zodiac,
    sign,
    fiveElementsClass: juName,
    soulPalaceBranch: BRANCHES_KR[mingGongBranch],
    bodyPalaceBranch: BRANCHES_KR[shenGongBranch],
    soulStar,
    bodyStar,
    palaces: resultPalaces,
  };
}

// ---------- 보성 배치 ----------

function placeMinorStars(
  palaces: PalaceBuild[],
  findPalaceByBranch: (idx: number) => PalaceBuild,
  input: ChartInput,
  shichenIdx: number,
  yearStemIdx: number,
  yearBranchIdx: number,
): void {
  // 좌보: 辰(4)에서 월수만큼 순행
  const zuofu = mod(4 + input.lunarMonth - 1, 12);
  findPalaceByBranch(zuofu).minorStars.push({ name: '좌보', type: 'minor' });

  // 우필: 戌(10)에서 월수만큼 역행
  const youbi = mod(10 - (input.lunarMonth - 1), 12);
  findPalaceByBranch(youbi).minorStars.push({ name: '우필', type: 'minor' });

  // 문창: 戌(10)에서 시진만큼 역행
  const wenchang = mod(10 - shichenIdx, 12);
  findPalaceByBranch(wenchang).minorStars.push({ name: '문창', type: 'minor' });

  // 문곡: 辰(4)에서 시진만큼 순행
  const wenqu = mod(4 + shichenIdx, 12);
  findPalaceByBranch(wenqu).minorStars.push({ name: '문곡', type: 'minor' });

  // 녹존
  const lucunPos = LUCUN_POSITIONS[STEMS[yearStemIdx]];
  findPalaceByBranch(lucunPos).minorStars.push({ name: '녹존', type: 'minor' });

  // 경양: 녹존 + 1
  findPalaceByBranch(mod(lucunPos + 1, 12)).minorStars.push({ name: '경양', type: 'minor' });

  // 타라: 녹존 - 1
  findPalaceByBranch(mod(lucunPos - 1, 12)).minorStars.push({ name: '타라', type: 'minor' });

  // 천괴/천월
  const yearStem = STEMS[yearStemIdx];
  const tiankuiYue = TIANKUI_TIANYUE[yearStem];
  if (tiankuiYue) {
    findPalaceByBranch(tiankuiYue[0]).minorStars.push({ name: '천괴', type: 'minor' });
    findPalaceByBranch(tiankuiYue[1]).minorStars.push({ name: '천월', type: 'minor' });
  }

  // 화성: 년지에 따른 기궁에서 시진만큼 순행
  const huoBase = HUOXING_BASE[yearBranchIdx];
  if (huoBase !== undefined) {
    findPalaceByBranch(mod(huoBase + shichenIdx, 12)).minorStars.push({ name: '화성', type: 'minor' });
  }

  // 령성: 년지에 따른 기궁에서 시진만큼 순행
  const lingBase = LINGXING_BASE[yearBranchIdx];
  if (lingBase !== undefined) {
    findPalaceByBranch(mod(lingBase + shichenIdx, 12)).minorStars.push({ name: '령성', type: 'minor' });
  }

  // 천마
  const tianma = TIANMA_TABLE[yearBranchIdx];
  if (tianma !== undefined) {
    findPalaceByBranch(tianma).minorStars.push({ name: '천마', type: 'minor' });
  }

  // 지겁(地劫): 亥(11)에서 시진만큼 순행
  const dikong = mod(11 + shichenIdx, 12);
  findPalaceByBranch(dikong).minorStars.push({ name: '지겁', type: 'minor' });

  // 지공(地空): 亥(11)에서 시진만큼 역행
  const tiankong = mod(11 - shichenIdx, 12);
  findPalaceByBranch(tiankong).minorStars.push({ name: '지공', type: 'minor' });
}

// ---------- 사화 배치 ----------

function placeSihua(palaces: PalaceBuild[], yearStem: string): void {
  const sihua = SIHUA_TABLE[yearStem];
  if (!sihua) return;

  for (let i = 0; i < 4; i++) {
    const targetStarName = sihua[i];
    const mutagenType = SIHUA_TYPES[i];

    // 모든 궁에서 해당 성을 찾아 mutagen 부여
    for (const palace of palaces) {
      for (const star of [...palace.majorStars, ...palace.minorStars]) {
        if (star.name === targetStarName && !star.mutagen) {
          star.mutagen = mutagenType;
          break;
        }
      }
    }
  }
}

// ---------- 대한 계산 ----------

function calculateDecadals(
  palaces: PalaceBuild[],
  juNumber: number,
  isForward: boolean,
  mingGongBranch: number,
  palaceStems: string[],
): void {
  // 대한 시작 나이 = 오행국수
  const startAge = juNumber;
  const direction = isForward ? 1 : -1;

  for (let i = 0; i < 12; i++) {
    // 대한 궁은 명궁에서 순행/역행
    const branchIdx = mod(mingGongBranch + direction * i, 12);
    const palace = palaces.find((p) => p.branchIdx === branchIdx);
    if (palace) {
      const decadeStart = startAge + i * 10;
      const decadeEnd = decadeStart + 9;
      palace.decadalRange = [decadeStart, decadeEnd];
      palace.decadalStem = STEMS_KR[stemIndex(palaceStems[branchIdx])];
      palace.decadalBranch = BRANCHES_KR[branchIdx];
    }
  }
}

// ---------- 소한 계산 ----------

function calculateSmallLimits(
  palaces: PalaceBuild[],
  yearBranchIdx: number,
): void {
  // 소한 시작궁: 년지에 따라 다름
  // 寅午戌→辰(4), 申子辰→戌(10), 巳酉丑→未(7), 亥卯未→丑(1)
  let startBranch: number;
  if ([2, 6, 10].includes(yearBranchIdx)) {
    startBranch = 4;  // 辰
  } else if ([8, 0, 4].includes(yearBranchIdx)) {
    startBranch = 10; // 戌
  } else if ([5, 9, 1].includes(yearBranchIdx)) {
    startBranch = 7;  // 未
  } else {
    startBranch = 1;  // 丑
  }

  // 1세부터 시작, 12궁을 순행하며 나이 배정
  // 소한은 남녀 관계없이 순행 (일부 유파 차이 있으나 기본 순행)
  for (let age = 1; age <= 120; age++) {
    const offset = (age - 1) % 12;
    const branchIdx = mod(startBranch + offset, 12);
    const palace = palaces.find((p) => p.branchIdx === branchIdx);
    if (palace) {
      palace.ages.push(age);
    }
  }
}

// ---------- 명주(命主) ----------

function getSoulStar(mingGongBranchIdx: number): string {
  // 명궁 지지 → 명주성
  const soulStarMap: Record<number, string> = {
    0: '탐랑',  // 子
    1: '거문',  // 丑
    2: '녹존',  // 寅
    3: '문곡',  // 卯
    4: '염정',  // 辰
    5: '무곡',  // 巳
    6: '파군',  // 午
    7: '무곡',  // 未
    8: '염정',  // 申
    9: '문곡',  // 酉
    10: '녹존', // 戌
    11: '거문', // 亥
  };
  return soulStarMap[mingGongBranchIdx] ?? '';
}

// ---------- 신주(身主) ----------

function getBodyStar(yearBranchIdx: number): string {
  // 년지 → 신주성
  const bodyStarMap: Record<number, string> = {
    0: '화성',  // 子 -- 아니 일반적으로:
    // 子午→령성, 丑未→천상, 寅申→천동, 卯酉→문창, 辰戌→천기, 巳亥→천량
    // 더 일반적인 매핑:
  };
  // 정확한 신주 매핑
  const map: Record<number, string> = {
    0: '령성',  // 子
    6: '령성',  // 午
    1: '천상',  // 丑
    7: '천상',  // 未
    2: '천동',  // 寅
    8: '천동',  // 申
    3: '문창',  // 卯
    9: '문창',  // 酉
    4: '천기',  // 辰
    10: '천기', // 戌
    5: '천량',  // 巳
    11: '천량', // 亥
  };
  void bodyStarMap;
  return map[yearBranchIdx] ?? '';
}

// ---------- 공개 API: 양력 입력 ----------

/**
 * 양력 날짜로 자미두수 명반을 생성한다.
 */
export function calculateZiweiSelf(
  solarDate: string,
  hour: number,
  gender: 'male' | 'female',
): ZiweiResult {
  const [solarYear, solarMonth, solarDay] = solarDate.split('-').map(Number);

  // 양력 → 음력 변환
  const lunar = ManseryeokEngine.solarToLunar({
    year: solarYear,
    month: solarMonth,
    day: solarDay,
  });

  // 간지 계산
  const ganji = ManseryeokEngine.getGanji({
    year: solarYear,
    month: solarMonth,
    day: solarDay,
    hour,
  });

  return generateChart({
    lunarYear: lunar.year,
    lunarMonth: lunar.month,
    lunarDay: lunar.day,
    hour,
    gender,
    solarYear,
    solarMonth,
    solarDay,
    yearStem: ganji.year.gan,
    yearBranch: ganji.year.ji,
    monthStem: ganji.month.gan,
    monthBranch: ganji.month.ji,
    dayStem: ganji.day.gan,
    dayBranch: ganji.day.ji,
    hourStem: ganji.hour.gan,
    hourBranch: ganji.hour.ji,
    isLeapMonth: lunar.isLeapMonth,
  });
}

// ---------- 공개 API: 음력 입력 ----------

/**
 * 음력 날짜로 자미두수 명반을 생성한다.
 */
export function calculateZiweiByLunarSelf(
  lunarDate: string,
  hour: number,
  gender: 'male' | 'female',
  isLeapMonth = false,
): ZiweiResult {
  const [lunarYear, lunarMonth, lunarDay] = lunarDate.split('-').map(Number);

  // 음력 → 양력 변환
  const solar = ManseryeokEngine.lunarToSolar({
    year: lunarYear,
    month: lunarMonth,
    day: lunarDay,
    isLeapMonth,
  });

  // 간지 계산 (양력 기준)
  const ganji = ManseryeokEngine.getGanji({
    year: solar.year,
    month: solar.month,
    day: solar.day,
    hour,
  });

  return generateChart({
    lunarYear,
    lunarMonth,
    lunarDay,
    hour,
    gender,
    solarYear: solar.year,
    solarMonth: solar.month,
    solarDay: solar.day,
    yearStem: ganji.year.gan,
    yearBranch: ganji.year.ji,
    monthStem: ganji.month.gan,
    monthBranch: ganji.month.ji,
    dayStem: ganji.day.gan,
    dayBranch: ganji.day.ji,
    hourStem: ganji.hour.gan,
    hourBranch: ganji.hour.ji,
    isLeapMonth,
  });
}
