import type {
  BirthInputData,
  Gyeokguk,
  NaeumOhaeng,
  NaeumOhaengSet,
  Palja,
  PractitionerOverride,
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

const SCHOOL_KR: Record<SajuSubSchool, string> = {
  gyeokguk: '격국',
  johu: '조후',
  gangyak: '강약',
  mulsang: '물상',
};

/**
 * 역술인 최종 판정을 적용해 새 SajuResult를 만든다.
 *
 * 엔진이 학파 스프레드·격국 후보를 제시하면, 역술인이 그중 하나를 채택하거나
 * 직접 오행·격국을 지정한다. 반환된 결과는 용신·격국이 교체되므로 이후
 * timing 판정(judgeOhaeng)·detector·리포트가 모두 수정값 기준으로 일관되게 돌아간다.
 *
 * 우선순위: yongsinOhaeng(직접 지정) > yongsinSchool(학파 채택) > 격국 변경만 있으면 기본 학파 재계산.
 */
export function applyPractitionerOverride(
  result: SajuResult,
  override: PractitionerOverride,
): SajuResult {
  const next: SajuResult = { ...result, practitionerOverride: override };
  const gyeokgukChanged = Boolean(override.gyeokgukName && override.gyeokgukName !== result.gyeokguk.name);

  // 격국 수정 — 후보 목록에서 찾거나, 없으면 직접 지정으로 표기한다
  if (gyeokgukChanged) {
    const candidate = result.gyeokguk.candidates?.find((c) => c.name === override.gyeokgukName);
    next.gyeokguk = candidate
      ? { ...candidate, basis: [...(candidate.basis ?? []), '역술인 최종 선택'] }
      : {
          name: override.gyeokgukName!,
          hanja: '',
          description: '',
          confidence: '참고',
          basis: ['역술인 최종 선택 — 엔진 후보 목록에 없는 직접 지정'],
          blockers: [],
        };
    // 격국이 바뀌면 격국학파 용신도 달라지므로 스프레드를 재계산한다
    next.yongsinBySchool = determineYongsinBySchool(result.palja, next.gyeokguk);
  }

  // 용신 수정
  if (override.yongsinOhaeng) {
    next.yongsin = {
      yongsin: `${override.yongsinOhaeng}(역술인 선택)`,
      gisin: override.gisinOhaeng ? `${override.gisinOhaeng}(역술인 선택)` : result.yongsin.gisin,
      ohaeng: override.yongsinOhaeng,
      reasoning: `역술인 최종 선택 — 용신 ${override.yongsinOhaeng}${override.note ? `, 메모: ${override.note}` : ''}`,
    };
  } else if (override.yongsinSchool && next.yongsinBySchool?.[override.yongsinSchool]) {
    const picked = next.yongsinBySchool[override.yongsinSchool]!;
    next.yongsin = {
      ...picked,
      reasoning: `${picked.reasoning} — 역술인이 ${SCHOOL_KR[override.yongsinSchool]}학파 판정을 최종 채택${override.note ? ` (메모: ${override.note})` : ''}`,
    };
  } else if (gyeokgukChanged) {
    // 격국만 바꾼 경우 기본 학파(격국용신)로 최종 용신을 재계산한다
    next.yongsin = determineYongsin(result.palja, next.gyeokguk, 'gyeokguk');
  }

  return next;
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
    practitionerOverride: source.practitionerOverride,
  };
}
