// 축별 조립기 — 상담 문서의 목차(연애·재물·적성·건강·육친)에 맞춰 해석을 배분한다.
// 감지 패턴(renderPattern 동적 문장) + 1층 facts(궁·십신·계량 수치)를 축별로 엮는다.
// interpretSaju가 "패턴 목록"이라면 assembleReport는 "상담 문서"다.

import type { SajuResult, SajuSubSchool } from '@/engine/types';
import type { DetectedPattern, SipsinGroup } from './types';
import { runDetectors } from './assemble';
import { measureOhaeng, type OhaengMeter } from './meter';
import { renderPattern } from './sentence';
import { groupLabel, groupOfSlot, groupFromOhaeng, posLabel, sipsinNameOfSlot, dayGanOhaeng, SIPSIN_SLOTS, type SipsinSlot } from './sipsin-groups';
import { josa } from './sentence';
import { getOhaengForJi } from '@/engine/adapter/hanja-mapper';
import { buildTimingNarrative, type TimingNarrative } from './narrative';

export type ReportAxis = 'love' | 'wealth' | 'career' | 'health' | 'family';

export interface ReportSection {
  axis: ReportAxis;
  /** 섹션 제목 ('연애·배우자') */
  title: string;
  /** 섹션 한 줄 요약 */
  headline: string;
  /** 동적 문장들 (축 관련 패턴 + 궁 배치 facts) */
  lines: string[];
  /** 이 섹션의 문장의 근거가 된 감지 패턴들 — 렌더러가 DB 심층 문구(body.long)를 붙일 때 사용 */
  patterns: DetectedPattern[];
}

export interface SajuReport {
  /** 격국·강약·용신 기반 헤드라인 */
  headline: string;
  /** 원국 표기 (예: '甲子 丁丑 己酉 壬申', 시각 미상 시 마지막이 '(시각 미상)') */
  paljaLabel: string;
  meter: OhaengMeter;
  /** 축별 섹션 — 상담 문서의 목차 */
  sections: Record<ReportAxis, ReportSection>;
  /** 대운×세운×월운 시점 서사 */
  timing: TimingNarrative;
  /** 감지된 전체 패턴 (우선순위·강도 정렬) — '전체 해설' 섹션 렌더용. 구형 리포트에는 없을 수 있다. */
  patterns?: DetectedPattern[];
  /** 이 명식의 고유 맥락 — 같은 패턴이라도 명식에 따라 다른 해석을 만들기 위한 재료 */
  context: {
    /** 격국 이름 (예: '비견격') */
    gyeokguk: string;
    /** 격국이 속한 십신 묶음 라벨 (예: '비겁') */
    gyeokgukGroup: string;
    /** 용신 오행 (예: '금') */
    yongsin: string;
    /** 용신이 속한 십신 묶음 라벨 (예: '식상') */
    yongsinGroup: string;
    /** 기신 오행 (예: '화') */
    gisin: string;
    /** 일간 강약 라벨 (예: '신약(身弱)') */
    dayMasterVerdict: string;
    /** 용신 판정 근거 — '왜 이 오행이 용신인가'를 상담사가 확인할 수 있게 하는 설명 */
    yongsinReasoning: string;
    /** 용신 판정 학파·방식 (예: '격국용신', '강약용신', '조후용신') */
    yongsinSchool: string;
    /** 격국 신뢰도 — 화격·종격 등 조건이 부분 충족일 때 '유력'/'참고' */
    gyeokgukConfidence?: '확정' | '유력' | '참고';
    /** 격국 성립 근거 */
    gyeokgukBasis?: string[];
    /** 격국 불성립·약화 조건 — 있으면 격국을 확정으로 읽지 않는다 */
    gyeokgukBlockers?: string[];
    /** 일간 강약 계산 모델 — 신강·신약 표기는 이 모델 기준 */
    strengthModel: string;
    /** 용신 계산 모델 — 학파 + 판정 방식 */
    yongsinModel: string;
    /** 두 모델의 관계 — 계량 강약과 용신 판정은 별도 알고리즘 */
    modelNote: string;
    /** 학파별 용신 스프레드 — '격국 금(식상)·조후 화(인성)·강약 수(재성)·물상 금(…)' 형태 */
    yongsinSchoolSpread?: string;
    /** 학파별 판정 상세 — 용신·기신·근거·최종 용신과의 일치 여부 (역술인 검토용) */
    yongsinSchoolDetails?: {
      school: string;
      yongsin: string;
      gisin: string;
      reasoning: string;
      agree: boolean;
    }[];
    /** 차순위 격국 후보 — 특수격 성립 시에도 정격 등 대안을 함께 표기한다 */
    gyeokgukCandidates?: string[];
    /** 역술인 최종 선택 요약 — applyPractitionerOverride 적용 시에만 존재 */
    practitionerChoice?: string;
    /** 학파 합의 — 선택된 용신 오행과 같은 오행을 지목한 학파 수 (예: '4학파 중 2학파') */
    yongsinConsensus?: string;
    /** 점수제 강약 병기 — 득령·득지·득세 가중 모델의 라벨 (점유율 모델과 별개) */
    strengthScoreLabel?: string;
  };
}

