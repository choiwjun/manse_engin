import type { BirthInputData, NamingResultExtended, Ohaeng, SajuSubSchool, StrokeSchool } from '@/engine/types';
import { buildSajuResult } from '@/engine/saju/result-builder';
import { ManseryeokRangeError } from '@/engine/core/errors';
import { validateEngineModuleInput } from '@/engine/contracts/validate';
import { analyzeNameExtended } from './index';
import { lookupHanja, matchesHanjaReading } from './jawon-ohaeng';
import { NAMING_POLICY } from './policy';

export interface RecommendationBasis {
  targetElement: Ohaeng;
  yongsinSchool: string;
  considered: number;
  reasons: string[];
}
export interface NamingRecommendationInput {
  mode?: 'recommend';
  surname: string;
  surnameHanja: string;
  birth: BirthInputData;
  school?: StrokeSchool;
  yongsinSchool?: SajuSubSchool;
  /** 희망하는 한글 이름. 없으면 제한된 후보군에서 두 음절 이름을 생성. */
  givenName?: string;
  limit?: number;
}

// 의미가 비교적 명료한 작은 편집 후보군. 법적 인명 허용 목록이 아니다.
// 독음/자원오행은 프로젝트 사전, 획수는 별도 버전 고정 원자료를 사용한다.
const CATALOG: ReadonlyArray<readonly [string, string]> = [
  ['林', '수풀'], ['松', '소나무'], ['梅', '매화'], ['秀', '빼어나다'], ['英', '꽃부리'],
  ['花', '꽃'], ['榮', '영화롭다'], ['桐', '오동나무'], ['蘭', '난초'], ['楠', '녹나무'],
  ['明', '밝다'], ['昊', '하늘'], ['晟', '밝다'], ['昭', '밝다'], ['晏', '편안하다'],
  ['旭', '아침 해'], ['暉', '빛'], ['熙', '빛나다'], ['炫', '빛나다'], ['晶', '맑다'],
  ['安', '편안하다'], ['宇', '집'], ['宥', '너그럽다'], ['恩', '은혜'], ['垠', '언덕'],
  ['均', '고르다'], ['坤', '땅'], ['圭', '서옥'], ['城', '성'], ['宸', '집'],
  ['瑞', '상서롭다'], ['珍', '보배'], ['瑛', '옥빛'], ['玉', '옥'], ['錦', '비단'],
  ['銀', '은'], ['鉉', '솥귀'], ['銘', '새기다'], ['鈺', '보배'], ['璟', '옥빛'],
  ['河', '강'], ['海', '바다'], ['洙', '물 이름'], ['潤', '윤택하다'], ['浩', '넓다'],
  ['源', '근원'], ['清', '맑다'], ['淑', '맑다'], ['澄', '맑다'], ['洋', '큰 바다'],
  ['智', '지혜'], ['賢', '어질다'], ['俊', '준수하다'], ['祐', '돕다'], ['允', '진실하다'],
  ['仁', '어질다'], ['善', '착하다'], ['正', '바르다'], ['志', '뜻'], ['成', '이루다'],
];

export function recommendNames(input: NamingRecommendationInput): NamingResultExtended {
  if (!input || typeof input !== 'object') throw new ManseryeokRangeError('작명 추천 입력이 필요합니다.', {});
  const { surname, surnameHanja, birth } = input;
  const school = input.school ?? 'kangxi';
  const yongsinSchool = input.yongsinSchool ?? 'gyeokguk';
  const limit = input.limit ?? 6;
  if (!/^[가-힣]{1,2}$/.test(surname) || typeof surnameHanja !== 'string'
    || [...surnameHanja].length !== [...surname].length) {
    throw new ManseryeokRangeError('한글 성과 각 글자의 한자 성을 입력하세요.', {});
  }
  if (!['kangxi', 'modern'].includes(school) || !['gyeokguk', 'johu', 'gangyak', 'mulsang'].includes(yongsinSchool)
    || !Number.isInteger(limit) || limit < 1 || limit > 6) {
    throw new ManseryeokRangeError('획수·용신 기준 및 추천 개수(1~6)를 확인하세요.', {});
  }
  const surnameChars = [...surnameHanja];
  surnameChars.forEach((ch, i) => {
    if (!matchesHanjaReading(ch, [...surname][i])) throw new ManseryeokRangeError('등록된 한자 성과 독음을 확인하세요.', { char: ch });
  });
  if (input.givenName !== undefined && !/^[가-힣]{1,2}$/.test(input.givenName)) {
    throw new ManseryeokRangeError('희망 이름은 한글 1~2음절이어야 합니다.', {});
  }
  validateEngineModuleInput('saju', { birth, now: '2000-01-01T00:00:00.000Z' });
  // 추천에는 출생 명식의 용신만 사용한다. 실행 시각의 운세는 순위에 넣지 않는다.
  const saju = buildSajuResult(birth, { subSchool: yongsinSchool, now: new Date('2000-01-01T00:00:00.000Z') });
  const target = saju.yongsin.ohaeng;
  const desired = input.givenName ? [...input.givenName] : null;
  const pool = CATALOG.flatMap(([char, meaning]) => {
    const entry = lookupHanja(char);
    if (!entry) throw new ManseryeokRangeError('추천 후보의 사전 데이터가 누락되었습니다.', { char });
    return [{ ...entry, meaning }];
  });
  const first = pool.filter(e => !desired || matchesHanjaReading(e.char, desired[0]));
  const second = desired?.length === 1 ? [null] : pool.filter(e => !desired || matchesHanjaReading(e.char, desired[1]));
  const ranked = [];
  let considered = 0;
  for (const a of first) for (const b of second) {
    if (b && (a.char === b.char || (!desired && a.reading === b.reading))) continue;
    const entries = b ? [a, b] : [a];
    const matches = entries.filter(e => e.ohaeng === target).length;
    if (matches === 0) continue;
    const name = desired?.join('') ?? entries.map(e => e.reading).join('');
    const analysis = analyzeNameExtended(surname, name, { hanjaChars: [...surnameChars, ...entries.map(e => e.char)], school });
    considered++;
    ranked.push({ ...analysis, recommendationDetails: {
      targetMatches: matches,
      meanings: entries.map(e => `${e.char}: ${e.meaning}`),
      reason: `이름 ${entries.filter(e => e.ohaeng === target).map(e => e.char).join('·')}의 자원오행이 선택한 용신 ${target}과 같습니다.`,
    } });
  }
  ranked.sort((a, b) => b.recommendationDetails.targetMatches - a.recommendationDetails.targetMatches
    || b.totalScore - a.totalScore
    || (a.hanjaChars!.join('') < b.hanjaChars!.join('') ? -1 : a.hanjaChars!.join('') > b.hanjaChars!.join('') ? 1 : 0));
  return {
    surname, school, policy: NAMING_POLICY, candidates: ranked.slice(0, limit),
    recommendation: { targetElement: target, yongsinSchool, considered, reasons: [
      saju.yongsin.reasoning,
      '이름 글자의 용신 오행 일치 수 → 기존 수리·발음 점수 → 한자 코드 순서로 정렬합니다. 성의 오행은 일치 수에서 제외합니다.',
      '편집 후보군 60자 안에서 조합한 검토용 후보입니다. 의미·발음의 자연스러움과 신고 허용 여부는 최종 선택 전에 확인하세요.',
      ...(birth.hour == null || birth.minute == null ? ['출생시각 미상으로 용신과 추천은 잠정값입니다.'] : []),
    ] },
  };
}
