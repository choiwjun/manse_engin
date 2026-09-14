// 4층 조립기 — 감지 패턴(2층) + 레지스트리 문구(3층)를 풀이 문서로 조립한다.
// 문장은 renderPattern이 위치·강도·글자를 반영해 동적으로 만든다.

import type { SajuResult } from '@/engine/types';
import type { DetectedPattern, SajuInterpretation } from './types';
import { runAllDetectors } from './detectors';
import { isRegisteredPattern, PATTERN_REGISTRY } from './registry';
import { measureOhaeng } from './meter';
import { renderPattern } from './sentence';
import { getContentEntry } from './content';

/** detector 실행 → 레지스트리 결합 → 동일 키 병합 → 우선순위 정렬. 등록되지 않은 키는 버린다(품질 게이트). */
export function runDetectors(result: SajuResult): DetectedPattern[] {
  const byKey = new Map<string, DetectedPattern>();
  for (const raw of runAllDetectors(result)) {
    if (!isRegisteredPattern(raw.key)) continue;
    const meta = PATTERN_REGISTRY[raw.key];
    const existing = byKey.get(raw.key);
    if (existing) {
      // 같은 패턴이 여러 번 감지되면 강도는 최대, 근거·재료는 합친다
      existing.strength = Math.max(existing.strength, raw.strength);
      for (const e of raw.evidence) {
        if (!existing.evidence.includes(e)) existing.evidence.push(e);
      }
      for (const s of raw.slots ?? []) {
        if (!existing.slots?.some((x) => x.slot === s.slot && x.glyph === s.glyph)) {
          existing.slots = [...(existing.slots ?? []), s];
        }
      }
      if (raw.figures) existing.figures = { ...existing.figures, ...raw.figures };
      continue;
    }
    const entry = getContentEntry(raw.key);
    byKey.set(raw.key, { ...raw, ...meta, ...(entry ? { contentId: raw.key } : {}) });
  }
  return [...byKey.values()].sort((a, b) => a.priority - b.priority || b.strength - a.strength);
}

/** SajuResult(1층 facts) → 구조화된 풀이 문서(4층) */
export function interpretSaju(result: SajuResult): SajuInterpretation {
  const patterns = runDetectors(result);
  const meter = measureOhaeng(result);

  const headline = `${result.gyeokguk.name} · 일간 ${meter.dayMaster.verdictLabel} ${meter.dayMaster.score}% · 용신 ${result.yongsin.ohaeng} — ${result.yongsin.reasoning.split(':')[1]?.trim() ?? result.yongsin.reasoning}`;

  const structureLines = patterns
    .filter((p) => p.polarity === 'plus')
    .map((p) => renderPattern(p));
  const cautionLines = patterns
    .filter((p) => p.polarity === 'caution')
    .map((p) => renderPattern(p));

  return {
    patterns,
    summary: {
      headline,
      structureLines: structureLines.slice(0, 5),
      cautionLines: cautionLines.slice(0, 4),
    },
    baseline: {
      gyeokguk: result.gyeokguk.description,
      yongsin: result.yongsin.reasoning,
    },
    meter,
  };
}
