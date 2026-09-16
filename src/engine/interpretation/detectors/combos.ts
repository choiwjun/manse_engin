// 조합(교차) detector — 두 구조 조건이 겹칠 때만 나오는 깊은 해석.
// 전문가가 만세력을 보며 하나하나 조합하는 판단(강약×흐름×시점)을 키로 시스템화한다.
// 다른 detector의 결과에 의존하지 않고 원시 조건을 직접 판정한다 (detector 간 결합 방지).

import type { SajuResult } from '@/engine/types';
import type { RawPattern, SipsinGroup } from '../types';
import {
  countGroups,
  dayGanOhaeng,
  glyphOfSlot,
  groupOfSlot,
  isChildOf,
  isSanggeukOf,
  posLabel,
  sipsinNameOfSlot,
  SIPSIN_SLOTS,
  toPatternSlot,
} from '../sipsin-groups';
import { measureOhaeng } from '../meter';
import type { OhaengMeter } from '../meter';
import { judgeGanJi } from '../narrative';

/** 대운 종합 판정 — 천간·지지 이중 축(judgeGanJi). 'mixed'면 fit/tension 어느 쪽으로도 단정하지 않는다 */
function daeunVerdict(result: SajuResult) {
  const current = result.daeun.find((d) => d.isCurrent);
  return current ? judgeGanJi(result, current.gan, current.ji) : null;
}

function isDaeunFit(result: SajuResult): boolean {
  return daeunVerdict(result)?.verdict === 'fit';
}

function isDaeunTension(result: SajuResult): boolean {
  return daeunVerdict(result)?.verdict === 'tension';
}

function hasSangsaengSaengjae(result: SajuResult): boolean {
  const counts = countGroups(result);
  return counts.siksang >= 1 && counts.jaesung >= 1;
}

function hasGwaninSangsaeng(result: SajuResult): boolean {
  const counts = countGroups(result);
  return counts.gwansung >= 1 && counts.insung >= 1;
}

/** 재성 천간 노출 수 (detector/imbalance의 재성 노출과 동일 기준) */
function exposedJaeCount(result: SajuResult): number {
  return SIPSIN_SLOTS.filter(
    (s) => s.endsWith('Gan') && (result.sipsin[s] === '편재' || result.sipsin[s] === '정재'),
  ).length;
}

/** 공망 지지 중 특정 묶음에 해당하는 슬롯들 (crossings.detectGongmangCross의 원시 조건과 동일) */
function gongmangSlotsByGroup(result: SajuResult, group: SipsinGroup) {
  const gongmang = result.gongmang ?? [];
  if (gongmang.length === 0) return [];
  return SIPSIN_SLOTS.filter((s) => {
    const glyph = glyphOfSlot(result, s);
    return !!glyph && gongmang.includes(glyph) && groupOfSlot(result, s) === group;
  });
}

/** 조후 원시 판정 — detector/johu의 분기와 동일 기준. 계절이 일간을 생하면 'support', 극하면 'pressure' */
function johuRelation(meter: OhaengMeter, result: SajuResult): 'support' | 'pressure' | null {
  const king = meter.season.kingOhaeng;
  const day = dayGanOhaeng(result);
  if (!king || !day) return null;
  if (isChildOf(king, day)) return 'support';
  if (isSanggeukOf(king, day)) return 'pressure';
  return null;
}

/** 조후 전체 판정 — 5분기(command·support·drain·pressure·control) 중 해당 축 반환 */
function johuFull(meter: OhaengMeter, result: SajuResult): 'command' | 'support' | 'drain' | 'pressure' | 'control' | null {
  const king = meter.season.kingOhaeng;
  const day = dayGanOhaeng(result);
  if (!king || !day) return null;
  if (king === day) return 'command';
  if (isChildOf(king, day)) return 'support';
  if (isChildOf(day, king)) return 'drain';
  if (isSanggeukOf(king, day)) return 'pressure';
  if (isSanggeukOf(day, king)) return 'control';
  return null;
}

/** 원진과 충이 같은 명식 안에 공존하는지 — 원진 6쌍과 충 6쌍은 지지 쌍이 수학적으로 분리되어
 *  같은 자리에서 겹칠 수 없으므로, '공존'으로 판정한다 (두 마찰이 한 명식에 겹친 구조). */
function findWonjinChungCoexist(result: SajuResult): {
  wonjinPair: { position1: string; branch1: string; position2: string; branch2: string };
  chung: { positions: string[]; jijis: string[] };
} | null {
  const wonjin = result.wonjin;
  if (!wonjin?.hasWonjin || wonjin.pairs.length === 0) return null;
  const chungRelations = (result.jijiRelations ?? []).filter((r) => r.type === '충');
  if (chungRelations.length === 0) return null;
  // 첫 번째 원진 쌍과 첫 번째 충 쌍의 공존을 대표로 잡는다
  return { wonjinPair: wonjin.pairs[0], chung: chungRelations[0] };
}

