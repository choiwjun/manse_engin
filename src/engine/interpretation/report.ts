// 축별 조립기 — 상담 문서의 목차(연애·재물·적성·건강·육친)에 맞춰 해석을 배분한다.
// 감지 패턴(renderPattern 동적 문장) + 1층 facts(궁·십신·계량 수치)를 축별로 엮는다.
// interpretSaju가 "패턴 목록"이라면 assembleReport는 "상담 문서"다.

import type { SajuResult } from '@/engine/types';
import type { DetectedPattern, SipsinGroup } from './types';
import { runDetectors } from './assemble';
import { measureOhaeng, type OhaengMeter } from './meter';
import { renderPattern } from './sentence';
import { groupLabel, groupOfSlot, posLabel, sipsinNameOfSlot, dayGanOhaeng, SIPSIN_SLOTS, type SipsinSlot } from './sipsin-groups';
import { josa } from './sentence';
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
}

export interface AssembleReportOptions {
  /** 성별 — 배우자성(남명 재성/여명 관성)·자녀성 판정에 쓴다. 미지정 시 양쪽을 나열 */
  gender?: 'male' | 'female';
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
    lines.push(`배우자궁인 일지에 ${dayJiSipsin}(${dayJiGlyph})${josa(dayJiSipsin, '이가')} 앉아 ${SIPSIN_PARTNER_LINE[dayJiSipsin] ?? '독특한 색깔의 연'}을 만듭니다.`);
  } else {
    lines.push('배우자궁인 일지의 십신이 비어 있어, 배우자 양상은 대운·세운의 임시 자리를 따라갑니다.');
  }

  // 일지가 관계(합·충·형·해)에 걸려 있으면 그것이 배우자궁의 결
  const dayJiRelations = (result.jijiRelations ?? []).filter((r) => r.positions.includes('dayJi') && ['합', '충', '형', '해'].includes(r.type));
  for (const rel of dayJiRelations.slice(0, 2)) {
    if (rel.type === '합') lines.push(`일지(${dayJiGlyph})가 지지합에 묶여 배우자와의 결속·끌림이 강한 구조입니다. (${rel.description})`);
    else if (rel.type === '충') lines.push(`일지(${dayJiGlyph})가 충을 이루어 배우자궁에 변동·재정비 주기가 생기는 구조입니다. (${rel.description})`);
    else if (rel.type === '형') lines.push(`일지(${dayJiGlyph})가 형을 이루어 배우자궁에서는 규칙·약속을 지키는 일이 비용을 좌우합니다. (${rel.description})`);
    else if (rel.type === '해') lines.push(`일지(${dayJiGlyph})가 해를 이루어 배우자궁에 미세한 마찰이 반복되기 쉽습니다. (${rel.description})`);
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
    if (p.key.startsWith('saju/cross/sinsal-도화')) return true;
    if (p.key.startsWith('saju/relation/') && patternSlotsLabels(p).includes('일지')) return true;
    if (opts.gender === 'male' && p.key === 'saju/cross/gongmang-jaesung') return true;
    if (opts.gender === 'female' && p.key === 'saju/cross/gongmang-gwansung') return true;
    if (p.key === 'saju/relation/wonjin' && patternSlotsLabels(p).some((l) => l === '일지')) return true;
    return false;
  });
  lines.push(...renderList(relevant, 3));

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

  const flowPatterns = patternByKeys(patterns, ['saju/flow/sangsaeng-saengjae', 'saju/flow/jaesaeng-gwan']);
  lines.push(...renderList(flowPatterns, 2));

  const riskPatterns = patternByKeys(patterns, [
    'saju/imbalance/jaesung-nochul',
    'saju/cross/gongmang-jaesung',
    'saju/cross/sinsal-도화-jaesung',
    'saju/cross/sinsal-역마-jaesung',
  ]);
  lines.push(...renderList(riskPatterns, 2));

  if (jaeOhaengMissing && jaeOhaengName) {
    lines.push(`재성 오행(${jaeOhaengName})이 분포 0% — 재물 감각은 후천적으로 채우는 주제입니다.`);
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
  lines.push(`관성(조직·질서) ${gwanPercent}% · 식상(기술·표현) ${sikPercent}%의 비율로, ${sikPercent > gwanPercent ? '조직 안에서도 자기 기술을 파는 쪽이 맞습니다' : gwanPercent > sikPercent ? '체계와 질서 안에서 성취하는 쪽이 맞습니다' : '조직과 자기 영역의 균형 잡힌 구조입니다'}.`);

  const flowPatterns = patternByKeys(patterns, ['saju/flow/gwanin-sangsaeng', 'saju/flow/sangsaeng-jesal', 'saju/flow/sangsaeng-saengjae']);
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
    lines.push(`${top.ohaeng}(${OHAENG_BODY[top.ohaeng] ?? ''}) 쪽 분포가 ${top.percent}%로 두터워 — 과로·과열이 쌓이기 쉬운 체질 경향으로 관리 대상입니다.`);
  }
  for (const m of missing.slice(0, 2)) {
    lines.push(`결오행 ${m.ohaeng} — ${OHAENG_BODY[m.ohaeng] ?? ''} 영역은 타고난 경보가 약하니 정기 점검을 습관화하는 게 좋습니다.`);
  }
  if (meter.season.name) {
    const kingBody = OHAENG_BODY[meter.season.kingOhaeng] ?? '';
    lines.push(`월지 ${meter.season.monthJi}의 ${meter.season.name} — ${meter.season.kingOhaeng} 기운이 왕한 계절 태생으로, ${meter.season.kingOhaeng}${kingBody ? `(${kingBody})` : ''} 균형이 계절 자극에 민감합니다.`);
  }

  const gwansungGwada = patterns.find((p) => p.key === 'saju/imbalance/gwansung-gwada');
  if (gwansungGwada) lines.push(renderPattern(gwansungGwada));

  const headline = `오행 최다 ${top.ohaeng} ${top.percent}%${missing.length > 0 ? ` · 결오행 ${missing.map((m) => m.ohaeng).join('·')}` : ''}`;
  return { axis: 'health', title: AXIS_TITLES.health, headline, lines: dedupe(lines), patterns: gwansungGwada ? [gwansungGwada] : [] };
}

