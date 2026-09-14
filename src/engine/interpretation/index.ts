// 해석 계층 공개 API — 2층 detector + 3층 레지스트리 + 4층 조립기 + 동적 문장 + 축별 리포트.
// 기존 1층 계산 API(buildSajuResult 등)와 독립적으로 유지되며, SajuResult만 소비한다.

export type {
  DetectedPattern,
  PatternCategory,
  PatternFigures,
  PatternMeta,
  PatternPolarity,
  PatternSlot,
  RawPattern,
  SajuInterpretation,
  SipsinGroup,
} from './types';
export type { OhaengMeter, OhaengMeterSlot } from './meter';
export type {
  ReportAxis,
  ReportSection,
  SajuReport,
  AssembleReportOptions,
} from './report';
export type {
  TimingNarrative,
  TimingVerdict,
  TimingVerdictInfo,
} from './narrative';
export { PATTERN_REGISTRY, isRegisteredPattern } from './registry';
export { measureOhaeng } from './meter';
export { runDetectors, interpretSaju } from './assemble';
export { runAllDetectors, DETECTORS } from './detectors';
export { renderPattern, strengthLabel, josa } from './sentence';
export { judgeOhaeng, buildTimingNarrative } from './narrative';
export { assembleReport } from './report';
export { renderReportMarkdown, renderCompatibilityMarkdown, renderNamingMarkdown, renderTaekilMarkdown, type RenderReportOptions } from './markdown';
export { getContentEntry, contentEntryCount, conclusionFor, type ContentEntry, type ContentBody, type ContentDb } from './content';
export {
  interpretCompatibility,
  type CompatibilityInterpretation,
  type CompatibilityLine,
  type InterpretCompatibilityOptions,
} from './compatibility';
export {
  interpretName,
  interpretNaming,
  type NamingInterpretation,
  type NamingLine,
  type InterpretNamingOptions,
} from './naming';
export {
  interpretTaekil,
  type TaekilInterpretation,
  type TaekilLine,
} from './taekil';
