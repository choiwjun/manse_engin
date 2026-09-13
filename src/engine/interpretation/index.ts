// 해석 계층 공개 API — 2층 detector + 3층 레지스트리 + 4층 조립기.
// 기존 1층 계산 API(buildSajuResult 등)와 독립적으로 유지되며, SajuResult만 소비한다.

export type {
  DetectedPattern,
  PatternCategory,
  PatternMeta,
  PatternPolarity,
  RawPattern,
  SajuInterpretation,
  SipsinGroup,
} from './types';
export type { OhaengMeter, OhaengMeterSlot } from './meter';
export { PATTERN_REGISTRY, isRegisteredPattern } from './registry';
export { measureOhaeng } from './meter';
export { runDetectors, interpretSaju } from './assemble';
export { runAllDetectors, DETECTORS } from './detectors';