export interface AssembleReportOptions {
  /** 성별 — 배우자성(남명 재성/여명 관성)·자녀성 판정에 쓴다. 미지정 시 양쪽을 나열 */
  gender?: 'male' | 'female';
  /** 기준 시각 — 대운 전환 임박 판정에 쓴다 (기본: 현재 시각) */
  now?: Date;
}

const AXIS_TITLES: Record<ReportAxis, string> = {
  love: '연애·배우자',
  wealth: '재물',
  career: '적성·일',
  health: '건강',
  family: '육친',
};

const SIPSIN_PARTNER_LINE: Record<string, string> = {
  비견: '동등한 파트너십을 추구하는 연',
  겁재: '경쟁과 우정이 뒤섞인 강한 연',
  식신: '표현·돌봄이 넘치는 부드러운 연',
  상관: '화술과 재기가 뚜렷한 강한 연',
  편재: '활동적이고 현실 감각 있는 연인상',
  정재: '정직하고 꾸준한 연인상',
  편관: '카리스마와 추진력이 강한 파트너상',
  정관: '책임감 있는 반듯한 파트너상',
  편인: '직관적이고 색다른 파트너상',
  정인: '지혜롭고 따뜻한 파트너상',
};

/** 오행 → 신체 부위 (건강 축) */
const OHAENG_BODY: Record<string, string> = {
  목: '간·담·근관절',
  화: '심장·혈액·시력',
  토: '위·비장·피부',
  금: '폐·기관지·대장',
  수: '신장·방광·호르몬',
};

/** 기둥 궁역 라벨 — 육친 축 */
const PILLAR_REALM: { label: string; realm: string; slots: SipsinSlot[] }[] = [
  { label: '년주', realm: '조상·부모의 배경', slots: ['yearGan', 'yearJi'] },
  { label: '월주', realm: '형제·부모와 사회 입문', slots: ['monthGan', 'monthJi'] },
  { label: '일주', realm: '나 자신과 배우자', slots: ['dayJi'] },
  { label: '시주', realm: '자녀·말년·결실', slots: ['hourGan', 'hourJi'] },
];

function patternSlotsLabels(p: DetectedPattern): string[] {
  return (p.slots ?? []).map((s) => s.label);
}

function patternByKeys(patterns: DetectedPattern[], keys: string[]): DetectedPattern[] {
  return patterns.filter((p) => keys.includes(p.key));
}

/** 패턴 문장 목록(동적) — 순서는 이미 우선순위 정렬되어 들어온다 */
function renderList(patterns: DetectedPattern[], limit = 4): string[] {
  return patterns.slice(0, limit).map((p) => renderPattern(p));
}

/** 슬롯 묶음별 개수·자리 집계 */
function groupSlots(result: SajuResult, group: SipsinGroup): SipsinSlot[] {
  return SIPSIN_SLOTS.filter((slot) => groupOfSlot(result, slot) === group);
}

function sipsinAt(result: SajuResult, slot: SipsinSlot): string | null {
  return sipsinNameOfSlot(result, slot);
}

// ---------- 축별 섹션 빌더 ----------

