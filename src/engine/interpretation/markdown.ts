// 풀이 문서 텍스트 렌더러 — SajuReport를 상담사가 그대로 읽고 줄 수 있는 마크다운 문서로 변환한다.
// 디자인·레이아웃은 다음 단계(화면 작업)의 몫이고, 여기서는 '문서의 뼈대'만 만든다.
// content DB에 body.long이 있으면 섹션 깊은 곳에 심층 문단으로 붙인다.

import { patternContextLine, type SajuReport } from './report';
import { getContentEntry } from './content';
import { renderPattern, strengthLabel } from './sentence';

export interface RenderReportOptions {
  /** 문서 제목 (기본: '사주 풀이 리포트') */
  title?: string;
  /** 확인 질문 섹션 포함 여부 (기본: true — 상담 준비용일 때 유지) */
  includeCheckQuestions?: boolean;
}

const SECTION_ORDER = ['career', 'wealth', 'love', 'health', 'family'] as const;

/** content DB 문구의 {변수}를 이 명식의 실제 값으로 치환한다 */
function fillTemplate(text: string, report: SajuReport): string {
  const ctx = report.context;
  if (!ctx) return text;
  const paljaParts = report.paljaLabel.split(' ');
  const [yearPillar, monthPillar, dayPillar, hourPillar] = paljaParts;
  const vars: Record<string, string> = {
    dayGan: dayPillar?.[0] ?? '',
    dayJi: dayPillar?.[1] ?? '',
    monthGan: monthPillar?.[0] ?? '',
    monthJi: monthPillar?.[1] ?? '',
    yearGan: yearPillar?.[0] ?? '',
    yearJi: yearPillar?.[1] ?? '',
    hourGan: hourPillar?.[0] ?? '',
    hourJi: hourPillar?.[1] ?? '',
    gyeokguk: ctx.gyeokguk,
    gyeokgukGroup: ctx.gyeokgukGroup,
    yongsin: ctx.yongsin,
    yongsinGroup: ctx.yongsinGroup,
    gisin: ctx.gisin,
    dayMasterVerdict: ctx.dayMasterVerdict,
    score: String(report.meter.dayMaster.score),
  };
  return text.replace(/\{(\w+)\}/g, (m, k: string) => vars[k] ?? m);
}

function patternBody(key: string, level: 'medium' | 'long', report?: SajuReport): string | null {
  const value = getContentEntry(key)?.body?.[level];
  if (typeof value !== 'string' || value.trim().length === 0) return null;
  const trimmed = value.trim();
  return report ? fillTemplate(trimmed, report) : trimmed;
}

/** 패턴별 맥락 한 줄 — 용신·기신 축과 맞물리는 자리가 있을 때만 (report.ts patternContextLine) */
function contextLine(report: SajuReport, pattern: NonNullable<SajuReport['patterns']>[number]): string {
  return patternContextLine(report, pattern);
}

function addPatternDetail(
  out: string[],
  pattern: NonNullable<SajuReport['patterns']>[number],
  report: SajuReport,
  includeLong = true,
  includeInterpretation = true,
): void {
  out.push(`### ${pattern.title}`);
  out.push('');
  out.push(`**${pattern.title}**`);
  out.push('');
  out.push(`- 강도: ${strengthLabel(pattern.strength)} (${Math.round(pattern.strength * 100)}%)`);
  if (pattern.evidence?.length > 0) out.push(`- 근거: ${pattern.evidence.join(' · ')}`);
  if (includeInterpretation) out.push(`- 해석: ${renderPattern(pattern)}`);
  const line = contextLine(report, pattern);
  if (line) out.push(`- 이 명식에서: ${line}`);
  const medium = patternBody(pattern.key, 'medium', report);
  const long = includeLong ? patternBody(pattern.key, 'long', report) : null;
  if (medium) out.push(`- 심층 해설: ${medium}`);
  if (long) out.push(`- 상담용 해설: ${long}`);
  out.push('');
}

