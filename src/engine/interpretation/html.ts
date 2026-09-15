// 풀이 문서 HTML 렌더러 — SajuReport를 인쇄·PDF 저장 가능한 standalone HTML 문서로 변환한다.
// markdown.ts와 같은 데이터(SajuReport)를 소비하되, 산출물은 브라우저에서 바로 열고
// '인쇄 → PDF로 저장'이 가능한 단일 HTML 파일이다. 외부 의존성·스크립트 없음.

import type { SajuReport } from './report';
import type { DetectedPattern } from './types';
import { getContentEntry } from './content';
import { renderPattern, strengthLabel } from './sentence';

export interface CounselorBrand {
  /** 상담사·상호 이름 */
  name: string;
  /** 연락처·이메일·SNS 등 */
  contact?: string;
  /** 한 줄 소개·슬로건 */
  tagline?: string;
}

export interface RenderReportHtmlOptions {
  /** 문서 제목 (기본: '사주 풀이 리포트') */
  title?: string;
  /** 확인 질문 섹션 포함 여부 (기본: true) */
  includeCheckQuestions?: boolean;
  /** 상담사 브랜드 프리앰블 — 헤더 상단과 푸터에 삽입 */
  counselor?: CounselorBrand;
}

const SECTION_ORDER = ['career', 'wealth', 'love', 'health', 'family'] as const;

// ---------- HTML 이스케이프 ----------

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---------- 템플릿 변수 치환 (markdown.ts와 동일 규칙) ----------

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

// ---------- 명식 맥락 문장 (markdown.ts와 동일 로직) ----------

function contextLine(report: SajuReport, _pattern: DetectedPattern): string {
  const ctx = report.context;
  if (!ctx) return '';
  const fit = ctx.gyeokgukGroup === ctx.yongsinGroup;
  const axis = fit
    ? `${ctx.gyeokguk}(${ctx.gyeokgukGroup})과 용신 ${ctx.yongsin}(${ctx.yongsinGroup})이 같은 축이라 이 패턴이 곧 명식의 주 라인이 됩니다.`
    : `${ctx.gyeokguk}(${ctx.gyeokgukGroup})과 용신 ${ctx.yongsin}(${ctx.yongsinGroup})이 다른 축이라, 이 패턴은 본업과 활용점 사이의 다리 역할을 합니다.`;
  const strength = ctx.dayMasterVerdict.includes('신약')
    ? '신약한 일간이 이 구조를 감당할 때 기반(인성·비겁) 보강 가능성을 먼저 살펴볼 수 있습니다.'
    : ctx.dayMasterVerdict.includes('신강')
      ? '신강한 일간이라 이 구조를 밀고 나가는 힘이 있습니다.'
      : '중화된 일간이라 이 구조를 양방향으로 활용할 수 있습니다.';
  return `${axis} ${strength}`;
}

// ---------- 패턴 상세 카드 ----------

function patternDetailHtml(pattern: DetectedPattern, report: SajuReport, includeInterpretation = true): string {
  const parts: string[] = [];
  parts.push(`<article class="pattern" data-polarity="${esc(pattern.polarity)}">`);
  parts.push(`<h4>${esc(pattern.title)}</h4>`);
  parts.push(`<p class="strength">강도 <strong>${esc(strengthLabel(pattern.strength))}</strong> (${Math.round(pattern.strength * 100)}%)</p>`);
  if (pattern.evidence?.length > 0) {
    parts.push(`<p class="evidence"><span class="lbl">근거</span> ${esc(pattern.evidence.join(' · '))}</p>`);
  }
  if (includeInterpretation) parts.push(`<p class="interp"><span class="lbl">해석</span> ${esc(renderPattern(pattern))}</p>`);
  const line = contextLine(report, pattern);
  if (line) parts.push(`<p class="ctx"><span class="lbl">이 명식에서</span> ${esc(line)}</p>`);
  const medium = patternBody(pattern.key, 'medium', report);
  const long = patternBody(pattern.key, 'long', report);
  if (medium) parts.push(`<p class="deep"><span class="lbl">심층 해설</span> ${esc(medium)}</p>`);
  if (long) parts.push(`<p class="deep"><span class="lbl">상담용 해설</span> ${esc(long)}</p>`);
  parts.push('</article>');
  return parts.join('\n');
}

