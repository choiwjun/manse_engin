// 작명 해석 계층 — 작명 계산(NamingResult)을 소비해 상담 등급의 이름 해석을 만든다.
// 사주·궁합 해석 계층과 같은 품질 규칙: 근거는 1층 facts(수리·오행·길흉),
// 문장은 이름을 단정하지 않는 운영 가이드 톤.

import type { NamingAnalysis, NamingResult, SajuResult } from '@/engine/types';
import { measureOhaeng } from './meter';
import { getContentEntry } from './content';

/** content DB 문구 — naming/* 키의 body.short를 읽고, 없으면 fallback */
function phrase(key: string, fallback: string): string {
  const short = getContentEntry(key)?.body?.short;
  return typeof short === 'string' && short.trim().length >= 5 ? short.trim() : fallback;
}

export interface NamingLine {
  /** 해석 축 라벨 ('사격 흐름', '오행 조화', '수리 길흉', '발음오행') */
  label: string;
  text: string;
}

export interface NamingInterpretation {
  /** '{이름} — {총점}점 {등급} ({구조 요약})' */
  headline: string;
  /** 이름 구조 해석 — 사격·수리·오행·발음 */
  lines: NamingLine[];
  /** 잘 되는 축 */
  strengths: string[];
  /** 주의 축 */
  cautions: string[];
  /** 운영 가이드 — 주의 축에 대응하는 행동 규칙 */
  guidance: string[];
}

export interface InterpretNamingOptions {
  /** 문서에 쓸 성 표기 (기본: 결과의 surname) */
  surnameLabel?: string;
}

/** 수리 길흉 요약 — 4격 중 길/흉 개수와 주요 흉격 위치 */
function suriSummary(a: NamingAnalysis): { gil: number; hyung: number; hyungPos: string[] } {
  const pos: string[] = [];
  let gil = 0;
  let hyung = 0;
  if (a.suri81.won.gilhyung === '길') gil += 1; else if (a.suri81.won.gilhyung === '흉') { hyung += 1; pos.push('원격(초년)'); }
  if (a.suri81.hyeong.gilhyung === '길') gil += 1; else if (a.suri81.hyeong.gilhyung === '흉') { hyung += 1; pos.push('형격(청년)'); }
  if (a.suri81.yi.gilhyung === '길') gil += 1; else if (a.suri81.yi.gilhyung === '흉') { hyung += 1; pos.push('이격(중년)'); }
  if (a.suri81.jeong.gilhyung === '길') gil += 1; else if (a.suri81.jeong.gilhyung === '흉') { hyung += 1; pos.push('정격(말년)'); }
  return { gil, hyung, hyungPos: pos };
}

/** 오행 관계 요약 — 상생/상극/비화 쌍 수와 상극 위치 */
function ohaengSummary(a: NamingAnalysis): { sangsaeng: number; sanggeuk: number; bihwa: number; geukPairs: string[] } {
  let sangsaeng = 0;
  let sanggeuk = 0;
  let bihwa = 0;
  const geukPairs: string[] = [];
  for (const p of a.ohaengRelation.pairs) {
    if (p.relation === '상생') sangsaeng += 1;
    else if (p.relation === '상극') { sanggeuk += 1; geukPairs.push(`${p.first}→${p.second}`); }
    else bihwa += 1;
  }
  return { sangsaeng, sanggeuk, bihwa, geukPairs };
}

/** 총점 → 등급 라벨 */
function scoreGrade(score: number): string {
  if (score >= 85) return '상';
  if (score >= 70) return '중상';
  if (score >= 55) return '중';
  if (score >= 40) return '중하';
  return '하';
}