export function detectCombos(result: SajuResult): RawPattern[] {
  const meter = measureOhaeng(result);
  const weak = meter.dayMaster.verdict === 'weak';
  const strong = meter.dayMaster.verdict === 'strong';
  const counts = countGroups(result);
  const jaeExposed = exposedJaeCount(result) >= 2;
  const bigeopGwada = counts.bigeop >= 3;
  const insungGwada = counts.insung >= 3;
  const daeunFit = isDaeunFit(result);
  const daeunTension = isDaeunTension(result);
  const meterEvidence = [
    `비겁+인성 ${meter.dayMaster.score}% — ${meter.dayMaster.verdictLabel}`,
    `식상 ${counts.siksang}·재성 ${counts.jaesung}·관성 ${counts.gwansung}·인성 ${counts.insung}`,
  ];

  const patterns: RawPattern[] = [];
  const push = (key: string, strength: number, extra: string[]) =>
    patterns.push({ key, strength, evidence: [...meterEvidence, ...extra] });

  if (hasSangsaengSaengjae(result) && weak) {
    push('saju/combo/sangsaeng-saengjae--daymaster-weak', 0.6, ['식상생재 구조 + 신약']);
  }
  if (hasSangsaengSaengjae(result) && strong) {
    push('saju/combo/sangsaeng-saengjae--daymaster-strong', 0.65, ['식상생재 구조 + 신강']);
  }
  if (jaeExposed && bigeopGwada) {
    push('saju/combo/jaesung-nochul--bigeop-gwada', 0.65, [`천간 재성 노출 ${exposedJaeCount(result)} + 비겁 ${counts.bigeop}`]);
  }
  if (hasGwaninSangsaeng(result) && insungGwada) {
    push('saju/combo/gwanin-sangsaeng--insung-gwada', 0.6, [`관인상생 + 인성 ${counts.insung}`]);
  }
  if (weak && daeunFit) {
    push('saju/combo/daymaster-weak--daeun-fit', 0.7, ['신약 + 용신 대운']);
  }
  if (weak && daeunTension) {
    push('saju/combo/daymaster-weak--daeun-tension', 0.7, ['신약 + 기신 대운']);
  }
  if (strong && daeunFit) {
    push('saju/combo/daymaster-strong--daeun-fit', 0.65, ['신강 + 용신 대운']);
  }
  if (strong && daeunTension) {
    push('saju/combo/daymaster-strong--daeun-tension', 0.6, ['신강 + 기신 대운']);
  }

  // ---------- 2차 확장: 강약×과다 / 강약×공망 / 강약×조후 / 원진×충 / 흐름×과다 ----------
  const siksangGwada = counts.siksang >= 3;
  const gwansungGwada = counts.gwansung >= 3;

  if (gwansungGwada && weak) {
    patterns.push({
      key: 'saju/combo/gwansung-gwada--daymaster-weak',
      strength: 0.7,
      evidence: [...meterEvidence, `관성 ${counts.gwansung} + 신약`],
      figures: { dayMasterScore: meter.dayMaster.score },
      slots: SIPSIN_SLOTS.filter((s) => groupOfSlot(result, s) === 'gwansung').map((s) =>
        toPatternSlot(result, s),
      ),
    });
  }
  if (insungGwada && strong) {
    patterns.push({
      key: 'saju/combo/insung-gwada--daymaster-strong',
      strength: 0.6,
      evidence: [...meterEvidence, `인성 ${counts.insung} + 신강`],
      figures: { dayMasterScore: meter.dayMaster.score },
      slots: SIPSIN_SLOTS.filter((s) => groupOfSlot(result, s) === 'insung').map((s) =>
        toPatternSlot(result, s),
      ),
    });
  }
  if (jaeExposed && weak) {
    patterns.push({
      key: 'saju/combo/jaesung-nochul--daymaster-weak',
      strength: 0.7,
      evidence: [...meterEvidence, `천간 재성 노출 ${exposedJaeCount(result)} + 신약`],
      figures: { dayMasterScore: meter.dayMaster.score, exposed: exposedJaeCount(result) },
      slots: SIPSIN_SLOTS.filter(
        (s) => s.endsWith('Gan') && (result.sipsin[s] === '편재' || result.sipsin[s] === '정재'),
      ).map((s) => toPatternSlot(result, s)),
    });
  }

  const gongmangJaeSlots = gongmangSlotsByGroup(result, 'jaesung');
  if (gongmangJaeSlots.length > 0 && weak) {
    patterns.push({
      key: 'saju/combo/gongmang-jaesung--daymaster-weak',
      strength: 0.65,
      evidence: [
        ...meterEvidence,
        `공망 ${result.gongmang!.join('·')} — 재성 자리 ${gongmangJaeSlots.map((s) => `${posLabel(s)} ${glyphOfSlot(result, s)}`).join('·')} + 신약`,
      ],
      figures: { dayMasterScore: meter.dayMaster.score },
      slots: gongmangJaeSlots.map((s) => toPatternSlot(result, s)),
    });
  }

  const johu = johuRelation(meter, result);
  if (weak && johu === 'pressure') {
    patterns.push({
      key: 'saju/combo/daymaster-weak--johu-pressure',
      strength: 0.7,
      evidence: [
        ...meterEvidence,
        `월지 ${meter.season.monthJi} ${meter.season.name}·왕오행 ${meter.season.kingOhaeng}이 일간 ${result.palja.dayGan}(${dayGanOhaeng(result)})을 극함 + 신약`,
      ],
      figures: { dayMasterScore: meter.dayMaster.score, season: meter.season.name, king: meter.season.kingOhaeng },
    });
  }
  if (strong && johu === 'support') {
    patterns.push({
      key: 'saju/combo/daymaster-strong--johu-support',
      strength: 0.65,
      evidence: [
        ...meterEvidence,
        `월지 ${meter.season.monthJi} ${meter.season.name}·왕오행 ${meter.season.kingOhaeng}이 일간 ${result.palja.dayGan}(${dayGanOhaeng(result)})을 생함 + 신강`,
      ],
      figures: { dayMasterScore: meter.dayMaster.score, season: meter.season.name, king: meter.season.kingOhaeng },
    });
  }

  const wonjinChung = findWonjinChungCoexist(result);
  if (wonjinChung) {
    const wp = wonjinChung.wonjinPair;
    patterns.push({
      key: 'saju/combo/wonjin--jiji-chung',
      strength: 0.7,
      evidence: [
        `원진 ${wp.position1} ${wp.branch1}↔${wp.position2} ${wp.branch2} + 충 ${wonjinChung.chung.positions.map((p) => posLabel(p)).join('↔')} ${wonjinChung.chung.jijis.join('·')}`,
      ],
      slots: [
        { slot: wp.branch1, label: wp.position1, glyph: wp.branch1, sipsin: null, group: null },
        { slot: wp.branch2, label: wp.position2, glyph: wp.branch2, sipsin: null, group: null },
        ...wonjinChung.chung.jijis.map((ji, i) => ({
          slot: wonjinChung.chung.positions[i] ?? ji,
          label: posLabel(wonjinChung.chung.positions[i] ?? ji),
          glyph: ji,
          sipsin: null,
          group: null,
        })),
      ],
    });
  }

  if (hasSangsaengSaengjae(result) && siksangGwada) {
    patterns.push({
      key: 'saju/combo/sangsaeng-saengjae--siksang-gwada',
      strength: 0.6,
      evidence: [...meterEvidence, `식상생재 구조 + 식상 ${counts.siksang}`],
      slots: SIPSIN_SLOTS.filter((s) => groupOfSlot(result, s) === 'siksang').map((s) =>
        toPatternSlot(result, s),
      ),
    });
  }

  // ---------- 3차 확장: 흐름×강약 / 결핍×강약 / 관계×강약 ----------

  // 재생관×신약 — 재성·관성이 천간에 드러난 흐름이 있는데 일간이 약함
  const jaeGan = SIPSIN_SLOTS.filter(
    (s) => s.endsWith('Gan') && groupOfSlot(result, s) === 'jaesung',
  );
  const gwanGan = SIPSIN_SLOTS.filter(
    (s) => s.endsWith('Gan') && groupOfSlot(result, s) === 'gwansung',
  );
  if (jaeGan.length >= 1 && gwanGan.length >= 1 && weak) {
    patterns.push({
      key: 'saju/combo/jaesaeng-gwan--daymaster-weak',
      strength: 0.6,
      evidence: [...meterEvidence, `천간 재성 ${jaeGan.length}·관성 ${gwanGan.length} + 신약`],
      figures: { dayMasterScore: meter.dayMaster.score },
      slots: [...jaeGan, ...gwanGan].map((s) => toPatternSlot(result, s)),
    });
  }

  // 재생관×신강 — 재성·관성이 천간에 드러난 흐름이 있고 일간이 강함
  if (jaeGan.length >= 1 && gwanGan.length >= 1 && strong) {
    patterns.push({
      key: 'saju/combo/jaesaeng-gwan--daymaster-strong',
      strength: 0.6,
      evidence: [...meterEvidence, `천간 재성 ${jaeGan.length}·관성 ${gwanGan.length} + 신강`],
      figures: { dayMasterScore: meter.dayMaster.score },
      slots: [...jaeGan, ...gwanGan].map((s) => toPatternSlot(result, s)),
    });
  }

  // 식상제살×신강 — 편관 2+·식상 1+ 구조가 있는데 일간이 강함
  const pyeongwan = SIPSIN_SLOTS.filter((s) => sipsinNameOfSlot(result, s) === '편관');
  if (counts.siksang >= 1 && pyeongwan.length >= 2 && strong) {
    patterns.push({
      key: 'saju/combo/sangsaeng-jesal--daymaster-strong',
      strength: 0.65,
      evidence: [...meterEvidence, `편관 ${pyeongwan.length}·식상 ${counts.siksang} + 신강`],
      figures: { dayMasterScore: meter.dayMaster.score },
      slots: [...pyeongwan, ...SIPSIN_SLOTS.filter((s) => groupOfSlot(result, s) === 'siksang')].map(
        (s) => toPatternSlot(result, s),
      ),
    });
  }

  // 식상제살×신약 — 편관 2+·식상 1+ 구조가 있는데 일간이 약함
  if (counts.siksang >= 1 && pyeongwan.length >= 2 && weak) {
    patterns.push({
      key: 'saju/combo/sangsaeng-jesal--daymaster-weak',
      strength: 0.6,
      evidence: [...meterEvidence, `편관 ${pyeongwan.length}·식상 ${counts.siksang} + 신약`],
      figures: { dayMasterScore: meter.dayMaster.score },
      slots: [...pyeongwan, ...SIPSIN_SLOTS.filter((s) => groupOfSlot(result, s) === 'siksang')].map(
        (s) => toPatternSlot(result, s),
      ),
    });
  }

  // 오행결핍×신약 — 오행 분포에 결핍이 있는데 일간이 약함
  const missingOhaeng = meter.distribution.filter((d) => d.percent < 5).map((d) => d.ohaeng);
  if (missingOhaeng.length > 0 && weak) {
    patterns.push({
      key: 'saju/combo/ohaeng-missing--daymaster-weak',
      strength: 0.65,
      evidence: [...meterEvidence, `결핍 오행 ${missingOhaeng.join('·')} + 신약`],
      figures: { dayMasterScore: meter.dayMaster.score, missing: missingOhaeng.join('·') },
    });
  }

  // 충×신약 — 지지 충이 있는데 일간이 약함
  const chungRelations = (result.jijiRelations ?? []).filter((r) => r.type === '충');
  if (chungRelations.length > 0 && weak) {
    patterns.push({
      key: 'saju/combo/jiji-chung--daymaster-weak',
      strength: 0.65,
      evidence: [
        ...meterEvidence,
        `충 ${chungRelations.length}건 — ${chungRelations.map((r) => `${r.positions.map((p) => posLabel(p)).join('↔')} ${r.jijis.join('·')}`).join(' / ')} + 신약`,
      ],
      figures: { dayMasterScore: meter.dayMaster.score },
      slots: chungRelations.flatMap((r) =>
        r.jijis.map((ji, i) => ({
          slot: r.positions[i] ?? ji,
          label: posLabel(r.positions[i] ?? ji),
          glyph: ji,
          sipsin: null,
          group: null,
        })),
      ),
    });
  }

  // 충×신강 — 지지 충이 있는데 일간이 강함
  if (chungRelations.length > 0 && strong) {
    patterns.push({
      key: 'saju/combo/jiji-chung--daymaster-strong',
      strength: 0.6,
      evidence: [
        ...meterEvidence,
        `충 ${chungRelations.length}건 — ${chungRelations.map((r) => `${r.positions.map((p) => posLabel(p)).join('↔')} ${r.jijis.join('·')}`).join(' / ')} + 신강`,
      ],
      figures: { dayMasterScore: meter.dayMaster.score },
      slots: chungRelations.flatMap((r) =>
        r.jijis.map((ji, i) => ({
          slot: r.positions[i] ?? ji,
          label: posLabel(r.positions[i] ?? ji),
          glyph: ji,
          sipsin: null,
          group: null,
        })),
      ),
    });
  }

  // 비겁과다×신약 — 비겁이 과다한데 일간이 약함 (경쟁만 치열)
  if (bigeopGwada && weak) {
    patterns.push({
      key: 'saju/combo/bigeop-gwada--daymaster-weak',
      strength: 0.6,
      evidence: [...meterEvidence, `비겁 ${counts.bigeop} + 신약`],
      figures: { dayMasterScore: meter.dayMaster.score },
      slots: SIPSIN_SLOTS.filter((s) => groupOfSlot(result, s) === 'bigeop').map((s) =>
        toPatternSlot(result, s),
      ),
    });
  }

  // 관인상생×신강 — 관성·인성이 모두 있는데 일간이 강함
  if (hasGwaninSangsaeng(result) && strong) {
    patterns.push({
      key: 'saju/combo/gwanin-sangsaeng--daymaster-strong',
      strength: 0.6,
      evidence: [...meterEvidence, `관성 ${counts.gwansung}·인성 ${counts.insung} + 신강`],
      figures: { dayMasterScore: meter.dayMaster.score },
      slots: [
        ...SIPSIN_SLOTS.filter((s) => groupOfSlot(result, s) === 'gwansung'),
        ...SIPSIN_SLOTS.filter((s) => groupOfSlot(result, s) === 'insung'),
      ].map((s) => toPatternSlot(result, s)),
    });
  }

  // 관인상생×신약 — 관성·인성이 모두 있는데 일간이 약함
  if (hasGwaninSangsaeng(result) && weak) {
    patterns.push({
      key: 'saju/combo/gwanin-sangsaeng--daymaster-weak',
      strength: 0.6,
      evidence: [...meterEvidence, `관성 ${counts.gwansung}·인성 ${counts.insung} + 신약`],
      figures: { dayMasterScore: meter.dayMaster.score },
      slots: [
        ...SIPSIN_SLOTS.filter((s) => groupOfSlot(result, s) === 'gwansung'),
        ...SIPSIN_SLOTS.filter((s) => groupOfSlot(result, s) === 'insung'),
      ].map((s) => toPatternSlot(result, s)),
    });
  }

  // 관공망×신약 — 관성 자리에 공망이 걸려 있는데 일간이 약함
  const gongmangGwanSlots = gongmangSlotsByGroup(result, 'gwansung');
  if (gongmangGwanSlots.length > 0 && weak) {
    patterns.push({
      key: 'saju/combo/gongmang-gwansung--daymaster-weak',
      strength: 0.65,
      evidence: [
        ...meterEvidence,
        `공망 ${result.gongmang!.join('·')} — 관성 자리 ${gongmangGwanSlots.map((s) => `${posLabel(s)} ${glyphOfSlot(result, s)}`).join('·')} + 신약`,
      ],
      figures: { dayMasterScore: meter.dayMaster.score },
      slots: gongmangGwanSlots.map((s) => toPatternSlot(result, s)),
    });
  }

  // 식과다×신약 — 식상이 과다한데 일간이 약함
  if (siksangGwada && weak) {
    patterns.push({
      key: 'saju/combo/siksang-gwada--daymaster-weak',
      strength: 0.6,
      evidence: [...meterEvidence, `식상 ${counts.siksang} + 신약`],
      figures: { dayMasterScore: meter.dayMaster.score },
      slots: SIPSIN_SLOTS.filter((s) => groupOfSlot(result, s) === 'siksang').map((s) =>
        toPatternSlot(result, s),
      ),
    });
  }

  // ---------- 4차 확장: 흐름×대운 / 관계×대운 / 강약×세운 ----------

  // 세운 판정 — 천간·지지 이중 축(judgeGanJi). 'mixed'면 fit/tension 어느 쪽으로도 단정하지 않는다
  const seunJ = result.seun?.gan ? judgeGanJi(result, result.seun.gan, result.seun.ji) : null;
  const seunAxis = seunJ?.axisText ?? '';
  const seunFit = seunJ?.verdict === 'fit';
  const seunTension = seunJ?.verdict === 'tension';

  // 생재×용신운 — 식상생재 흐름이 있는데 대운이 용신
  if (hasSangsaengSaengjae(result) && daeunFit) {
    patterns.push({
      key: 'saju/combo/sangsaeng-saengjae--daeun-fit',
      strength: 0.7,
      evidence: [...meterEvidence, `식상생재 구조 + 용신 대운`],
      figures: { dayMasterScore: meter.dayMaster.score },
      slots: [
        ...SIPSIN_SLOTS.filter((s) => groupOfSlot(result, s) === 'siksang'),
        ...SIPSIN_SLOTS.filter((s) => groupOfSlot(result, s) === 'jaesung'),
      ].map((s) => toPatternSlot(result, s)),
    });
  }

  // 생재×기신운 — 식상생재 흐름이 있는데 대운이 기신
  if (hasSangsaengSaengjae(result) && daeunTension) {
    patterns.push({
      key: 'saju/combo/sangsaeng-saengjae--daeun-tension',
      strength: 0.65,
      evidence: [...meterEvidence, `식상생재 구조 + 기신 대운`],
      figures: { dayMasterScore: meter.dayMaster.score },
      slots: [
        ...SIPSIN_SLOTS.filter((s) => groupOfSlot(result, s) === 'siksang'),
        ...SIPSIN_SLOTS.filter((s) => groupOfSlot(result, s) === 'jaesung'),
      ].map((s) => toPatternSlot(result, s)),
    });
  }

  // 관인상생×용신운 — 관성·인성 흐름이 있는데 대운이 용신
  if (hasGwaninSangsaeng(result) && daeunFit) {
    patterns.push({
      key: 'saju/combo/gwanin-sangsaeng--daeun-fit',
      strength: 0.7,
      evidence: [...meterEvidence, `관인상생 구조 + 용신 대운`],
      figures: { dayMasterScore: meter.dayMaster.score },
      slots: [
        ...SIPSIN_SLOTS.filter((s) => groupOfSlot(result, s) === 'gwansung'),
        ...SIPSIN_SLOTS.filter((s) => groupOfSlot(result, s) === 'insung'),
      ].map((s) => toPatternSlot(result, s)),
    });
  }

  // 관인상생×기신운 — 관성·인성 흐름이 있는데 대운이 기신
  if (hasGwaninSangsaeng(result) && daeunTension) {
    patterns.push({
      key: 'saju/combo/gwanin-sangsaeng--daeun-tension',
      strength: 0.65,
      evidence: [...meterEvidence, `관인상생 구조 + 기신 대운`],
      figures: { dayMasterScore: meter.dayMaster.score },
      slots: [
        ...SIPSIN_SLOTS.filter((s) => groupOfSlot(result, s) === 'gwansung'),
        ...SIPSIN_SLOTS.filter((s) => groupOfSlot(result, s) === 'insung'),
      ].map((s) => toPatternSlot(result, s)),
    });
  }

  // 충×기신운 — 지지 충이 있는데 대운이 기신
  if (chungRelations.length > 0 && daeunTension) {
    patterns.push({
      key: 'saju/combo/jiji-chung--daeun-tension',
      strength: 0.7,
      evidence: [
        ...meterEvidence,
        `충 ${chungRelations.length}건 + 기신 대운`,
      ],
      figures: { dayMasterScore: meter.dayMaster.score },
      slots: chungRelations.flatMap((r) =>
        r.jijis.map((ji, i) => ({
          slot: r.positions[i] ?? ji,
          label: posLabel(r.positions[i] ?? ji),
          glyph: ji,
          sipsin: null,
          group: null,
        })),
      ),
    });
  }

  // 원진×기신운 — 원진이 있는데 대운이 기신
  const wonjin = result.wonjin;
  if (wonjin?.hasWonjin && daeunTension) {
    patterns.push({
      key: 'saju/combo/wonjin--daeun-tension',
      strength: 0.65,
      evidence: [
        ...meterEvidence,
        `원진 ${wonjin.pairs.length}건 + 기신 대운`,
      ],
      figures: { dayMasterScore: meter.dayMaster.score },
      slots: wonjin.pairs.flatMap((p) => [
        { slot: p.branch1, label: p.position1, glyph: p.branch1, sipsin: null, group: null },
        { slot: p.branch2, label: p.position2, glyph: p.branch2, sipsin: null, group: null },
      ]),
    });
  }

  // 신약×세운용신 — 일간이 약한데 세운이 용신
  if (weak && seunFit) {
    patterns.push({
      key: 'saju/combo/daymaster-weak--seun-fit',
      strength: 0.65,
      evidence: [...meterEvidence, `세운 ${result.seun.gan}${result.seun.ji}(${seunAxis})=용신 + 신약`],
      figures: { dayMasterScore: meter.dayMaster.score, seunGanJi: `${result.seun.gan}${result.seun.ji}` },
    });
  }

  // 신강×세운기신 — 일간이 강한데 세운이 기신
  if (strong && seunTension) {
    patterns.push({
      key: 'saju/combo/daymaster-strong--seun-tension',
      strength: 0.6,
      evidence: [...meterEvidence, `세운 ${result.seun.gan}${result.seun.ji}(${seunAxis})=기신 + 신강`],
      figures: { dayMasterScore: meter.dayMaster.score, seunGanJi: `${result.seun.gan}${result.seun.ji}` },
    });
  }

  // ---------- 5차 확장: 흐름×세운 / 관계×세운 / 흐름×대운 잔여 ----------

  // 생재×세운용신 — 식상생재 흐름이 있는데 세운이 용신
  if (hasSangsaengSaengjae(result) && seunFit) {
    patterns.push({
      key: 'saju/combo/sangsaeng-saengjae--seun-fit',
      strength: 0.65,
      evidence: [...meterEvidence, `식상생재 구조 + 세운 ${result.seun.gan}${result.seun.ji}(${seunAxis})=용신`],
      figures: { dayMasterScore: meter.dayMaster.score, seunGanJi: `${result.seun.gan}${result.seun.ji}` },
      slots: [
        ...SIPSIN_SLOTS.filter((s) => groupOfSlot(result, s) === 'siksang'),
        ...SIPSIN_SLOTS.filter((s) => groupOfSlot(result, s) === 'jaesung'),
      ].map((s) => toPatternSlot(result, s)),
    });
  }

  // 생재×세운기신 — 식상생재 흐름이 있는데 세운이 기신
  if (hasSangsaengSaengjae(result) && seunTension) {
    patterns.push({
      key: 'saju/combo/sangsaeng-saengjae--seun-tension',
      strength: 0.6,
      evidence: [...meterEvidence, `식상생재 구조 + 세운 ${result.seun.gan}${result.seun.ji}(${seunAxis})=기신`],
      figures: { dayMasterScore: meter.dayMaster.score, seunGanJi: `${result.seun.gan}${result.seun.ji}` },
      slots: [
        ...SIPSIN_SLOTS.filter((s) => groupOfSlot(result, s) === 'siksang'),
        ...SIPSIN_SLOTS.filter((s) => groupOfSlot(result, s) === 'jaesung'),
      ].map((s) => toPatternSlot(result, s)),
    });
  }

  // 관인상생×세운용신 — 관성·인성 흐름이 있는데 세운이 용신
  if (hasGwaninSangsaeng(result) && seunFit) {
    patterns.push({
      key: 'saju/combo/gwanin-sangsaeng--seun-fit',
      strength: 0.65,
      evidence: [...meterEvidence, `관인상생 구조 + 세운 ${result.seun.gan}${result.seun.ji}(${seunAxis})=용신`],
      figures: { dayMasterScore: meter.dayMaster.score, seunGanJi: `${result.seun.gan}${result.seun.ji}` },
      slots: [
        ...SIPSIN_SLOTS.filter((s) => groupOfSlot(result, s) === 'gwansung'),
        ...SIPSIN_SLOTS.filter((s) => groupOfSlot(result, s) === 'insung'),
      ].map((s) => toPatternSlot(result, s)),
    });
  }

  // 관인상생×세운기신 — 관성·인성 흐름이 있는데 세운이 기신
  if (hasGwaninSangsaeng(result) && seunTension) {
    patterns.push({
      key: 'saju/combo/gwanin-sangsaeng--seun-tension',
      strength: 0.6,
      evidence: [...meterEvidence, `관인상생 구조 + 세운 ${result.seun.gan}${result.seun.ji}(${seunAxis})=기신`],
      figures: { dayMasterScore: meter.dayMaster.score, seunGanJi: `${result.seun.gan}${result.seun.ji}` },
      slots: [
        ...SIPSIN_SLOTS.filter((s) => groupOfSlot(result, s) === 'gwansung'),
        ...SIPSIN_SLOTS.filter((s) => groupOfSlot(result, s) === 'insung'),
      ].map((s) => toPatternSlot(result, s)),
    });
  }

  // 충×세운기신 — 지지 충이 있는데 세운이 기신
  if (chungRelations.length > 0 && seunTension) {
    patterns.push({
      key: 'saju/combo/jiji-chung--seun-tension',
      strength: 0.65,
      evidence: [
        ...meterEvidence,
        `충 ${chungRelations.length}건 + 세운 ${result.seun.gan}${result.seun.ji}(${seunAxis})=기신`,
      ],
      figures: { dayMasterScore: meter.dayMaster.score, seunGanJi: `${result.seun.gan}${result.seun.ji}` },
      slots: chungRelations.flatMap((r) =>
        r.jijis.map((ji, i) => ({
          slot: r.positions[i] ?? ji,
          label: posLabel(r.positions[i] ?? ji),
          glyph: ji,
          sipsin: null,
          group: null,
        })),
      ),
    });
  }

  // 원진×세운기신 — 원진이 있는데 세운이 기신
  if (wonjin?.hasWonjin && seunTension) {
    patterns.push({
      key: 'saju/combo/wonjin--seun-tension',
      strength: 0.6,
      evidence: [
        ...meterEvidence,
        `원진 ${wonjin.pairs.length}건 + 세운 ${result.seun.gan}${result.seun.ji}(${seunAxis})=기신`,
      ],
      figures: { dayMasterScore: meter.dayMaster.score, seunGanJi: `${result.seun.gan}${result.seun.ji}` },
      slots: wonjin.pairs.flatMap((p) => [
        { slot: p.branch1, label: p.position1, glyph: p.branch1, sipsin: null, group: null },
        { slot: p.branch2, label: p.position2, glyph: p.branch2, sipsin: null, group: null },
      ]),
    });
  }

  // 재생관×용신운 — 천간 재성·관성 흐름이 있는데 대운이 용신
  if (jaeGan.length >= 1 && gwanGan.length >= 1 && daeunFit) {
    patterns.push({
      key: 'saju/combo/jaesaeng-gwan--daeun-fit',
      strength: 0.65,
      evidence: [...meterEvidence, `천간 재성 ${jaeGan.length}·관성 ${gwanGan.length} + 용신 대운`],
      figures: { dayMasterScore: meter.dayMaster.score },
      slots: [...jaeGan, ...gwanGan].map((s) => toPatternSlot(result, s)),
    });
  }

  // 식상제살×용신운 — 편관 2+·식상 1+ 구조가 있는데 대운이 용신
  if (counts.siksang >= 1 && pyeongwan.length >= 2 && daeunFit) {
    patterns.push({
      key: 'saju/combo/sangsaeng-jesal--daeun-fit',
      strength: 0.65,
      evidence: [...meterEvidence, `편관 ${pyeongwan.length}·식상 ${counts.siksang} + 용신 대운`],
      figures: { dayMasterScore: meter.dayMaster.score },
      slots: [...pyeongwan, ...SIPSIN_SLOTS.filter((s) => groupOfSlot(result, s) === 'siksang')].map(
        (s) => toPatternSlot(result, s),
      ),
    });
  }

  // ---------- 6차 확장: 과다×기신운 / 결핍×용신운 / 노출×세운 / 관계×세운용신 ----------

  // 비겁과다×기신운 — 비겁이 과다한데 대운이 기신
  if (bigeopGwada && daeunTension) {
    patterns.push({
      key: 'saju/combo/bigeop-gwada--daeun-tension',
      strength: 0.65,
      evidence: [...meterEvidence, `비겁 ${counts.bigeop} + 기신 대운`],
      figures: { dayMasterScore: meter.dayMaster.score },
      slots: SIPSIN_SLOTS.filter((s) => groupOfSlot(result, s) === 'bigeop').map((s) =>
        toPatternSlot(result, s),
      ),
    });
  }

  // 인과다×기신운 — 인성이 과다한데 대운이 기신
  if (insungGwada && daeunTension) {
    patterns.push({
      key: 'saju/combo/insung-gwada--daeun-tension',
      strength: 0.6,
      evidence: [...meterEvidence, `인성 ${counts.insung} + 기신 대운`],
      figures: { dayMasterScore: meter.dayMaster.score },
      slots: SIPSIN_SLOTS.filter((s) => groupOfSlot(result, s) === 'insung').map((s) =>
        toPatternSlot(result, s),
      ),
    });
  }

  // 식과다×기신운 — 식상이 과다한데 대운이 기신
  if (siksangGwada && daeunTension) {
    patterns.push({
      key: 'saju/combo/siksang-gwada--daeun-tension',
      strength: 0.6,
      evidence: [...meterEvidence, `식상 ${counts.siksang} + 기신 대운`],
      figures: { dayMasterScore: meter.dayMaster.score },
      slots: SIPSIN_SLOTS.filter((s) => groupOfSlot(result, s) === 'siksang').map((s) =>
        toPatternSlot(result, s),
      ),
    });
  }

  // 재노출×세운기신 — 천간 재성 노출이 있는데 세운이 기신
  if (jaeExposed && seunTension) {
    patterns.push({
      key: 'saju/combo/jaesung-nochul--seun-tension',
      strength: 0.6,
      evidence: [
        ...meterEvidence,
        `천간 재성 노출 ${exposedJaeCount(result)} + 세운 ${result.seun.gan}${result.seun.ji}(${seunAxis})=기신`,
      ],
      figures: { dayMasterScore: meter.dayMaster.score, seunGanJi: `${result.seun.gan}${result.seun.ji}` },
      slots: SIPSIN_SLOTS.filter(
        (s) => s.endsWith('Gan') && (result.sipsin[s] === '편재' || result.sipsin[s] === '정재'),
      ).map((s) => toPatternSlot(result, s)),
    });
  }

  // 오행결핍×용신운 — 결핍 오행이 있는데 대운이 용신
  if (missingOhaeng.length > 0 && daeunFit) {
    patterns.push({
      key: 'saju/combo/ohaeng-missing--daeun-fit',
      strength: 0.6,
      evidence: [...meterEvidence, `결핍 오행 ${missingOhaeng.join('·')} + 용신 대운`],
      figures: { dayMasterScore: meter.dayMaster.score, missing: missingOhaeng.join('·') },
    });
  }

  // 오행결핍×세운용신 — 결핍 오행이 있는데 세운이 용신
  if (missingOhaeng.length > 0 && seunFit) {
    patterns.push({
      key: 'saju/combo/ohaeng-missing--seun-fit',
      strength: 0.55,
      evidence: [
        ...meterEvidence,
        `결핍 오행 ${missingOhaeng.join('·')} + 세운 ${result.seun.gan}${result.seun.ji}(${seunAxis})=용신`,
      ],
      figures: { dayMasterScore: meter.dayMaster.score, seunGanJi: `${result.seun.gan}${result.seun.ji}`, missing: missingOhaeng.join('·') },
    });
  }

  // 충×세운용신 — 지지 충이 있는데 세운이 용신
  if (chungRelations.length > 0 && seunFit) {
    patterns.push({
      key: 'saju/combo/jiji-chung--seun-fit',
      strength: 0.6,
      evidence: [
        ...meterEvidence,
        `충 ${chungRelations.length}건 + 세운 ${result.seun.gan}${result.seun.ji}(${seunAxis})=용신`,
      ],
      figures: { dayMasterScore: meter.dayMaster.score, seunGanJi: `${result.seun.gan}${result.seun.ji}` },
      slots: chungRelations.flatMap((r) =>
        r.jijis.map((ji, i) => ({
          slot: r.positions[i] ?? ji,
          label: posLabel(r.positions[i] ?? ji),
          glyph: ji,
          sipsin: null,
          group: null,
        })),
      ),
    });
  }

  // 원진×세운용신 — 원진이 있는데 세운이 용신
  if (wonjin?.hasWonjin && seunFit) {
    patterns.push({
      key: 'saju/combo/wonjin--seun-fit',
      strength: 0.55,
      evidence: [
        ...meterEvidence,
        `원진 ${wonjin.pairs.length}건 + 세운 ${result.seun.gan}${result.seun.ji}(${seunAxis})=용신`,
      ],
      figures: { dayMasterScore: meter.dayMaster.score, seunGanJi: `${result.seun.gan}${result.seun.ji}` },
      slots: wonjin.pairs.flatMap((p) => [
        { slot: p.branch1, label: p.position1, glyph: p.branch1, sipsin: null, group: null },
        { slot: p.branch2, label: p.position2, glyph: p.branch2, sipsin: null, group: null },
      ]),
    });
  }

  // ---------- 7차 확장: 공망×운 / 합·형·해×운 / 강약×조후 잔여 ----------

  // 재공망×기신운 — 재성 자리에 공망이 걸려 있는데 대운이 기신
  if (gongmangJaeSlots.length > 0 && daeunTension) {
    patterns.push({
      key: 'saju/combo/gongmang-jaesung--daeun-tension',
      strength: 0.65,
      evidence: [
        ...meterEvidence,
        `공망 ${result.gongmang!.join('·')} — 재성 자리 ${gongmangJaeSlots.map((s) => `${posLabel(s)} ${glyphOfSlot(result, s)}`).join('·')} + 기신 대운`,
      ],
      figures: { dayMasterScore: meter.dayMaster.score },
      slots: gongmangJaeSlots.map((s) => toPatternSlot(result, s)),
    });
  }

  // 관공망×기신운 — 관성 자리에 공망이 걸려 있는데 대운이 기신
  if (gongmangGwanSlots.length > 0 && daeunTension) {
    patterns.push({
      key: 'saju/combo/gongmang-gwansung--daeun-tension',
      strength: 0.6,
      evidence: [
        ...meterEvidence,
        `공망 ${result.gongmang!.join('·')} — 관성 자리 ${gongmangGwanSlots.map((s) => `${posLabel(s)} ${glyphOfSlot(result, s)}`).join('·')} + 기신 대운`,
      ],
      figures: { dayMasterScore: meter.dayMaster.score },
      slots: gongmangGwanSlots.map((s) => toPatternSlot(result, s)),
    });
  }

  const hapRelations = (result.jijiRelations ?? []).filter((r) => r.type === '합');
  const hyeongRelations = (result.jijiRelations ?? []).filter((r) => r.type === '형');
  const haeRelations = (result.jijiRelations ?? []).filter((r) => r.type === '해');

  // 합×용신운 — 지지 합이 있는데 대운이 용신
  if (hapRelations.length > 0 && daeunFit) {
    patterns.push({
      key: 'saju/combo/jiji-hap--daeun-fit',
      strength: 0.6,
      evidence: [
        ...meterEvidence,
        `합 ${hapRelations.length}건 — ${hapRelations.map((r) => `${r.positions.map((p) => posLabel(p)).join('↔')} ${r.jijis.join('·')}`).join(' / ')} + 용신 대운`,
      ],
      figures: { dayMasterScore: meter.dayMaster.score },
      slots: hapRelations.flatMap((r) =>
        r.jijis.map((ji, i) => ({
          slot: r.positions[i] ?? ji,
          label: posLabel(r.positions[i] ?? ji),
          glyph: ji,
          sipsin: null,
          group: null,
        })),
      ),
    });
  }

  // 합×기신운 — 지지 합이 있는데 대운이 기신
  if (hapRelations.length > 0 && daeunTension) {
    patterns.push({
      key: 'saju/combo/jiji-hap--daeun-tension',
      strength: 0.6,
      evidence: [
        ...meterEvidence,
        `합 ${hapRelations.length}건 — ${hapRelations.map((r) => `${r.positions.map((p) => posLabel(p)).join('↔')} ${r.jijis.join('·')}`).join(' / ')} + 기신 대운`,
      ],
      figures: { dayMasterScore: meter.dayMaster.score },
      slots: hapRelations.flatMap((r) =>
        r.jijis.map((ji, i) => ({
          slot: r.positions[i] ?? ji,
          label: posLabel(r.positions[i] ?? ji),
          glyph: ji,
          sipsin: null,
          group: null,
        })),
      ),
    });
  }

  // 형×기신운 — 지지 형이 있는데 대운이 기신
  if (hyeongRelations.length > 0 && daeunTension) {
    patterns.push({
      key: 'saju/combo/jiji-hyeong--daeun-tension',
      strength: 0.65,
      evidence: [
        ...meterEvidence,
        `형 ${hyeongRelations.length}건 — ${hyeongRelations.map((r) => `${r.positions.map((p) => posLabel(p)).join('↔')} ${r.jijis.join('·')}`).join(' / ')} + 기신 대운`,
      ],
      figures: { dayMasterScore: meter.dayMaster.score },
      slots: hyeongRelations.flatMap((r) =>
        r.jijis.map((ji, i) => ({
          slot: r.positions[i] ?? ji,
          label: posLabel(r.positions[i] ?? ji),
          glyph: ji,
          sipsin: null,
          group: null,
        })),
      ),
    });
  }

  // 해×기신운 — 지지 해가 있는데 대운이 기신
  if (haeRelations.length > 0 && daeunTension) {
    patterns.push({
      key: 'saju/combo/jiji-hae--daeun-tension',
      strength: 0.6,
      evidence: [
        ...meterEvidence,
        `해 ${haeRelations.length}건 — ${haeRelations.map((r) => `${r.positions.map((p) => posLabel(p)).join('↔')} ${r.jijis.join('·')}`).join(' / ')} + 기신 대운`,
      ],
      figures: { dayMasterScore: meter.dayMaster.score },
      slots: haeRelations.flatMap((r) =>
        r.jijis.map((ji, i) => ({
          slot: r.positions[i] ?? ji,
          label: posLabel(r.positions[i] ?? ji),
          glyph: ji,
          sipsin: null,
          group: null,
        })),
      ),
    });
  }

  // 신약×계절후원 — 일간이 약한데 계절이 일간을 생함
  if (weak && johu === 'support') {
    patterns.push({
      key: 'saju/combo/daymaster-weak--johu-support',
      strength: 0.6,
      evidence: [
        ...meterEvidence,
        `월지 ${meter.season.monthJi} ${meter.season.name}·왕오행 ${meter.season.kingOhaeng}이 일간 ${result.palja.dayGan}(${dayGanOhaeng(result)})을 생함 + 신약`,
      ],
      figures: { dayMasterScore: meter.dayMaster.score, season: meter.season.name, king: meter.season.kingOhaeng },
    });
  }

  // 신강×계절압박 — 일간이 강한데 계절이 일간을 극함
  if (strong && johu === 'pressure') {
    patterns.push({
      key: 'saju/combo/daymaster-strong--johu-pressure',
      strength: 0.6,
      evidence: [
        ...meterEvidence,
        `월지 ${meter.season.monthJi} ${meter.season.name}·왕오행 ${meter.season.kingOhaeng}이 일간 ${result.palja.dayGan}(${dayGanOhaeng(result)})을 극함 + 신강`,
      ],
      figures: { dayMasterScore: meter.dayMaster.score, season: meter.season.name, king: meter.season.kingOhaeng },
    });
  }

  // ---------- 8차 확장: 십신 쌍×강약 / 삼합·방합·파×운 / 공망×세운 / 결핍×기신운 ----------

  // 식상제관×신강 — 식상이 관성을 극하는 구조인데 일간이 강함
  if (counts.siksang >= 1 && counts.gwansung >= 1 && strong) {
    patterns.push({
      key: 'saju/combo/siksang-gwansung--daymaster-strong',
      strength: 0.6,
      evidence: [...meterEvidence, `식상 ${counts.siksang}·관성 ${counts.gwansung} + 신강`],
      figures: { dayMasterScore: meter.dayMaster.score },
      slots: [
        ...SIPSIN_SLOTS.filter((s) => groupOfSlot(result, s) === 'siksang'),
        ...SIPSIN_SLOTS.filter((s) => groupOfSlot(result, s) === 'gwansung'),
      ].map((s) => toPatternSlot(result, s)),
    });
  }

  // 재인상극×신약 — 재성·인성이 공존하는데 일간이 약함 (재성이 인성을 극함)
  if (counts.jaesung >= 1 && counts.insung >= 1 && weak) {
    patterns.push({
      key: 'saju/combo/jaesung-insung--daymaster-weak',
      strength: 0.6,
      evidence: [...meterEvidence, `재성 ${counts.jaesung}·인성 ${counts.insung} + 신약`],
      figures: { dayMasterScore: meter.dayMaster.score },
      slots: [
        ...SIPSIN_SLOTS.filter((s) => groupOfSlot(result, s) === 'jaesung'),
        ...SIPSIN_SLOTS.filter((s) => groupOfSlot(result, s) === 'insung'),
      ].map((s) => toPatternSlot(result, s)),
    });
  }

  const samhapRelations = (result.jijiRelations ?? []).filter((r) => r.type === '삼합');
  const paRelations = (result.jijiRelations ?? []).filter((r) => r.type === '파');

  // 삼합×용신운 — 삼합이 있는데 대운이 용신
  if (samhapRelations.length > 0 && daeunFit) {
    patterns.push({
      key: 'saju/combo/samhap--daeun-fit',
      strength: 0.65,
      evidence: [
        ...meterEvidence,
        `삼합 ${samhapRelations.map((r) => r.jijis.join('·')).join(' / ')} + 용신 대운`,
      ],
      figures: { dayMasterScore: meter.dayMaster.score },
      slots: samhapRelations.flatMap((r) =>
        r.jijis.map((ji, i) => ({
          slot: r.positions[i] ?? ji,
          label: posLabel(r.positions[i] ?? ji),
          glyph: ji,
          sipsin: null,
          group: null,
        })),
      ),
    });
  }

  // 삼합×기신운 — 삼합이 있는데 대운이 기신
  if (samhapRelations.length > 0 && daeunTension) {
    patterns.push({
      key: 'saju/combo/samhap--daeun-tension',
      strength: 0.6,
      evidence: [
        ...meterEvidence,
        `삼합 ${samhapRelations.map((r) => r.jijis.join('·')).join(' / ')} + 기신 대운`,
      ],
      figures: { dayMasterScore: meter.dayMaster.score },
      slots: samhapRelations.flatMap((r) =>
        r.jijis.map((ji, i) => ({
          slot: r.positions[i] ?? ji,
          label: posLabel(r.positions[i] ?? ji),
          glyph: ji,
          sipsin: null,
          group: null,
        })),
      ),
    });
  }

  // 파×기신운 — 지지 파가 있는데 대운이 기신
  if (paRelations.length > 0 && daeunTension) {
    patterns.push({
      key: 'saju/combo/jiji-pa--daeun-tension',
      strength: 0.6,
      evidence: [
        ...meterEvidence,
        `파 ${paRelations.length}건 — ${paRelations.map((r) => `${r.positions.map((p) => posLabel(p)).join('↔')} ${r.jijis.join('·')}`).join(' / ')} + 기신 대운`,
      ],
      figures: { dayMasterScore: meter.dayMaster.score },
      slots: paRelations.flatMap((r) =>
        r.jijis.map((ji, i) => ({
          slot: r.positions[i] ?? ji,
          label: posLabel(r.positions[i] ?? ji),
          glyph: ji,
          sipsin: null,
          group: null,
        })),
      ),
    });
  }

  // 재공망×세운기신 — 재성 자리 공망인데 세운이 기신
  if (gongmangJaeSlots.length > 0 && seunTension) {
    patterns.push({
      key: 'saju/combo/gongmang-jaesung--seun-tension',
      strength: 0.6,
      evidence: [
        ...meterEvidence,
        `공망 ${result.gongmang!.join('·')} — 재성 자리 ${gongmangJaeSlots.map((s) => `${posLabel(s)} ${glyphOfSlot(result, s)}`).join('·')} + 세운 ${result.seun.gan}${result.seun.ji}(${seunAxis})=기신`,
      ],
      figures: { dayMasterScore: meter.dayMaster.score, seunGanJi: `${result.seun.gan}${result.seun.ji}` },
      slots: gongmangJaeSlots.map((s) => toPatternSlot(result, s)),
    });
  }

  // 관공망×세운기신 — 관성 자리 공망인데 세운이 기신
  if (gongmangGwanSlots.length > 0 && seunTension) {
    patterns.push({
      key: 'saju/combo/gongmang-gwansung--seun-tension',
      strength: 0.55,
      evidence: [
        ...meterEvidence,
        `공망 ${result.gongmang!.join('·')} — 관성 자리 ${gongmangGwanSlots.map((s) => `${posLabel(s)} ${glyphOfSlot(result, s)}`).join('·')} + 세운 ${result.seun.gan}${result.seun.ji}(${seunAxis})=기신`,
      ],
      figures: { dayMasterScore: meter.dayMaster.score, seunGanJi: `${result.seun.gan}${result.seun.ji}` },
      slots: gongmangGwanSlots.map((s) => toPatternSlot(result, s)),
    });
  }

  // 오행결핍×기신운 — 결핍 오행이 있는데 대운이 기신
  if (missingOhaeng.length > 0 && daeunTension) {
    patterns.push({
      key: 'saju/combo/ohaeng-missing--daeun-tension',
      strength: 0.6,
      evidence: [...meterEvidence, `결핍 오행 ${missingOhaeng.join('·')} + 기신 대운`],
      figures: { dayMasterScore: meter.dayMaster.score, missing: missingOhaeng.join('·') },
    });
  }

  // ---------- 9차 확장: 삼합·방합·합·형·해 × 세운 / 방합 × 대운 ----------

  const banghapRelations = (result.jijiRelations ?? []).filter((r) => r.type === '방합');

  // 삼합×세운용신 — 삼합 국이 있는데 세운이 용신
  if (samhapRelations.length > 0 && seunFit) {
    patterns.push({
      key: 'saju/combo/samhap--seun-fit',
      strength: 0.6,
      evidence: [
        ...meterEvidence,
        `삼합 ${samhapRelations.map((r) => r.jijis.join('·')).join(' / ')} + 세운 ${result.seun.gan}${result.seun.ji}(${seunAxis})=용신`,
      ],
      figures: { dayMasterScore: meter.dayMaster.score, seunGanJi: `${result.seun.gan}${result.seun.ji}` },
      slots: samhapRelations.flatMap((r) =>
        r.jijis.map((ji, i) => ({
          slot: r.positions[i] ?? ji,
          label: posLabel(r.positions[i] ?? ji),
          glyph: ji,
          sipsin: null,
          group: null,
        })),
      ),
    });
  }

  // 삼합×세운기신 — 삼합 국이 있는데 세운이 기신
  if (samhapRelations.length > 0 && seunTension) {
    patterns.push({
      key: 'saju/combo/samhap--seun-tension',
      strength: 0.6,
      evidence: [
        ...meterEvidence,
        `삼합 ${samhapRelations.map((r) => r.jijis.join('·')).join(' / ')} + 세운 ${result.seun.gan}${result.seun.ji}(${seunAxis})=기신`,
      ],
      figures: { dayMasterScore: meter.dayMaster.score, seunGanJi: `${result.seun.gan}${result.seun.ji}` },
      slots: samhapRelations.flatMap((r) =>
        r.jijis.map((ji, i) => ({
          slot: r.positions[i] ?? ji,
          label: posLabel(r.positions[i] ?? ji),
          glyph: ji,
          sipsin: null,
          group: null,
        })),
      ),
    });
  }

  // 방합×용신운 — 계절 방합이 있는데 대운이 용신
  if (banghapRelations.length > 0 && daeunFit) {
    patterns.push({
      key: 'saju/combo/banghap--daeun-fit',
      strength: 0.6,
      evidence: [
        ...meterEvidence,
        `방합 ${banghapRelations.map((r) => r.jijis.join('·')).join(' / ')} + 용신 대운`,
      ],
      figures: { dayMasterScore: meter.dayMaster.score },
      slots: banghapRelations.flatMap((r) =>
        r.jijis.map((ji, i) => ({
          slot: r.positions[i] ?? ji,
          label: posLabel(r.positions[i] ?? ji),
          glyph: ji,
          sipsin: null,
          group: null,
        })),
      ),
    });
  }

  // 방합×기신운 — 계절 방합이 있는데 대운이 기신
  if (banghapRelations.length > 0 && daeunTension) {
    patterns.push({
      key: 'saju/combo/banghap--daeun-tension',
      strength: 0.6,
      evidence: [
        ...meterEvidence,
        `방합 ${banghapRelations.map((r) => r.jijis.join('·')).join(' / ')} + 기신 대운`,
      ],
      figures: { dayMasterScore: meter.dayMaster.score },
      slots: banghapRelations.flatMap((r) =>
        r.jijis.map((ji, i) => ({
          slot: r.positions[i] ?? ji,
          label: posLabel(r.positions[i] ?? ji),
          glyph: ji,
          sipsin: null,
          group: null,
        })),
      ),
    });
  }

  // 합×세운용신 — 지지 합이 있는데 세운이 용신
  if (hapRelations.length > 0 && seunFit) {
    patterns.push({
      key: 'saju/combo/jiji-hap--seun-fit',
      strength: 0.55,
      evidence: [
        ...meterEvidence,
        `합 ${hapRelations.length}건 — ${hapRelations.map((r) => `${r.positions.map((p) => posLabel(p)).join('↔')} ${r.jijis.join('·')}`).join(' / ')} + 세운 ${result.seun.gan}${result.seun.ji}(${seunAxis})=용신`,
      ],
      figures: { dayMasterScore: meter.dayMaster.score, seunGanJi: `${result.seun.gan}${result.seun.ji}` },
      slots: hapRelations.flatMap((r) =>
        r.jijis.map((ji, i) => ({
          slot: r.positions[i] ?? ji,
          label: posLabel(r.positions[i] ?? ji),
          glyph: ji,
          sipsin: null,
          group: null,
        })),
      ),
    });
  }

  // 합×세운기신 — 지지 합이 있는데 세운이 기신
  if (hapRelations.length > 0 && seunTension) {
    patterns.push({
      key: 'saju/combo/jiji-hap--seun-tension',
      strength: 0.55,
      evidence: [
        ...meterEvidence,
        `합 ${hapRelations.length}건 — ${hapRelations.map((r) => `${r.positions.map((p) => posLabel(p)).join('↔')} ${r.jijis.join('·')}`).join(' / ')} + 세운 ${result.seun.gan}${result.seun.ji}(${seunAxis})=기신`,
      ],
      figures: { dayMasterScore: meter.dayMaster.score, seunGanJi: `${result.seun.gan}${result.seun.ji}` },
      slots: hapRelations.flatMap((r) =>
        r.jijis.map((ji, i) => ({
          slot: r.positions[i] ?? ji,
          label: posLabel(r.positions[i] ?? ji),
          glyph: ji,
          sipsin: null,
          group: null,
        })),
      ),
    });
  }

  // 형×세운기신 — 지지 형이 있는데 세운이 기신
  if (hyeongRelations.length > 0 && seunTension) {
    patterns.push({
      key: 'saju/combo/jiji-hyeong--seun-tension',
      strength: 0.6,
      evidence: [
        ...meterEvidence,
        `형 ${hyeongRelations.length}건 — ${hyeongRelations.map((r) => `${r.positions.map((p) => posLabel(p)).join('↔')} ${r.jijis.join('·')}`).join(' / ')} + 세운 ${result.seun.gan}${result.seun.ji}(${seunAxis})=기신`,
      ],
      figures: { dayMasterScore: meter.dayMaster.score, seunGanJi: `${result.seun.gan}${result.seun.ji}` },
      slots: hyeongRelations.flatMap((r) =>
        r.jijis.map((ji, i) => ({
          slot: r.positions[i] ?? ji,
          label: posLabel(r.positions[i] ?? ji),
          glyph: ji,
          sipsin: null,
          group: null,
        })),
      ),
    });
  }

  // 해×세운기신 — 지지 해가 있는데 세운이 기신
  if (haeRelations.length > 0 && seunTension) {
    patterns.push({
      key: 'saju/combo/jiji-hae--seun-tension',
      strength: 0.55,
      evidence: [
        ...meterEvidence,
        `해 ${haeRelations.length}건 — ${haeRelations.map((r) => `${r.positions.map((p) => posLabel(p)).join('↔')} ${r.jijis.join('·')}`).join(' / ')} + 세운 ${result.seun.gan}${result.seun.ji}(${seunAxis})=기신`,
      ],
      figures: { dayMasterScore: meter.dayMaster.score, seunGanJi: `${result.seun.gan}${result.seun.ji}` },
      slots: haeRelations.flatMap((r) =>
        r.jijis.map((ji, i) => ({
          slot: r.positions[i] ?? ji,
          label: posLabel(r.positions[i] ?? ji),
          glyph: ji,
          sipsin: null,
          group: null,
        })),
      ),
    });
  }

  // ---------- 10차 확장: 조후 잔여 축 × 강약 ----------

  const johuFullRel = johuFull(meter, result);

  // 득령×신강 — 왕오행이 일간과 같은데 일간이 강함
  if (johuFullRel === 'command' && strong) {
    patterns.push({
      key: 'saju/combo/season-command--daymaster-strong',
      strength: 0.65,
      evidence: [
        ...meterEvidence,
        `월지 ${meter.season.monthJi} ${meter.season.name}·왕오행 ${meter.season.kingOhaeng}=일간 ${result.palja.dayGan}(${dayGanOhaeng(result)}) 득령 + 신강`,
      ],
      figures: { dayMasterScore: meter.dayMaster.score, season: meter.season.name, king: meter.season.kingOhaeng },
    });
  }

  // 득령×신약 — 왕오행이 일간과 같은데 일간이 약함 (계절은 맞으나 구조가 약함)
  if (johuFullRel === 'command' && weak) {
    patterns.push({
      key: 'saju/combo/season-command--daymaster-weak',
      strength: 0.6,
      evidence: [
        ...meterEvidence,
        `월지 ${meter.season.monthJi} ${meter.season.name}·왕오행 ${meter.season.kingOhaeng}=일간 ${result.palja.dayGan}(${dayGanOhaeng(result)}) 득령 + 신약`,
      ],
      figures: { dayMasterScore: meter.dayMaster.score, season: meter.season.name, king: meter.season.kingOhaeng },
    });
  }

  // 설기×신약 — 일간이 계절을 생하는데 일간이 약함 (기운 유출이 부담)
  if (johuFullRel === 'drain' && weak) {
    patterns.push({
      key: 'saju/combo/season-drain--daymaster-weak',
      strength: 0.6,
      evidence: [
        ...meterEvidence,
        `월지 ${meter.season.monthJi} ${meter.season.name}·왕오행 ${meter.season.kingOhaeng}을 일간 ${result.palja.dayGan}(${dayGanOhaeng(result)})이 생함(설기) + 신약`,
      ],
      figures: { dayMasterScore: meter.dayMaster.score, season: meter.season.name, king: meter.season.kingOhaeng },
    });
  }

  // 제절×신약 — 일간이 계절을 극하는데 일간이 약함 (극하는 힘이 부족)
  if (johuFullRel === 'control' && weak) {
    patterns.push({
      key: 'saju/combo/season-control--daymaster-weak',
      strength: 0.6,
      evidence: [
        ...meterEvidence,
        `월지 ${meter.season.monthJi} ${meter.season.name}·왕오행 ${meter.season.kingOhaeng}을 일간 ${result.palja.dayGan}(${dayGanOhaeng(result)})이 극함(제절) + 신약`,
      ],
      figures: { dayMasterScore: meter.dayMaster.score, season: meter.season.name, king: meter.season.kingOhaeng },
    });
  }

  return patterns;
}