function buildLoveSection(
  result: SajuResult,
  patterns: DetectedPattern[],
  meter: OhaengMeter,
  opts: AssembleReportOptions,
): ReportSection {
  const lines: string[] = [];
  const dayJiSipsin = sipsinAt(result, 'dayJi');
  const dayJiGlyph = result.palja.dayJi;

  if (dayJiSipsin) {
    lines.push(`배우자궁인 일지에 ${dayJiSipsin}(${dayJiGlyph})${josa(dayJiSipsin, '이가')} 앉아 ${SIPSIN_PARTNER_LINE[dayJiSipsin] ?? '독특한 색깔의 연'}을 연상시키는 전통적 해석을 참고합니다.`);
  } else {
    lines.push('배우자궁인 일지의 십신이 뚜렷하지 않아, 배우자 양상은 대운·세운의 참고 신호와 실제 관계 경험을 함께 살핍니다.');
  }

  // 일지가 관계(합·충·형·해)에 걸려 있으면 그것이 배우자궁의 결
  const dayJiRelations = (result.jijiRelations ?? []).filter((r) => r.positions.includes('dayJi') && ['합', '충', '형', '해'].includes(r.type));
  for (const rel of dayJiRelations.slice(0, 2)) {
    if (rel.type === '합') lines.push(`일지(${dayJiGlyph})가 지지합에 묶인 구조로, 배우자 관계의 결속 가능성을 전통적 해석으로 참고합니다. (${rel.description})`);
    else if (rel.type === '충') lines.push(`일지(${dayJiGlyph})가 충을 이루어 배우자궁의 변동·재정비 가능성을 살펴볼 수 있습니다. (${rel.description})`);
    else if (rel.type === '형') lines.push(`일지(${dayJiGlyph})가 형을 이루어 배우자궁에서는 규칙·약속과 관련한 조율 필요성을 살펴봅니다. (${rel.description})`);
    else if (rel.type === '해') lines.push(`일지(${dayJiGlyph})가 해를 이루어 배우자궁의 미세한 마찰 가능성을 살펴봅니다. (${rel.description})`);
  }

  // 배우자성 — 남명 재성, 여명 관성. 미지정 시 점유율이 큰 축을 예시로 든다
  const partnerGroup: SipsinGroup | null =
    opts.gender === 'male' ? 'jaesung' : opts.gender === 'female' ? 'gwansung' : null;
  if (partnerGroup) {
    const slots = groupSlots(result, partnerGroup);
    const label = groupLabel(partnerGroup);
    if (slots.length > 0) {
      const slotDesc = slots.map((s) => `${posLabel(s)}의 ${sipsinAt(result, s)}`).join('·');
      lines.push(`배우자성(${label})이 ${slots.length}자리로 ${slotDesc}에 있습니다.`);
    } else {
      lines.push(`배우자성(${label})이 명식에 뚜렷하지 않아, 연애·배우자 운은 시점(대운·세운)에 크게 좌우됩니다.`);
    }
  }

  // 도화·홍염 — 매력 지표
  const dohwa = result.sinsal.find((s) => s.name === '도화' || s.name === '홍염');
  if (dohwa) lines.push(`${dohwa.name}(${dohwa.hanja})가 ${posLabel(dohwa.position)}에 있어 인기·매력의 지표가 됩니다.`);

  // 축 관련 감지 패턴 — 일지가 걸린 관계 패턴 + 도화 교차 + 배우자성 공망
  const relevant = patterns.filter((p) => {
    if (p.key.startsWith('saju/cross/sinsal-연살')) return true;
    if (p.key.startsWith('saju/relation/') && patternSlotsLabels(p).includes('일지')) return true;
    if (opts.gender === 'male' && p.key === 'saju/cross/gongmang-jaesung') return true;
    if (opts.gender === 'female' && p.key === 'saju/cross/gongmang-gwansung') return true;
    if (p.key === 'saju/relation/wonjin' && patternSlotsLabels(p).some((l) => l === '일지')) return true;
    return false;
  });
  lines.push(...renderList(relevant, 3));

  // 강약·격국·대운 맥락 — 연애·배우자 운의 방향을 명식 전체 구조와 연결
  const dayMasterWeak = meter.dayMaster.verdict === 'weak';
  const dayMasterStrong = meter.dayMaster.verdict === 'strong';
  const partnerLabel = opts.gender === 'male' ? '재성' : opts.gender === 'female' ? '관성' : '배우자성';
  if (dayMasterWeak) {
    lines.push(`신약으로 분류된 지표에서는 ${partnerLabel}과 관련한 책임·시간·정서의 부담을 생활 점검 항목으로 살펴봅니다 — 실제 관계의 판단은 당사자의 대화와 상황을 우선합니다.`);
  } else if (dayMasterStrong) {
    lines.push(`신강으로 분류된 지표에서는 ${partnerLabel}과 관련한 책임을 주도적으로 맡는 경향이라는 전통적 해석을 참고합니다 — 관계에서는 상대의 의사와 경계를 함께 존중합니다.`);
  }
  const daeunFit = patterns.find((p) => p.key === 'saju/timing/daeun-fit');
  const daeunTension = patterns.find((p) => p.key === 'saju/timing/daeun-tension');
  const daeunMixed = patterns.find((p) => p.key === 'saju/timing/daeun-mixed');
  if (daeunFit) lines.push('현재 대운이 용신 방향이라는 해석을 관계의 참고 신호로 살펴봅니다 — 인연의 폭과 관계의 변화는 당사자의 의사·상황을 함께 확인합니다.');
  else if (daeunTension) lines.push('현재 대운이 기신 방향이라는 해석을 관계의 참고 신호로 살펴봅니다 — 관계의 속도와 정비 여부는 대화·상황·당사자의 의사를 함께 확인합니다.');
  else if (daeunMixed) lines.push('현재 대운이 천간·지지 양축에서 엇갈린다는 해석을 관계의 참고 신호로 살펴봅니다 — 관계가 겉과 속으로 다르게 읽힐 수 있어, 속도는 대화·상황·당사자의 의사를 함께 확인합니다.');

  const headline = `배우자궁 일지 ${dayJiSipsin ? `${dayJiSipsin}(${dayJiGlyph})` : dayJiGlyph} · ${dayJiRelations.length > 0 ? `지지 ${dayJiRelations[0].type} ${dayJiRelations.length}건` : '지지 관계 없음'}`;
  return { axis: 'love', title: AXIS_TITLES.love, headline, lines: dedupe(lines), patterns: relevant };
}