/** 단일 이름 해석 */
export function interpretName(analysis: NamingAnalysis, surname: string): NamingInterpretation {
  const fullName = surname + analysis.name;
  const suri = suriSummary(analysis);
  const ohaeng = ohaengSummary(analysis);
  const grade = scoreGrade(analysis.totalScore);

  const lines: NamingLine[] = [];
  const strengths: string[] = [];
  const cautions: string[] = [];
  const guidance: string[] = [];

  // 사격 흐름 — 원형이정 4격 수치와 길흉 분포
  const wonhyeongText = `원격 ${analysis.wonhyeong.won} · 형격 ${analysis.wonhyeong.hyeong} · 이격 ${analysis.wonhyeong.yi} · 정격 ${analysis.wonhyeong.jeong}`;
  if (suri.hyung === 0) {
    lines.push({ label: '사격 흐름', text: `${wonhyeongText} — ${phrase('naming/structure/suri-all-gil', '4격이 모두 길수(吉數)로 잡힌 구조입니다. 초년부터 말년까지 수리의 흐름이 안정적입니다.')}` });
    strengths.push('사격 4격이 모두 길수로 잡혀 수리 흐름이 안정적입니다.');
  } else {
    lines.push({
      label: '사격 흐름',
      text: `${wonhyeongText} — ${suri.hyungPos.join('·')}에 흉수가 있습니다. 해당 시기의 흐름이 약할 수 있으니 그 시기의 결정은 다른 근거를 더 보는 것이 좋습니다.`,
    });
    cautions.push(`${suri.hyungPos.join('·')}에 흉수가 있어 해당 시기의 수리 흐름이 약합니다.`);
    guidance.push(phrase('naming/structure/suri-has-hyung', '흉수가 있는 격의 시기에는 큰 결정을 다른 근거(사주 운세 등)와 함께 보는 것이 안전합니다.'));
  }

  // 오행 조화 — 발음오행 인접 관계
  const ohaengText = `발음오행 ${analysis.balumOhaeng.join('·')} — 상생 ${ohaeng.sangsaeng}쌍 · 상극 ${ohaeng.sanggeuk}쌍 · 비화 ${ohaeng.bihwa}쌍`;
  if (ohaeng.sanggeuk === 0) {
    lines.push({ label: '오행 조화', text: `${ohaengText} — ${phrase('naming/structure/ohaeng-sangsaeng', '인접 글자가 서로 밀거나 부딪히지 않는 조화입니다. 이름이 주는 첫인상·발음의 흐름이 순합니다.')}` });
    strengths.push('발음오행이 인접 글자 간 상극 없이 조화를 이룹니다.');
  } else {
    lines.push({
      label: '오행 조화',
      text: `${ohaengText} — ${ohaeng.geukPairs.join('·')}에서 상극이 일어납니다. 발음의 흐름이 끊기거나 부딪히는 느낌이 있을 수 있습니다.`,
    });
    cautions.push(`발음오행 ${ohaeng.geukPairs.join('·')}에서 상극이 일어나 발음 흐름이 끊깁니다.`);
    guidance.push(phrase('naming/structure/ohaeng-sanggeuk', '상극이 있는 글자 자리의 발음을 부드럽게 바꾸거나, 다른 후보와 비교해 상극이 없는 쪽을 우선 고려하는 것이 좋습니다.'));
  }

  // 수리오행 분포 — 같은 오행 편중 여부
  const suriOhaengSet = new Set(analysis.suriOhaeng);
  if (suriOhaengSet.size === 1) {
    const only = analysis.suriOhaeng[0];
    lines.push({ label: '수리오행', text: `수리오행이 ${only} 하나로 편중되어 있습니다. 한 방향의 기운이 강한 이름이라, 사주에서 그 오행이 필요한 경우에는 보완 효과가 크지만 이미 충분하면 과할 수 있습니다.` });
    cautions.push(`수리오행이 ${only} 하나로 편중되어 한 방향의 기운이 강합니다.`);
    guidance.push(phrase('naming/structure/suri-ohaeng-skew', '수리오행이 한 방향으로 편중된 이름은 사주의 용신·기신과 대조해 보완인지 과잉인지 확인하는 것이 좋습니다.'));
  } else {
    lines.push({ label: '수리오행', text: `수리오행 ${analysis.suriOhaeng.join('·')} — ${phrase('naming/structure/suri-ohaeng-mixed', `${suriOhaengSet.size}종이 섞여 있어 한 방향으로 치우치지 않는 분포입니다.`)}` });
    strengths.push('수리오행이 한 방향으로 치우치지 않는 분포입니다.');
  }

  // 총점 기반 종합 가이드 — 등급별 문구는 content DB(naming/grade/*) 우선
  if (analysis.totalScore >= 85) {
    guidance.push(phrase('naming/grade/sang', '총점이 높은 이름입니다. 사주의 용신 오행과 발음·수리오행이 맞물리는지만 확인하면 바로 쓸 수 있는 수준입니다.'));
  } else if (analysis.totalScore >= 70) {
    guidance.push(phrase('naming/grade/jungsang', '총점이 무난한 이름입니다. 위에 적힌 주의 축 하나만 보완하면 쓸 만한 수준입니다.'));
  } else if (analysis.totalScore >= 55) {
    guidance.push(phrase('naming/grade/jung', '총점이 중간인 이름입니다. 흉수 위치와 상극 자리를 다른 후보와 비교해 보완된 쪽을 우선 고려하는 것이 좋습니다.'));
  } else if (analysis.totalScore >= 40) {
    guidance.push(phrase('naming/grade/jungha', '총점이 낮은 이름입니다. 흉수 위치와 상극 자리를 다른 후보와 비교해 보완된 쪽을 우선 고려하는 것이 좋습니다.'));
  } else {
    guidance.push(phrase('naming/grade/ha', '총점이 매우 낮은 이름입니다. 수리·오행 구조가 모두 약하니, 다른 후보를 우선 검토하는 것이 좋습니다.'));
  }

  const headline = `${fullName} — ${analysis.totalScore}점 ${grade} (${suri.hyung === 0 ? '4격 길수' : `${suri.hyung}격 흉수`} · 상극 ${ohaeng.sanggeuk}쌍)`;

  return { headline, lines, strengths, cautions, guidance };
}

