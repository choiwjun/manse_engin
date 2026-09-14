// 조합(교차) detector — 두 구조 조건이 겹칠 때만 나오는 깊은 해석.
// 전문가가 만세력을 보며 하나하나 조합하는 판단(강약×흐름×시점)을 키로 시스템화한다.
// 다른 detector의 결과에 의존하지 않고 원시 조건을 직접 판정한다 (detector 간 결합 방지).

import type { SajuResult } from '@/engine/types';
import type { RawPattern, SipsinGroup } from '../types';
import { getOhaengForGan, getOhaengForJi } from '@/engine/adapter/hanja-mapper';
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

function isDaeunFit(result: SajuResult): boolean {
  const current = result.daeun.find((d) => d.isCurrent);
  return !!current && current.ohaeng === result.yongsin.ohaeng;
}

function isDaeunTension(result: SajuResult): boolean {
  const current = result.daeun.find((d) => d.isCurrent);
  const gisin = result.yongsin.gisin.split('(')[0].trim();
  return !!current && current.ohaeng === gisin;
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

  // 세운 오행 — 천간 우선, 비어 있으면 지지 (timing detector와 동일 기준)
  const seunO = (() => {
    const gan = result.seun?.gan;
    if (gan) {
      const o = getOhaengForGan(gan);
      if (o) return o;
    }
    const ji = result.seun?.ji;
    if (ji) return getOhaengForJi(ji) ?? '';
    return '';
  })();
  const yongsin = result.yongsin.ohaeng;
  const gisin = result.yongsin.gisin.split('(')[0].trim();
  const seunFit = seunO === yongsin;
  const seunTension = seunO === gisin;

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
      evidence: [...meterEvidence, `세운 ${result.seun.gan}${result.seun.ji}(${seunO})=용신 + 신약`],
      figures: { dayMasterScore: meter.dayMaster.score, seunGanJi: `${result.seun.gan}${result.seun.ji}` },
    });
  }

  // 신강×세운기신 — 일간이 강한데 세운이 기신
  if (strong && seunTension) {
    patterns.push({
      key: 'saju/combo/daymaster-strong--seun-tension',
      strength: 0.6,
      evidence: [...meterEvidence, `세운 ${result.seun.gan}${result.seun.ji}(${seunO})=기신 + 신강`],
      figures: { dayMasterScore: meter.dayMaster.score, seunGanJi: `${result.seun.gan}${result.seun.ji}` },
    });
  }

  return patterns;
}
