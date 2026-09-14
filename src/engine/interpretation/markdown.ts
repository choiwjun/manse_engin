// 풀이 문서 텍스트 렌더러 — SajuReport를 상담사가 그대로 읽고 줄 수 있는 마크다운 문서로 변환한다.
// 디자인·레이아웃은 다음 단계(화면 작업)의 몫이고, 여기서는 '문서의 뼈대'만 만든다.
// content DB에 body.long이 있으면 섹션 깊은 곳에 심층 문단으로 붙인다.

import type { SajuReport } from './report';
import { getContentEntry } from './content';

export interface RenderReportOptions {
  /** 문서 제목 (기본: '사주 풀이 리포트') */
  title?: string;
  /** 확인 질문 섹션 포함 여부 (기본: true — 상담 준비용일 때 유지) */
  includeCheckQuestions?: boolean;
}

const SECTION_ORDER = ['career', 'wealth', 'love', 'health', 'family'] as const;

/** SajuReport → 마크다운 상담 문서 */
export function renderReportMarkdown(report: SajuReport, opts: RenderReportOptions = {}): string {
  const title = opts.title ?? '사주 풀이 리포트';
  const includeQuestions = opts.includeCheckQuestions ?? true;
  const out: string[] = [];

  out.push(`# ${title}`);
  out.push('');
  out.push(`**${report.headline}**`);
  out.push('');
  out.push(`원국: ${report.paljaLabel}`);
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

  // 축별 섹션 — 상담 목차 순서: 적성 → 재물 → 연애 → 건강 → 육친
  for (const axis of SECTION_ORDER) {
    const section = report.sections[axis];
    out.push('');
    out.push(`## ${section.title}`);
    out.push('');
    out.push(`*${section.headline}*`);
    out.push('');
    for (const line of section.lines) {
      out.push(`- ${line}`);
    }
    // 심층 문단 — content DB body.long이 있는 패턴만
    const deepParagraphs = section.patterns
      .map((p) => ({ title: p.title, long: getContentEntry(p.key)?.body?.long }))
      .filter((x): x is { title: string; long: string } => typeof x.long === 'string');
    if (deepParagraphs.length > 0) {
      out.push('');
      for (const { title: patternTitle, long } of deepParagraphs) {
        out.push(`**${patternTitle}** ${long}`);
        out.push('');
      }
    }
  }

  // 시점 서사
  out.push('');
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
  out.push('');
  out.push('---');
  out.push('');
  out.push('본 문서는 역학 엔진의 계산 결과를 조립한 참고 자료입니다. 최종 판단은 상담사의 전문성으로 보완하세요.');

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}