/** 여러 후보 비교 해석 — 각 후보를 interpretName으로 돌리고 순위 요약을 붙인다 */
export function interpretNaming(result: NamingResult, opts: InterpretNamingOptions = {}): NamingInterpretation[] {
  const surname = opts.surnameLabel ?? result.surname;
  return result.candidates.map((c) => interpretName(c, surname));
}

// ---------- 사주 교차 — 이름 오행이 사주의 빈 곳/용신과 맞물리는지 ----------

/** 이름의 대표 오행 — 수리오행 다수결, 동률이면 발음오행 첫 글자 */
function dominantOhaeng(a: NamingAnalysis): string | null {
  const freq = new Map<string, number>();
  for (const o of a.suriOhaeng) freq.set(o, (freq.get(o) ?? 0) + 1);
  let best: string | null = null;
  let bestN = 0;
  for (const [o, n] of freq) {
    if (n > bestN) { best = o; bestN = n; }
  }
  return best ?? a.balumOhaeng[0] ?? null;
}

/** 사주와 이름의 오행 교차 해석 — 이름이 사주의 결핍·용신을 메우는지, 기신을 키우는지 */
export function interpretNameWithSaju(
  analysis: NamingAnalysis,
  surname: string,
  saju: SajuResult,
): NamingInterpretation {
  const base = interpretName(analysis, surname);
  const meter = measureOhaeng(saju);
  const nameOhaeng = dominantOhaeng(analysis);
  const yongsin = saju.yongsin.ohaeng;
  const gisin = saju.yongsin.gisin.split('(')[0].trim();
  const missing = meter.distribution.filter((d) => d.percent < 5).map((d) => d.ohaeng);

  if (!nameOhaeng) return base;

  const lines = [...base.lines];
  const strengths = [...base.strengths];
  const cautions = [...base.cautions];
  const guidance = [...base.guidance];

  // 이름 오행이 사주 결핍 축을 메우는지
  if (missing.includes(nameOhaeng)) {
    lines.push({
      label: '사주 보완',
      text: `이름의 대표 오행 ${nameOhaeng}이(가) 사주에서 비어 있는 축(${missing.join('·')})을 메웁니다. 이름이 사주의 빈 곳을 보완하는 구조라, 부를 때마다 결핍 축이 채워지는 효과가 있습니다.`,
    });
    strengths.push(`이름 오행 ${nameOhaeng}이(가) 사주의 결핍 축(${missing.join('·')})을 메웁니다.`);
    guidance.push('이 이름은 사주의 빈 곳을 메우는 보완형 이름입니다. 결핍 축의 영역(관계·재물·지위·배움 중 해당하는 쪽)에서 보완 효과를 기대할 수 있습니다.');
  } else if (nameOhaeng === yongsin) {
    lines.push({
      label: '사주 보완',
      text: `이름의 대표 오행 ${nameOhaeng}이(가) 사주의 용신 오행과 같습니다. 이름이 용신 방향을 돕는 구조라, 부를 때마다 용신 기운이 더해지는 효과가 있습니다.`,
    });
    strengths.push(`이름 오행 ${nameOhaeng}이(가) 용신 오행과 같아 용신 방향을 돕습니다.`);
    guidance.push('이 이름은 용신 방향을 돕는 이름입니다. 사주의 활용점을 이름이 한 번 더 받쳐주는 구조입니다.');
  } else if (nameOhaeng === gisin) {
    lines.push({
      label: '사주 보완',
      text: `이름의 대표 오행 ${nameOhaeng}이(가) 사주의 기신 오행과 같습니다. 이름이 기신 방향을 키우는 구조라, 사주의 균형을 깨뜨릴 수 있으니 다른 오행의 후보를 우선 고려하는 것이 좋습니다.`,
    });
    cautions.push(`이름 오행 ${nameOhaeng}이(가) 기신 오행과 같아 기신 방향을 키웁니다.`);
    guidance.push('이 이름은 기신 방향을 키우는 이름입니다. 사주 균형을 위해 용신 또는 결핍 축의 오행을 가진 후보를 우선 고려하는 것이 좋습니다.');
  } else {
    lines.push({
      label: '사주 보완',
      text: `이름의 대표 오행 ${nameOhaeng}은(는) 사주의 용신·기신·결핍 축과 직접 맞물리지 않는 중간 오행입니다. 이름이 사주 균형을 크게 돕지도 해치지도 않는 중립 구조입니다.`,
    });
  }

  const headlineSuffix = missing.includes(nameOhaeng)
    ? ' · 사주 결핍 보완'
    : nameOhaeng === yongsin
      ? ' · 용신 방향'
      : nameOhaeng === gisin
        ? ' · 기신 방향'
        : '';

  return {
    headline: base.headline + headlineSuffix,
    lines,
    strengths,
    cautions,
    guidance,
  };
}

/** 사주 교차 포함 여러 후보 비교 */
export function interpretNamingWithSaju(
  result: NamingResult,
  saju: SajuResult,
  opts: InterpretNamingOptions = {},
): NamingInterpretation[] {
  const surname = opts.surnameLabel ?? result.surname;
  return result.candidates.map((c) => interpretNameWithSaju(c, surname, saju));
}
