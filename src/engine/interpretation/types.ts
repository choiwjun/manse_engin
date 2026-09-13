// 해석 계층(2~4층) 공용 타입.
// 1층(Facts: SajuResult)을 소비해 2층(Detector: 구조 패턴 감지)과
// 4층(Assembler: 풀이 문서 조립)을 잇는다. 기존 계산 코드는 건드리지 않는다.

import type { OhaengMeter } from './meter';

export type PatternCategory = 'flow' | 'imbalance' | 'relation' | 'cross' | 'timing';

export type PatternPolarity = 'plus' | 'caution' | 'neutral';

/** 십신 묶음. detector 내부 판단 단위이자 조합키의 접미어 */
export type SipsinGroup = 'bigeop' | 'siksang' | 'jaesung' | 'gwansung' | 'insung';

/** 레지스트리에 등록된 패턴의 정적 메타데이터 + 기본 문구 */
export interface PatternMeta {
  category: PatternCategory;
  /** 해석 서사에서의 정렬 우선순위 (작을수록 먼저) */
  priority: number;
  /** 패턴 제목 (예: '식상생재(食傷生財)') */
  title: string;
  /** content DB가 없을 때 쓰는 기본 해석 문구(3층 fallback) */
  defaultText: string;
  polarity: PatternPolarity;
}

/** detector가 내놓는 생 패턴 (레지스트리 메타데이터 결합 전) */
export interface RawPattern {
  /** content DB 조합키와 1:1 대응 (예: 'saju/flow/sangsaeng-saengjae') */
  key: string;
  /** 감지 강도 0~1 */
  strength: number;
  /** 패턴의 근거 — 엔진 facts 인용 (예: '일지 酉=식신') */
  evidence: string[];
}

/** 레지스트리 결합 후의 완성 패턴 */
export interface DetectedPattern extends RawPattern {
  category: PatternCategory;
  priority: number;
  title: string;
  defaultText: string;
  polarity: PatternPolarity;
}

/** 4층 조립기의 출력 — 풀이 문서의 구조화된 형태 */
export interface SajuInterpretation {
  /** 우선순위→강도 정렬된 감지 패턴 전체 */
  patterns: DetectedPattern[];
  summary: {
    /** 격국·용신 기반 한 줄 헤드라인 */
    headline: string;
    /** 긍정/구조 방향 문장들 (polarity 'plus', 강도순) */
    structureLines: string[];
    /** 주의 방향 문장들 (polarity 'caution', 강도순) */
    cautionLines: string[];
  };
  /** 1층 요소 단위 문구 — 기존 출력 보존 (fallback 층) */
  baseline: {
    gyeokguk: string;
    yongsin: string;
  };
  /** 강약 계량 결과 — 오행 분포·일간 신강신약 수치 */
  meter: OhaengMeter;
}
