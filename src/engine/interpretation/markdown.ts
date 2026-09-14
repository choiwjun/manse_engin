// 풀이 문서 텍스트 렌더러 — SajuReport를 상담사가 그대로 읽고 줄 수 있는 마크다운 문서로 변환한다.
// 디자인·레이아웃은 다음 단계(화면 작업)의 몫이고, 여기서는 '문서의 뼈대'만 만든다.
// content DB에 body.long이 있으면 섹션 깊은 곳에 심층 문단으로 붙인다.

import type { SajuReport } from './report';
import type { CompatibilityInterpretation } from './compatibility';
import type { NamingInterpretation } from './naming';
import type { TaekilInterpretation } from './taekil';
import type { CompatibilityResult } from '@/engine/compatibility/types';
import type { NamingResult, CalendarDay } from '@/engine/types';
import { getContentEntry } from './content';
import { renderPattern, strengthLabel } from './sentence';

export interface RenderReportOptions {
  /** 문서 제목 (기본: '사주 풀이 리포트') */
  title?: string;
  /** 확인 질문 섹션 포함 여부 (기본: true — 상담 준비용일 때 유지) */
  includeCheckQuestions?: boolean;
}

const SECTION_ORDER = ['career', 'wealth', 'love', 'health', 'family'] as const;

