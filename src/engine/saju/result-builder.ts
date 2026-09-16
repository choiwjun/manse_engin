import type {
  BirthInputData,
  Gyeokguk,
  NaeumOhaeng,
  NaeumOhaengSet,
  Palja,
  SajuResult,
  SajuSubSchool,
  Wolun,
  Yongsin,
} from '@/engine/types';
import { calculatePalja, type CalculateOptions } from '@/engine/saju/calculator';
import { calculateDaeun, calculateSeun, calculateWolun } from '@/engine/saju/daeun';
import { determineGyeokguk } from '@/engine/saju/gyeokguk';
import { calculateSipsin, calculateJijangganSipsin, calculateUnsung, extractJijanggan } from '@/engine/saju/sipsin';
import {
  analyzeJijiRelations,
  calculateGongmang,
  calculateSinsal,
  getNaeumOhaeng,
} from '@/engine/saju/sinsal';
import { analyzeWonjin } from '@/engine/saju/wonjin';
import { determineYongsin, determineYongsinBySchool, assessDayganStrength } from '@/engine/saju/yongsin';

const EMPTY_PALJA: Palja = {
  yearGan: '',
  yearJi: '',
  monthGan: '',
  monthJi: '',
  dayGan: '',
  dayJi: '',
  hourGan: '',
  hourJi: '',
};

const EMPTY_GYEOKGUK: Gyeokguk = {
  name: '',
  hanja: '',
  description: '',
};

const EMPTY_YONGSIN: Yongsin = {
  yongsin: '',
  gisin: '',
  ohaeng: '목',
  reasoning: '',
};

const EMPTY_WOLUN: Wolun = {
  gan: '',
  ji: '',
};

const EMPTY_NAEUM: NaeumOhaeng = {
  name: '',
  hanja: '',
  ohaeng: '',
};

function buildNaeum(palja: Palja): NaeumOhaengSet {
  return {
    year: getNaeumOhaeng(palja.yearGan, palja.yearJi),
    month: getNaeumOhaeng(palja.monthGan, palja.monthJi),
    day: getNaeumOhaeng(palja.dayGan, palja.dayJi),
    hour:
      palja.hourGan && palja.hourJi
        ? getNaeumOhaeng(palja.hourGan, palja.hourJi)
        : null,
  };
}

export function buildSajuResult(
  input: BirthInputData,
  options?: {
    calculateOptions?: CalculateOptions;
    now?: Date;
    subSchool?: SajuSubSchool;
  },
): SajuResult {
  const now = options?.now ?? new Date();
  const subSchool = options?.subSchool ?? 'gyeokguk';
  const palja = calculatePalja(input, options?.calculateOptions);
  const gyeokguk = determineGyeokguk(palja);

  return {
    palja,
    sipsin: calculateSipsin(palja),
    jijangganSipsin: calculateJijangganSipsin(palja),
    unsung: calculateUnsung(palja),
    jijanggan: extractJijanggan(palja),
    // asOf — 이 결과의 해석 기준 시각. assembleReport가 now 없이 호출돼도 이 시각을 기준으로 삼아 재현성이 보장된다.
    asOf: now.toISOString(),
    daeun: calculateDaeun(palja, input, 8, options?.calculateOptions, now),
    seun: calculateSeun(now),
    wolun: calculateWolun(now),
    sinsal: calculateSinsal(palja),
    jijiRelations: analyzeJijiRelations(palja),
    gongmang: calculateGongmang(palja),
    naeum: buildNaeum(palja),
    wonjin: analyzeWonjin(palja.yearJi, palja.monthJi, palja.dayJi, palja.hourJi),
    gyeokguk,
    yongsin: determineYongsin(palja, gyeokguk, subSchool),
    // 4학파 용신 스프레드 — 학파 차이를 숨기지 않고 나란히 노출
    yongsinBySchool: determineYongsinBySchool(palja, gyeokguk),
    // 점수제 강약 — 점유율 계량(meter)과 별개 모델. 리포트에서 병기한다.
    strengthAssessment: assessDayganStrength(palja) ?? undefined,
  };
}

export function normalizeSajuResult(value: unknown): SajuResult | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const source = value as Partial<SajuResult>;
  if (!source.palja || typeof source.palja !== 'object') {
    return null;
  }

  const palja = { ...EMPTY_PALJA, ...source.palja };
  const gyeokguk = source.gyeokguk
    ? { ...EMPTY_GYEOKGUK, ...source.gyeokguk }
    : EMPTY_GYEOKGUK;
  const yongsin = source.yongsin
    ? { ...EMPTY_YONGSIN, ...source.yongsin }
    : EMPTY_YONGSIN;

  return {
    palja,
    sipsin: source.sipsin ?? {},
    jijangganSipsin: source.jijangganSipsin ?? {},
    unsung: source.unsung ?? {},
    jijanggan: source.jijanggan ?? {},
    asOf: typeof source.asOf === 'string' ? source.asOf : undefined,
    daeun: source.daeun ?? [],
    seun: source.seun ?? { gan: '', ji: '' },
    wolun: source.wolun ?? EMPTY_WOLUN,
    sinsal: source.sinsal ?? [],
    jijiRelations: source.jijiRelations ?? [],
    gongmang: source.gongmang ?? [],
    naeum: source.naeum ?? {
      year: EMPTY_NAEUM,
      month: EMPTY_NAEUM,
      day: EMPTY_NAEUM,
      hour: null,
    },
    wonjin: source.wonjin ?? { hasWonjin: false, pairs: [] },
    gyeokguk,
    yongsin,
    yongsinBySchool: source.yongsinBySchool,
    strengthAssessment: source.strengthAssessment,
  };
}