function buildWealthSection(
  result: SajuResult,
  patterns: DetectedPattern[],
  meter: OhaengMeter,
  _opts: AssembleReportOptions,
): ReportSection {
  const lines: string[] = [];
  const jaePercent = meter.groupPercents.jaesung;
  const jaeSlots = groupSlots(result, 'jaesung');
  const jaeOhaengName = jaeOhaeng(result);
  const jaeOhaengMissing = meter.distribution.find((d) => d.ohaeng === jaeOhaengName && d.percent === 0);

  if (jaeSlots.length > 0) {
    const ganzCount = jaeSlots.filter((s) => s.endsWith('Gan')).length;
    lines.push(`재성 축이 전체의 ${jaePercent}% (${jaeSlots.length}자리${ganzCount > 0 ? `, 천간 ${ganzCount}개 노출` : ''})로 재물에 대한 접근성이 ${jaePercent >= 30 ? '넓은' : jaePercent >= 15 ? '보통인' : '좁은'} 편입니다.`);
  } else {
    lines.push(`재성 자리가 뚜렷하지 않습니다(${jaePercent}%) — 재물은 흐름(식상→재성 구조)과 시점으로 만드는 명식입니다.`);
  }

  const flowPatterns = patternByKeys(patterns, [
    'saju/flow/sangsaeng-saengjae',
    'saju/flow/jaesaeng-gwan',
    'saju/combo/sangsaeng-saengjae--daymaster-weak',
    'saju/combo/sangsaeng-saengjae--daymaster-strong',
  ]);
  lines.push(...renderList(flowPatterns, 2));

  const riskPatterns = patternByKeys(patterns, [
    'saju/imbalance/jaesung-nochul',
    'saju/cross/gongmang-jaesung',
    'saju/cross/sinsal-연살-jaesung',
    'saju/cross/sinsal-역마-jaesung',
    'saju/combo/jaesung-nochul--bigeop-gwada',
  ]);
  lines.push(...renderList(riskPatterns, 2));

  if (jaeOhaengMissing && jaeOhaengName) {
    lines.push(`재성 오행(${jaeOhaengName})이 분포 0% — 재물에 관한 판단 기준을 후천적으로 보완하는 주제로 참고할 수 있습니다.`);
  }

  const headline = `재성 ${jaePercent}% · ${jaeSlots.length > 0 ? `${jaeSlots.length}자리 배치` : '재성 부재'}${riskPatterns.some((p) => p.key === 'saju/imbalance/jaesung-nochul') ? ' · 천간 노출' : ''}`;
  return { axis: 'wealth', title: AXIS_TITLES.wealth, headline, lines: dedupe(lines), patterns: [...flowPatterns, ...riskPatterns] };
}

