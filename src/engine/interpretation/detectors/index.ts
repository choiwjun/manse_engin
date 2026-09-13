// detector 묶음 — SajuResult를 받아 RawPattern 배열을 내놓는 순수 함수들.

import type { SajuResult } from '@/engine/types';
import type { RawPattern } from '../types';
import { detectSangsaengSaengjae, detectGwaninSangsaeng, detectJaesaengGwan, detectSangsaengJesal } from './flow';
import { detectInsungGwada, detectBigeopGwada, detectSiksangGwada, detectGwansungGwada, detectJaesungNochul } from './imbalance';
import { detectDayMasterStrong, detectDayMasterWeak, detectOhaengSkew } from './strength';
import { detectGanHap, detectJijiRelations, detectWonjin } from './relations';
import { detectGongmangCross, detectGyeokgukYongsin, detectSinsalSipsin } from './crossings';
import { detectJohu } from './johu';
import { detectDaeunYongsin, detectDaeunSeunCross } from './timing';

export type DetectorFn = (result: SajuResult) => RawPattern[];

export const DETECTORS: DetectorFn[] = [
  // flow
  detectSangsaengSaengjae,
  detectGwaninSangsaeng,
  detectJaesaengGwan,
  detectSangsaengJesal,
  // imbalance
  detectInsungGwada,
  detectBigeopGwada,
  detectSiksangGwada,
  detectGwansungGwada,
  detectJaesungNochul,
  detectDayMasterStrong,
  detectDayMasterWeak,
  detectOhaengSkew,
  // relation
  detectGanHap,
  detectJijiRelations,
  detectWonjin,
  // cross
  detectGongmangCross,
  detectGyeokgukYongsin,
  detectSinsalSipsin,
  // johu
  detectJohu,
  // timing
  detectDaeunYongsin,
  detectDaeunSeunCross,
];

export function runAllDetectors(result: SajuResult): RawPattern[] {
  return DETECTORS.flatMap((fn) => fn(result));
}