function patternBody(key: string, level: 'medium' | 'long'): string | null {
  const value = getContentEntry(key)?.body?.[level];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

/** 이 명식의 맥락 한 줄 — 같은 패턴이어도 격국·용신·강약이 다르면 다른 해석이 되도록 명식별 문장을 붙인다 */
function contextLine(report: SajuReport, pattern: NonNullable<SajuReport['patterns']>[number]): string {
  const ctx = report.context;
  if (!ctx) return '';
  const fit = ctx.gyeokgukGroup === ctx.yongsinGroup;
  const axis = fit
    ? `${ctx.gyeokguk}(${ctx.gyeokgukGroup})과 용신 ${ctx.yongsin}(${ctx.yongsinGroup})이 같은 축이라 이 패턴이 곧 명식의 주 라인이 됩니다.`
    : `${ctx.gyeokguk}(${ctx.gyeokgukGroup})과 용신 ${ctx.yongsin}(${ctx.yongsinGroup})이 다른 축이라, 이 패턴은 본업과 활용점 사이의 다리 역할을 합니다.`;
  const strength = ctx.dayMasterVerdict.includes('신약')
    ? '신약한 일간이 이 구조를 감당하려면 기반(인성·비겁) 보강이 선행되어야 합니다.'
    : ctx.dayMasterVerdict.includes('신강')
      ? '신강한 일간이라 이 구조를 밀고 나가는 힘이 있습니다.'
      : '중화된 일간이라 이 구조를 양방향으로 활용할 수 있습니다.';
  return `${axis} ${strength}`;
}

function addPatternDetail(out: string[], pattern: NonNullable<SajuReport['patterns']>[number], report: SajuReport, includeLong = true): void {
  out.push(`### ${pattern.title}`);
  out.push('');
  out.push(`**${pattern.title}**`);
  out.push('');
  out.push(`- 강도: ${strengthLabel(pattern.strength)} (${Math.round(pattern.strength * 100)}%)`);
  if (pattern.evidence?.length > 0) out.push(`- 근거: ${pattern.evidence.join(' · ')}`);
  out.push(`- 해석: ${renderPattern(pattern)}`);
  const line = contextLine(report, pattern);
  if (line) out.push(`- 이 명식에서: ${line}`);
  const medium = patternBody(pattern.key, 'medium');
  const long = includeLong ? patternBody(pattern.key, 'long') : null;
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
  const keyPatterns = patterns.slice(0, 5);
  if (keyPatterns.length > 0) {
    out.push('- 핵심 패턴:');
    for (const pattern of keyPatterns) out.push(`  - ${pattern.title}: ${renderPattern(pattern)}`);
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
  for (const axis of SECTION_ORDER) {
    const section = report.sections[axis];
    out.push('');
    out.push(`### ${section.title}`);
    out.push('');
    out.push(`*${section.headline}*`);
    out.push('');
    for (const line of section.lines) {
      out.push(`- ${line}`);
    }
    const deepParagraphs = section.patterns
      .map((p) => ({ title: p.title, long: getContentEntry(p.key)?.body?.long }))
      .filter((x): x is { title: string; long: string } => typeof x.long === 'string' && x.long.trim().length > 0);
    if (deepParagraphs.length > 0) {
      out.push('');
      for (const { title: patternTitle, long } of deepParagraphs) {
        out.push(`**${patternTitle}** ${long}`);
        out.push('');
      }
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
  for (const pattern of patterns) addPatternDetail(out, pattern, report);

  out.push('---');
  out.push('');
  out.push('본 문서는 역학 엔진의 계산 결과를 조립한 참고 자료입니다. 최종 판단은 상담사의 전문성으로 보완하세요.');

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

/** CompatibilityResult + 해석 → 궁합 상담 문서 (마크다운) */
export function renderCompatibilityMarkdown(
  compat: CompatibilityResult,
  narrative: CompatibilityInterpretation,
  opts: { nameA?: string; nameB?: string } = {},
): string {
  const nameA = opts.nameA ?? 'A';
  const nameB = opts.nameB ?? 'B';
  const out: string[] = [];

  out.push(`# 궁합 리포트 — ${nameA} × ${nameB}`);
  out.push('');
  out.push(`**${narrative.headline}**`);
  out.push('');
  out.push(compat.summary);
  out.push('');
  out.push(`원국: ${nameA} ${paljaOfCompat(compat, 1)} · ${nameB} ${paljaOfCompat(compat, 2)}`);
  out.push('');

  out.push('## 관계 구조');
  out.push('');
  for (const line of narrative.lines) {
    out.push(`- **${line.label}** ${line.text}`);
  }
  out.push('');

  out.push('## 점수 구성');
  out.push('');
  for (const cat of compat.categories) {
    out.push(`- ${cat.name}: ${cat.score}/${cat.maxScore} — ${cat.description}`);
  }
  out.push('');

  out.push('## 강점');
  out.push('');
  for (const s of narrative.strengths) out.push(`- ${s}`);
  out.push('');

  if (narrative.frictions.length > 0) {
    out.push('## 주의 축');
    out.push('');
    for (const f of narrative.frictions) out.push(`- ${f}`);
    out.push('');
  }

  out.push('## 운영 가이드');
  out.push('');
  for (const g of narrative.guidance) out.push(`- ${g}`);
  out.push('');

  out.push('---');
  out.push('');
  out.push('본 문서는 역학 엔진의 계산 결과를 조립한 참고 자료입니다. 최종 판단은 상담사의 전문성으로 보완하세요.');

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

/** CalendarDay + 해석 → 택일 상담 문서 (마크다운) */
export function renderTaekilMarkdown(
  day: CalendarDay,
  narrative: TaekilInterpretation,
  opts: { title?: string } = {},
): string {
  const title = opts.title ?? `택일 리포트 — ${day.solarDate}`;
  const out: string[] = [];

  out.push(`# ${title}`);
  out.push('');
  out.push(`**${narrative.headline}**`);
  out.push('');
  out.push(`양력 ${day.solarDate} · 음력 ${day.lunarDate}${day.isLeapMonth ? ' (윤달)' : ''} · 일진 ${day.dayGanJi}`);
  out.push('');

  for (const line of narrative.lines) {
    out.push(`- **${line.label}** ${line.text}`);
  }
  out.push('');

  if (narrative.suited.length > 0) {
    out.push('## 이 날에 맞는 일');
    out.push('');
    for (const s of narrative.suited) out.push(`- ${s}`);
    out.push('');
  }
  if (narrative.avoid.length > 0) {
    out.push('## 이 날에 피할 일');
    out.push('');
    for (const s of narrative.avoid) out.push(`- ${s}`);
    out.push('');
  }

  out.push('## 운영 가이드');
  out.push('');
  for (const g of narrative.guidance) out.push(`- ${g}`);
  out.push('');

  out.push('---');
  out.push('');
  out.push('본 문서는 역학 엔진의 계산 결과를 조립한 참고 자료입니다. 최종 판단은 상담사의 전문성으로 보완하세요.');

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

function paljaOfCompat(compat: CompatibilityResult, person: 1 | 2): string {
  const p = person === 1 ? compat.person1Palja : compat.person2Palja;
  const hour = p.hourGan && p.hourJi ? `${p.hourGan}${p.hourJi}` : '(시각 미상)';
  return `${p.yearGan}${p.yearJi} ${p.monthGan}${p.monthJi} ${p.dayGan}${p.dayJi} ${hour}`;
}

/** NamingResult + 해석 → 작명 상담 문서 (마크다운) */
export function renderNamingMarkdown(
  result: NamingResult,
  narratives: NamingInterpretation[],
  opts: { title?: string } = {},
): string {
  const title = opts.title ?? `작명 리포트 — ${result.surname}씨 후보 ${result.candidates.length}인`;
  const out: string[] = [];

  out.push(`# ${title}`);
  out.push('');
  out.push(`성씨: ${result.surname} · 후보 ${result.candidates.length}개`);
  out.push('');

  // 후보별 섹션
  result.candidates.forEach((c, i) => {
    const n = narratives[i];
    if (!n) return;
    out.push(`## ${i + 1}. ${result.surname}${c.name} — ${c.totalScore}점`);
    out.push('');
    out.push(`**${n.headline}**`);
    out.push('');

    for (const line of n.lines) {
      out.push(`- **${line.label}** ${line.text}`);
    }
    out.push('');

    if (n.strengths.length > 0) {
      out.push('**강점**');
      out.push('');
      for (const s of n.strengths) out.push(`- ${s}`);
      out.push('');
    }
    if (n.cautions.length > 0) {
      out.push('**주의**');
      out.push('');
      for (const s of n.cautions) out.push(`- ${s}`);
      out.push('');
    }
    if (n.guidance.length > 0) {
      out.push('**가이드**');
      out.push('');
      for (const s of n.guidance) out.push(`- ${s}`);
      out.push('');
    }
  });

  out.push('---');
  out.push('');
  out.push('본 문서는 역학 엔진의 계산 결과를 조립한 참고 자료입니다. 최종 판단은 상담사의 전문성으로 보완하세요.');

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}