/** 일간이 극하는 오행 = 재성 오행 */
function jaeOhaeng(result: SajuResult): string {
  const SANG: Record<string, string> = { 목: '토', 화: '금', 토: '수', 금: '목', 수: '화' };
  return SANG[dayGanOhaeng(result)] ?? '';
}

function buildCareerSection(
  result: SajuResult,
  patterns: DetectedPattern[],
  meter: OhaengMeter,
  _opts: AssembleReportOptions,
): ReportSection {
  const lines: string[] = [];
  const gwanSlots = groupSlots(result, 'gwansung');
  const gwanPercent = meter.groupPercents.gwansung;
  const sikPercent = meter.groupPercents.siksang;

  lines.push(`격국은 ${result.gyeokguk.name} — ${result.gyeokguk.description}`);
  lines.push(`관성(조직·질서) ${gwanPercent}% · 식상(기술·표현) ${sikPercent}%의 비율로, ${sikPercent > gwanPercent ? '조직 안에서도 자기 기술을 활용하는 방향을 살펴볼 수 있습니다' : gwanPercent > sikPercent ? '체계와 질서 안에서 성취하는 방향을 살펴볼 수 있습니다' : '조직과 자기 영역을 함께 살펴볼 수 있는 구조입니다'}.`);

  const flowPatterns = patternByKeys(patterns, [
    'saju/flow/gwanin-sangsaeng',
    'saju/flow/sangsaeng-jesal',
    'saju/flow/sangsaeng-saengjae',
    'saju/combo/gwanin-sangsaeng--insung-gwada',
  ]);
  lines.push(...renderList(flowPatterns, 2));

  const crossPatterns = patternByKeys(patterns, [
    'saju/cross/gyeokguk-yongsin-fit',
    'saju/cross/gyeokguk-yongsin-split',
    'saju/cross/sinsal-장성-siksang',
    'saju/cross/sinsal-장성-gwansung',
    'saju/cross/gongmang-gwansung',
    'saju/cross/gongmang-siksang',
    'saju/cross/sinsal-화개-siksang',
    'saju/cross/sinsal-역마-siksang',
  ]);
  lines.push(...renderList(crossPatterns, 3));

  if (gwanSlots.length === 0 && sikPercent < 15) {
    lines.push('관성·식상 모두 옅은 구조로, 일의 방향은 인성(전문성 축적) 기반의 준비형 커리어가 됩니다.');
  }

  const headline = `${result.gyeokguk.name} · 관성 ${gwanPercent}% vs 식상 ${sikPercent}%`;
  return { axis: 'career', title: AXIS_TITLES.career, headline, lines: dedupe(lines), patterns: [...flowPatterns, ...crossPatterns] };
}