/** SajuReport → 마크다운 상담 문서 */
export function renderReportMarkdown(report: SajuReport, opts: RenderReportOptions = {}): string {
  const title = opts.title ?? '사주 풀이 리포트';
  const includeQuestions = opts.includeCheckQuestions ?? true;
  const patterns = report.patterns ?? [];
  const out: string[] = [];

  out.push(`# ${title}`);
  out.push('');
  out.push(`**${report.headline}**`);
  out.push('');
  out.push(`원국: ${report.paljaLabel}`);
  out.push('');

  // 핵심 내용 — 전체 구조를 먼저 읽는 상담용 요약
  out.push('## 핵심 내용');
  out.push('');
  out.push(`- 전체 구조: ${report.headline}`);
  out.push(`- 일간 강약: ${report.meter.dayMaster.verdictLabel} ${report.meter.dayMaster.score}% — 비겁 ${report.meter.groupPercents.bigeop}%, 인성 ${report.meter.groupPercents.insung}%`);
  out.push(`- 격국·용신: ${report.headline.split(' · ').slice(0, 1)[0]} · 용신 ${report.headline.split('용신 ').slice(1)[0] ?? '확인 필요'}`);
  if (report.context?.gyeokgukConfidence && report.context.gyeokgukConfidence !== '확정') {
    const blockers = report.context.gyeokgukBlockers?.length
      ? ` — 불성립 요소: ${report.context.gyeokgukBlockers.join('·')}`
      : '';
    out.push(`- 격국 신뢰도: ${report.context.gyeokgukConfidence}${blockers}`);
  }
  if (report.context?.gyeokgukCandidates?.length) {
    out.push(`- 격국 후보: ${report.context.gyeokgukCandidates.join(' · ')} — 대표 격국 외 성립한 대안입니다`);
  }
  if (report.context?.practitionerChoice) {
    out.push(`- 역술인 선택: ${report.context.practitionerChoice}`);
  }
  if (report.context?.yongsinReasoning) {
    out.push(`- 용신 근거(${report.context.yongsinSchool}): ${report.context.yongsinReasoning}`);
  }
  if (report.context?.yongsinSchoolSpread) {
    out.push(`- 학파별 용신: ${report.context.yongsinSchoolSpread}${report.context.yongsinConsensus ? ` (${report.context.yongsinConsensus})` : ''}`);
    for (const d of report.context.yongsinSchoolDetails ?? []) {
      out.push(`  - ${d.school}학파: 용신 ${d.yongsin} / 기신 ${d.gisin}${d.agree ? '' : ' (최종 용신과 불일치)'} — ${d.reasoning}`);
    }
  }
  if (report.context?.strengthScoreLabel) {
    out.push(`- 강약 병기: 점유율 ${report.meter.dayMaster.verdictLabel} ${report.meter.dayMaster.score}% / 점수제 ${report.context.strengthScoreLabel}`);
  }
  if (report.context?.modelNote) {
    out.push(`- 계산 모델: 강약=${report.context.strengthModel} · 용신=${report.context.yongsinModel} — ${report.context.modelNote}`);
  }
  const keyPatterns = patterns.slice(0, 5);
  if (keyPatterns.length > 0) {
    out.push('- 핵심 패턴:');
    for (const pattern of keyPatterns) out.push(`  - ${pattern.title}`);
  }
  const plus = patterns.filter((p) => p.polarity === 'plus').slice(0, 2);
  const caution = patterns.filter((p) => p.polarity === 'caution').slice(0, 2);
  if (plus.length > 0) out.push(`- 주요 강점: ${plus.map((p) => p.title).join(' · ')}`);
  if (caution.length > 0) out.push(`- 주요 주의점: ${caution.map((p) => p.title).join(' · ')}`);
  out.push(`- 우선 방향: ${report.timing.daeun?.line ?? '현재 대운 정보를 기준으로 기반과 방향을 점검하세요.'}`);
  out.push('');

  // 계량 요약
  out.push('## 오행 계량');
  out.push('');
  const dist = [...report.meter.distribution]
    .sort((a, b) => b.percent - a.percent)
    .map((d) => `${d.ohaeng} ${d.percent}%`)
    .join(' · ');
  out.push(`- 분포: ${dist}`);
  if (report.meter.season.name) {
    out.push(`- 계절: 월지 ${report.meter.season.monthJi} — ${report.meter.season.name}, 왕오행 ${report.meter.season.kingOhaeng}`);
  }
  out.push(
    `- 일간: ${report.meter.dayMaster.verdictLabel} ${report.meter.dayMaster.score}% (비겁 ${report.meter.groupPercents.bigeop}% · 인성 ${report.meter.groupPercents.insung}%)`,
  );
  out.push('');

  // 분야별 전체 풀이 — 기존 축별 문장을 모두 보존하고, 선택된 패턴의 심층 문구를 붙인다.
  out.push('## 분야별 전체 풀이');
  out.push('');

  // 축별 섹션 — 상담 목차 순서: 적성 → 재물 → 연애 → 건강 → 육친
  // 여러 축에 걸린 동일 패턴의 동적 문장은 문서 전체에서 첫 한 번만 표시한다.
  const renderedSectionLines = new Set<string>();
  for (const axis of SECTION_ORDER) {
    const section = report.sections[axis];
    out.push('');
    out.push(`### ${section.title}`);
    out.push('');
    out.push(`*${section.headline}*`);
    out.push('');
    for (const line of section.lines) {
      if (renderedSectionLines.has(line)) continue;
      renderedSectionLines.add(line);
      out.push(`- ${line}`);
    }
  }

  // 운의 흐름 — 대운·세운·월운·전환점을 별도 목차로 보존한다.
  out.push('');
  out.push('## 운의 흐름');
  out.push('');
  if (report.timing.daeun) out.push(`### 대운\n\n- ${report.timing.daeun.line}`);
  if (report.timing.sewoon) out.push(`### 세운\n\n- ${report.timing.sewoon.line}`);
  if (report.timing.wolun) out.push(`### 월운\n\n- ${report.timing.wolun.line}`);
  if (report.timing.next) out.push(`### 다음 대운 전환\n\n- ${report.timing.next.line}`);
  if (report.timing.transition) out.push(`### 전환 시점\n\n- ${report.timing.transition.line}`);
  if (report.timing.daeunFlow?.length > 0) {
    out.push('');
    out.push('### 대운 전체 흐름');
    out.push('');
    for (const d of report.timing.daeunFlow) {
      out.push(`- ${d.line}`);
    }
  }
  if (report.timing.lines.length === 0) out.push('- 현재 운의 상세 시점 정보가 없습니다.');
  out.push('');

  // 기존 제목은 제거하고, 상세 운의 흐름 안에 확인 질문을 함께 둔다.
  out.push('## 시점 서사');
  out.push('');
  for (const line of report.timing.lines) {
    out.push(`- ${line}`);
  }
  if (includeQuestions && report.timing.checkQuestions.length > 0) {
    out.push('');
    out.push('### 상담 확인 질문');
    out.push('');
    for (const q of report.timing.checkQuestions) {
      out.push(`- ${q}`);
    }
  }

  // 전체 구조 해설 — 축별 필터에서 제외된 패턴도 모두 출력한다.
  out.push('');
  out.push('## 전체 구조 해설');
  out.push('');
  out.push(`감지 패턴 ${patterns.length}건`);

  out.push('');
  const renderedSectionPatternKeys = new Set(
    SECTION_ORDER.flatMap((axis) => {
      const section = report.sections[axis];
      return section.patterns
        .filter((pattern) => section.lines.includes(renderPattern(pattern)))
        .map((pattern) => pattern.key);
    }),
  );
  for (const pattern of patterns) {
    addPatternDetail(out, pattern, report, true, !renderedSectionPatternKeys.has(pattern.key));
  }

  out.push('---');
  out.push('');
  out.push('본 문서는 역학 엔진의 계산 결과를 조립한 참고 자료입니다. 최종 판단은 상담사의 전문성으로 보완하세요.');

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}