function buildFamilySection(
  result: SajuResult,
  patterns: DetectedPattern[],
  meter: OhaengMeter,
  opts: AssembleReportOptions,
): ReportSection {
  const lines: string[] = [];

  for (const pillar of PILLAR_REALM) {
    const groups = pillar.slots.map((s) => groupOfSlot(result, s)).filter((g): g is SipsinGroup => g !== null);
    const glyphs = pillar.slots.map((s) => sipsinAt(result, s)).filter(Boolean);
    if (glyphs.length === 0) continue;
    const summary = [...new Set(groups)].map((g) => groupLabel(g)).join('+');
    lines.push(`${pillar.label}(${pillar.realm}) — ${summary || '십신 비어 있음'} (${glyphs.join('·')})`);
  }

  // 육친성 — 형제(비겁), 자녀(남명 식상/여명 관성)
  const counts = meter.groupPercents;
  lines.push(`형제·동료 축(비겁) ${counts.bigeop}% — ${counts.bigeop >= 30 ? '형제·동료가 인생 무게에서 큰 비중' : counts.bigeop >= 15 ? '형제·동료와 무난한 거리 유지' : '형제·동료보다 독립적인 궤도'}`);
  const childGroup: SipsinGroup | null = opts.gender === 'male' ? 'siksang' : opts.gender === 'female' ? 'gwansung' : null;
  if (childGroup) {
    const childLabel = groupLabel(childGroup);
    lines.push(`자녀 축(${childLabel}) ${counts[childGroup]}% — 시주(자녀궁)와 함께 읽으면 자녀 연의 결이 보입니다.`);
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
  const timing = buildTimingNarrative(result);

  const headline = `${result.gyeokguk.name} · 일간 ${meter.dayMaster.verdictLabel} ${meter.dayMaster.score}% · 용신 ${result.yongsin.ohaeng}`;

  const { palja } = result;
  const hourPillar = palja.hourGan && palja.hourJi ? `${palja.hourGan}${palja.hourJi}` : null;
  const paljaLabel = `${palja.yearGan}${palja.yearJi} ${palja.monthGan}${palja.monthJi} ${palja.dayGan}${palja.dayJi} ${hourPillar ?? '(시각 미상)'}`;

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
  };
}