function buildHealthSection(
  result: SajuResult,
  patterns: DetectedPattern[],
  meter: OhaengMeter,
  _opts: AssembleReportOptions,
): ReportSection {
  const lines: string[] = [];
  const sorted = [...meter.distribution].sort((a, b) => b.percent - a.percent);
  const top = sorted[0];
  const missing = meter.distribution.filter((d) => d.percent === 0);

  if (top.percent >= 30) {
    lines.push(`${top.ohaeng}(${OHAENG_BODY[top.ohaeng] ?? ''}) 쪽 분포가 ${top.percent}%로 두터워 — 전통적 오행 상징상 과로·과열을 생활 관리 주제로 참고할 수 있습니다.`);
  }
  for (const m of missing.slice(0, 2)) {
    lines.push(`결오행 ${m.ohaeng} — 전통적 오행 상징의 ${OHAENG_BODY[m.ohaeng] ?? ''} 영역을 생활 점검 주제로 참고할 수 있습니다.`);
  }
  if (meter.season.name) {
    const kingBody = OHAENG_BODY[meter.season.kingOhaeng] ?? '';
    lines.push(`월지 ${meter.season.monthJi}의 ${meter.season.name} — ${meter.season.kingOhaeng} 기운이 왕한 계절 태생으로, ${meter.season.kingOhaeng}${kingBody ? `(${kingBody})` : ''}의 전통적 상징을 생활 리듬 점검에 참고합니다.`);
  }

  const gwansungGwada = patterns.find((p) => p.key === 'saju/imbalance/gwansung-gwada');
  if (gwansungGwada) lines.push(renderPattern(gwansungGwada));

  // 강약·조후 맥락 — 체질 관리 방향을 명식 전체 구조와 연결
  const dayMasterWeak = meter.dayMaster.verdict === 'weak';
  const dayMasterStrong = meter.dayMaster.verdict === 'strong';
  if (dayMasterWeak) {
    lines.push('신약으로 분류된 지표는 체력이나 질병을 진단하는 값이 아닙니다 — 과로·수면 부족·과음 여부를 생활 점검 항목으로 삼고, 증상이나 우려가 있으면 의료 전문가의 판단을 우선합니다.');
  } else if (dayMasterStrong) {
    lines.push('신강으로 분류된 지표는 체력이나 질병을 진단하는 값이 아닙니다 — 과로·과열을 생활 점검 항목으로 참고하고, 증상이나 우려가 있으면 의료 전문가의 판단을 우선합니다.');
  }
  const johuPressure = patterns.find((p) => p.key === 'saju/johu/season-pressure');
  const johuSupport = patterns.find((p) => p.key === 'saju/johu/season-support');
  if (johuPressure) lines.push('월지 계절과 일간의 관계가 긴장으로 분류됩니다 — 계절·기후 변화에 맞춘 생활 리듬을 점검하되, 건강 상태는 의료 전문가의 판단을 우선합니다.');
  else if (johuSupport) lines.push('월지 계절과 일간의 관계가 지원으로 분류됩니다 — 햇빛·기후·식사·수면 같은 생활 리듬을 점검하는 참고 자료로 활용합니다.');

  const headline = `오행 최다 ${top.ohaeng} ${top.percent}%${missing.length > 0 ? ` · 결오행 ${missing.map((m) => m.ohaeng).join('·')}` : ''}`;
  const healthPatterns = [gwansungGwada, johuPressure, johuSupport].filter((p): p is DetectedPattern => p !== undefined);
  return { axis: 'health', title: AXIS_TITLES.health, headline, lines: dedupe(lines), patterns: healthPatterns };
}