// ---------- 메인 렌더러 ----------

/** SajuReport → standalone HTML 상담 문서 (인쇄·PDF 저장 대응) */
export function renderReportHtml(report: SajuReport, opts: RenderReportHtmlOptions = {}): string {
  const title = opts.title ?? '사주 풀이 리포트';
  const includeQuestions = opts.includeCheckQuestions ?? true;
  const patterns = report.patterns ?? [];
  const c = opts.counselor;

  const ohaengDist = [...report.meter.distribution]
    .sort((a, b) => b.percent - a.percent)
    .map((d) => `${d.ohaeng} ${d.percent}%`)
    .join(' · ');

  const keyPatterns = patterns.slice(0, 5);
  const plus = patterns.filter((p) => p.polarity === 'plus').slice(0, 2);
  const caution = patterns.filter((p) => p.polarity === 'caution').slice(0, 2);

  // 여러 축에 걸린 동일 패턴의 동적 문장은 문서 전체에서 첫 한 번만 표시한다.
  const renderedSectionLines = new Set<string>();
  const sectionsHtml = SECTION_ORDER.map((axis) => {
    const section = report.sections[axis];
    const uniqueLines = section.lines.filter((line) => {
      if (renderedSectionLines.has(line)) return false;
      renderedSectionLines.add(line);
      return true;
    });
    return `<section class="axis" id="axis-${axis}">
  <h3>${esc(section.title)}</h3>
  <p class="axis-headline"><em>${esc(section.headline)}</em></p>
  <ul>
${uniqueLines.map((l) => `    <li>${esc(l)}</li>`).join('\n')}
  </ul>
</section>`;
  }).join('\n');

  const timing = report.timing;
  const timingHtml = `<section class="timing">
  <h2>운의 흐름</h2>
${timing.daeun ? `  <div class="tblock"><h3>대운</h3><p>${esc(timing.daeun.line)}</p></div>` : ''}
${timing.sewoon ? `  <div class="tblock"><h3>세운</h3><p>${esc(timing.sewoon.line)}</p></div>` : ''}
${timing.wolun ? `  <div class="tblock"><h3>월운</h3><p>${esc(timing.wolun.line)}</p></div>` : ''}
${timing.combined ? `  <div class="tblock"><h3>대운×세운</h3><p>${esc(timing.combined)}</p></div>` : ''}
${timing.next ? `  <div class="tblock"><h3>다음 대운 전환</h3><p>${esc(timing.next.line)}</p></div>` : ''}
${timing.transition ? `  <div class="tblock"><h3>전환 시점</h3><p>${esc(timing.transition.line)}</p></div>` : ''}
${timing.daeunFlow?.length > 0 ? `  <div class="tblock"><h3>대운 전체 흐름</h3><ul>\n${timing.daeunFlow.map((d) => `    <li>${esc(d.line)}</li>`).join('\n')}\n  </ul></div>` : ''}
${includeQuestions && timing.checkQuestions.length > 0 ? `  <div class="tblock questions"><h3>상담 확인 질문</h3><ul>\n${timing.checkQuestions.map((q) => `    <li>${esc(q)}</li>`).join('\n')}\n  </ul></div>` : ''}
</section>`;

  const renderedSectionPatternKeys = new Set(
    SECTION_ORDER.flatMap((axis) => {
      const section = report.sections[axis];
      return section.patterns
        .filter((pattern) => section.lines.includes(renderPattern(pattern)))
        .map((pattern) => pattern.key);
    }),
  );
  const patternsHtml = `<section class="all-patterns">
  <h2>전체 구조 해설</h2>
  <p class="count">감지 패턴 ${patterns.length}건</p>
${patterns.map((p) => patternDetailHtml(p, report, !renderedSectionPatternKeys.has(p.key))).join('\n')}
</section>`;

  const brandHeader = c
    ? `<header class="brand">
  <div class="brand-name">${esc(c.name)}</div>
  ${c.tagline ? `<div class="brand-tagline">${esc(c.tagline)}</div>` : ''}
  ${c.contact ? `<div class="brand-contact">${esc(c.contact)}</div>` : ''}
</header>`
    : '';

  const brandFooter = c
    ? `<footer class="brand-foot">
  <span class="bf-name">${esc(c.name)}</span>${c.contact ? ` <span class="bf-sep">·</span> <span class="bf-contact">${esc(c.contact)}</span>` : ''}
</footer>`
    : '';

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>
${CSS}
</style>
</head>
<body>
<div class="page">
${brandHeader}
<h1 class="doc-title">${esc(title)}</h1>
<p class="headline">${esc(report.headline)}</p>
<p class="palja">원국 ${esc(report.paljaLabel)}</p>

<section class="summary">
  <h2>핵심 내용</h2>
  <ul>
    <li><span class="lbl">전체 구조</span> ${esc(report.headline)}</li>
    <li><span class="lbl">일간 강약</span> ${esc(report.meter.dayMaster.verdictLabel)} ${report.meter.dayMaster.score}% — 비겁 ${report.meter.groupPercents.bigeop}%, 인성 ${report.meter.groupPercents.insung}%</li>
    <li><span class="lbl">격국·용신</span> ${esc(report.context?.gyeokguk ?? '')} · 용신 ${esc(report.context?.yongsin ?? '확인 필요')}</li>
${report.context?.yongsinReasoning ? `    <li><span class="lbl">용신 근거(${esc(report.context.yongsinSchool)})</span> ${esc(report.context.yongsinReasoning)}</li>` : ''}
${keyPatterns.length > 0 ? `    <li><span class="lbl">핵심 패턴</span><ul class="sub">\n${keyPatterns.map((p) => `      <li><strong>${esc(p.title)}</strong></li>`).join('\n')}\n    </ul></li>` : ''}
${plus.length > 0 ? `    <li><span class="lbl">주요 강점</span> ${esc(plus.map((p) => p.title).join(' · '))}</li>` : ''}
${caution.length > 0 ? `    <li><span class="lbl">주요 주의점</span> ${esc(caution.map((p) => p.title).join(' · '))}</li>` : ''}
    <li><span class="lbl">우선 방향</span> ${esc(report.timing.daeun?.line ?? '현재 대운 정보를 기준으로 기반과 방향을 점검하세요.')}</li>
  </ul>
</section>

<section class="meter">
  <h2>오행 계량</h2>
  <ul>
    <li><span class="lbl">분포</span> ${esc(ohaengDist)}</li>
${report.meter.season.name ? `    <li><span class="lbl">계절</span> 월지 ${esc(report.meter.season.monthJi)} — ${esc(report.meter.season.name)}, 왕오행 ${esc(report.meter.season.kingOhaeng)}</li>` : ''}
    <li><span class="lbl">일간</span> ${esc(report.meter.dayMaster.verdictLabel)} ${report.meter.dayMaster.score}% (비겁 ${report.meter.groupPercents.bigeop}% · 인성 ${report.meter.groupPercents.insung}%)</li>
  </ul>
</section>

<h2 class="axes-title">분야별 전체 풀이</h2>
${sectionsHtml}

${timingHtml}

${patternsHtml}

<hr class="foot-rule">
<p class="disclaimer">본 문서는 역학 엔진의 계산 결과를 조립한 참고 자료입니다. 최종 판단은 상담사의 전문성으로 보완하세요.</p>
${brandFooter}
</div>
</body>
</html>
`;
}

// ---------- 스타일 (인쇄·PDF 대응) ----------

const CSS = `:root {
  --ink: #1a1a1a;
  --muted: #6b6b6b;
  --line: #d9d9d9;
  --accent: #3a4a6b;
  --plus: #2e6b46;
  --caution: #9c5a1a;
  --bg: #ffffff;
  --soft: #f6f5f2;
}
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body {
  margin: 0;
  background: var(--soft);
  color: var(--ink);
  font-family: 'Noto Serif KR', 'Source Han Serif KR', 'Nanum Myeongjo', 'Apple SD Gothic Neo', 'Malgun Gothic', serif;
  line-height: 1.7;
}
.page {
  max-width: 720px;
  margin: 0 auto;
  padding: 56px 40px 72px;
  background: var(--bg);
}
/* 상담사 브랜드 프리앰블 */
.brand { text-align: center; padding-bottom: 20px; margin-bottom: 28px; border-bottom: 1px solid var(--line); }
.brand-name { font-size: 20px; font-weight: 700; letter-spacing: 0.06em; color: var(--accent); }
.brand-tagline { font-size: 13px; color: var(--muted); margin-top: 4px; }
.brand-contact { font-size: 12px; color: var(--muted); margin-top: 2px; }
.brand-foot { margin-top: 28px; padding-top: 14px; border-top: 1px solid var(--line); text-align: center; font-size: 12px; color: var(--muted); }
.bf-name { font-weight: 600; color: var(--accent); }
.bf-sep { margin: 0 4px; }

.doc-title { font-size: 26px; font-weight: 700; margin: 0 0 10px; letter-spacing: -0.01em; }
.headline { font-size: 16px; font-weight: 600; color: var(--accent); margin: 0 0 4px; }
.palja { font-size: 14px; color: var(--muted); margin: 0 0 32px; letter-spacing: 0.04em; }

h2 {
  font-size: 19px; font-weight: 700; color: var(--accent);
  margin: 40px 0 14px; padding-bottom: 8px; border-bottom: 2px solid var(--accent);
}
.axes-title { margin-top: 44px; }
h3 { font-size: 16px; font-weight: 700; margin: 0 0 6px; }
h4 { font-size: 15px; font-weight: 700; margin: 0 0 8px; color: var(--ink); }

ul { margin: 0; padding-left: 20px; }
li { margin: 5px 0; }
ul.sub { margin-top: 4px; padding-left: 18px; }
ul.sub li { font-size: 14px; color: #333; }

.lbl { font-weight: 700; color: var(--accent); margin-right: 6px; }

.axis { margin: 0 0 26px; }
.axis-headline { margin: 0 0 10px; color: var(--muted); font-size: 14px; }
.axis ul { font-size: 14.5px; }
p.deep { font-size: 13.5px; color: #444; background: var(--soft); border-left: 3px solid var(--accent); padding: 10px 14px; margin: 12px 0; border-radius: 0 4px 4px 0; }
p.deep strong { color: var(--accent); }

.timing .tblock { margin: 0 0 16px; }
.timing .tblock h3 { color: var(--accent); }
.timing .tblock p, .timing .tblock ul { font-size: 14.5px; margin: 0; }
.questions ul li { color: #444; }

.count { font-size: 13px; color: var(--muted); margin: 0 0 18px; }
.pattern { border: 1px solid var(--line); border-radius: 6px; padding: 16px 18px; margin: 0 0 16px; page-break-inside: avoid; break-inside: avoid; }
.pattern[data-polarity="plus"] { border-left: 4px solid var(--plus); }
.pattern[data-polarity="caution"] { border-left: 4px solid var(--caution); }
.pattern p { margin: 5px 0; font-size: 13.5px; }
.pattern .strength { color: var(--muted); }
.pattern .ctx { color: #444; }
.pattern .deep { font-size: 13px; }

.foot-rule { border: none; border-top: 1px solid var(--line); margin: 48px 0 16px; }
.disclaimer { font-size: 12px; color: var(--muted); text-align: center; margin: 0; }

/* 인쇄·PDF — 여백·배경 정리, 패턴 카드 쪼개짐 방지 */
@media print {
  body { background: #fff; }
  .page { max-width: none; padding: 0; margin: 0; }
  .pattern, .axis, .tblock { page-break-inside: avoid; break-inside: avoid; }
  h2 { page-break-after: avoid; }
  a { color: inherit; text-decoration: none; }
}
@page { margin: 18mm 16mm; }
`;