function buildFamilySection(
  result: SajuResult,
  patterns: DetectedPattern[],
  meter: OhaengMeter,
  opts: AssembleReportOptions,
): ReportSection {
  const lines: string[] = [];

  const hasHour = Boolean(result.palja.hourGan && result.palja.hourJi);
  for (const pillar of PILLAR_REALM) {
    if (!hasHour && pillar.label === '시주') continue; // 시각 미상 — 시주 궁역 문장 제외
    const groups = pillar.slots.map((s) => groupOfSlot(result, s)).filter((g): g is SipsinGroup => g !== null);
    const glyphs = pillar.slots.map((s) => sipsinAt(result, s)).filter(Boolean);
    if (glyphs.length === 0) continue;
    const summary = [...new Set(groups)].map((g) => groupLabel(g)).join('+');
    lines.push(`${pillar.label}(${pillar.realm}) — ${summary || '십신 비어 있음'} (${glyphs.join('·')})`);
  }
  if (!hasHour) {
    lines.push('시각 미상 — 시주(자녀·말년궁)는 판별하지 않으며, 해당 영역은 대운·세운으로 보완합니다.');
  }

  // 육친성 — 형제(비겁), 자녀(남명 관성/여명 식상)
  const counts = meter.groupPercents;
  lines.push(`형제·동료 축(비겁) ${counts.bigeop}% — ${counts.bigeop >= 30 ? '형제·동료가 인생 무게에서 큰 비중' : counts.bigeop >= 15 ? '형제·동료와 무난한 거리 유지' : '형제·동료보다 독립적인 궤도'}`);
  const childGroup: SipsinGroup | null = opts.gender === 'male' ? 'gwansung' : opts.gender === 'female' ? 'siksang' : null;
  if (childGroup) {
    const childLabel = groupLabel(childGroup);
    lines.push(
      hasHour
        ? `자녀 축(${childLabel}) ${counts[childGroup]}% — 시주(자녀궁)와 함께 읽으면 자녀 연의 결이 보입니다.`
        : `자녀 축(${childLabel}) ${counts[childGroup]}% — 시각 미상으로 자녀궁은 세운·대운의 임시 자리로 읽습니다.`,
    );
  }

  const relationPatterns = patterns.filter((p) => p.key.startsWith('saju/relation/') && p.key !== 'saju/relation/wonjin');
  lines.push(...renderList(relationPatterns, 2));

  const headline = `년~시 4궁 십신 분포 · 비겁 ${counts.bigeop}% · 인성 ${counts.insung}%`;
  return { axis: 'family', title: AXIS_TITLES.family, headline, lines: dedupe(lines), patterns: relationPatterns };
}

function dedupe(lines: string[]): string[] {
  return [...new Set(lines)];
}

/** SajuResult → 축별 상담 문서(4층 확장) */
export function assembleReport(result: SajuResult, opts: AssembleReportOptions = {}): SajuReport {
  const patterns = runDetectors(result);
  const meter = measureOhaeng(result);
  const timing = buildTimingNarrative(result, opts.now);

  const headline = `${result.gyeokguk.name} · 일간 ${meter.dayMaster.verdictLabel} ${meter.dayMaster.score}% · 용신 ${result.yongsin.ohaeng}`;

  const { palja } = result;
  const hourPillar = palja.hourGan && palja.hourJi ? `${palja.hourGan}${palja.hourJi}` : null;
  const paljaLabel = `${palja.yearGan}${palja.yearJi} ${palja.monthGan}${palja.monthJi} ${palja.dayGan}${palja.dayJi} ${hourPillar ?? '(시각 미상)'}`;

  // 명식 맥락 — 같은 패턴이라도 격국·용신·강약이 다르면 다른 해석이 나오도록 하는 재료
  const gyeokgukGroup = groupFromOhaeng(result, getOhaengForJi(result.palja.monthJi) ?? '') ?? 'bigeop';
  const yongsinGroup = groupFromOhaeng(result, result.yongsin.ohaeng) ?? 'siksang';
  const gisin = result.yongsin.gisin.split('(')[0].trim();
  const rawYongsinReasoning = result.yongsin.reasoning ?? '';
  const schoolMatch = rawYongsinReasoning.match(/^(\S+?용신)\s*:/);
  const yongsinSchool = schoolMatch ? schoolMatch[1] : '용신';
  const yongsinReasoning = rawYongsinReasoning.replace(/^\S+?용신\s*:\s*/, '');
  // 학파별 용신 스프레드 — 학파 차이를 숨기지 않고 나란히 표기
  const SCHOOL_LABEL: Record<SajuSubSchool, string> = { gyeokguk: '격국', johu: '조후', gangyak: '강약', mulsang: '물상' };
  const bySchool = result.yongsinBySchool ?? {};
  const schoolEntries = (Object.keys(SCHOOL_LABEL) as SajuSubSchool[])
    .filter((s) => bySchool[s]?.ohaeng)
    .map((s) => `${SCHOOL_LABEL[s]} ${bySchool[s]!.yongsin}`);
  const yongsinSchoolSpread = schoolEntries.length > 0 ? schoolEntries.join(' · ') : undefined;
  const agreedCount = (Object.keys(SCHOOL_LABEL) as SajuSubSchool[])
    .filter((s) => bySchool[s]?.ohaeng === result.yongsin.ohaeng).length;
  const yongsinConsensus =
    schoolEntries.length > 0
      ? `${schoolEntries.length}학파 중 ${agreedCount}학파가 용신 ${result.yongsin.ohaeng} 지목`
      : undefined;
  // 학파별 근거 상세 — 역술인이 각 학파의 판정 이유를 대조할 수 있게 한다
  const yongsinSchoolDetails =
    schoolEntries.length > 0
      ? (Object.keys(SCHOOL_LABEL) as SajuSubSchool[])
          .filter((s) => bySchool[s]?.ohaeng)
          .map((s) => ({
            school: SCHOOL_LABEL[s],
            yongsin: bySchool[s]!.yongsin,
            gisin: bySchool[s]!.gisin,
            reasoning: bySchool[s]!.reasoning.replace(/^\S+?용신\s*:\s*/, ''),
            agree: bySchool[s]!.ohaeng === result.yongsin.ohaeng,
          }))
      : undefined;
  // 차순위 격국 후보 — 대표 격국 외에 성립한 대안들
  const gyeokgukCandidates = result.gyeokguk.candidates?.length
    ? result.gyeokguk.candidates.map((c) => `${c.name}${c.confidence ? `(${c.confidence})` : ''}`)
    : undefined;
  // 역술인 최종 선택 — applyPractitionerOverride 적용 결과를 리포트에 명시한다
  const ov = result.practitionerOverride;
  const practitionerChoice =
    ov && (ov.yongsinOhaeng || ov.yongsinSchool || ov.gyeokgukName || ov.note)
      ? [
          ov.yongsinOhaeng
            ? `용신 ${ov.yongsinOhaeng} 직접 지정`
            : ov.yongsinSchool
              ? `용신 ${SCHOOL_LABEL[ov.yongsinSchool]}학파 채택`
              : '',
          ov.gyeokgukName ? `격국 ${ov.gyeokgukName}` : '',
          ov.note ? `메모: ${ov.note}` : '',
        ]
          .filter(Boolean)
          .join(' · ')
      : undefined;
  // 점수제 강약 병기 — 점유율 계량과 별개 모델의 결과를 함께 보여준다
  const sa = result.strengthAssessment;
  const strengthScoreLabel = sa
    ? `${sa.label} — ${sa.wangState}·점수 ${sa.score.toFixed(1)} (득령${sa.deukryeong ? 'O' : 'X'}·득지${sa.deukji ? 'O' : 'X'}·득세${sa.deukse ? 'O' : 'X'})`
    : undefined;

  const context = {
    gyeokguk: result.gyeokguk.name,
    gyeokgukGroup: groupLabel(gyeokgukGroup),
    yongsin: result.yongsin.ohaeng,
    yongsinGroup: groupLabel(yongsinGroup),
    gisin,
    dayMasterVerdict: meter.dayMaster.verdictLabel,
    yongsinReasoning,
    yongsinSchool,
    gyeokgukConfidence: result.gyeokguk.confidence,
    gyeokgukBasis: result.gyeokguk.basis,
    gyeokgukBlockers: result.gyeokguk.blockers,
    strengthModel: '오행 점유율 계량(비겁+인성 %)',
    yongsinModel: `${yongsinSchool}(점수·학파 기반 판정)`,
    modelNote:
      '강약은 점유율 계량·점수제(득령·득지·득세) 두 모델을 병기하며 결과가 다를 수 있습니다 — 용신은 학파별 판정을 나란히 표기합니다.',
    yongsinSchoolSpread,
    yongsinSchoolDetails,
    gyeokgukCandidates,
    practitionerChoice,
    yongsinConsensus,
    strengthScoreLabel,
  };

  return {
    headline,
    paljaLabel,
    meter,
    sections: {
      love: buildLoveSection(result, patterns, meter, opts),
      wealth: buildWealthSection(result, patterns, meter, opts),
      career: buildCareerSection(result, patterns, meter, opts),
      health: buildHealthSection(result, patterns, meter, opts),
      family: buildFamilySection(result, patterns, meter, opts),
    },
    timing,
    patterns,
    context,
  };
}
