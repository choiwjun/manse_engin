// 강약 계량기 — 전문가가 만세력을 펼쳐 처음 하는 판단(오행 분포·일간 강약)의 수치화.
// 지장간 가중치(본기/중기/여기)와 월령 앵커(월지 2배)로 명식 내 오행 점유율을 산출한다.

import type { SajuResult } from '@/engine/types';
import { JIJANGGAN_TABLE } from '@/engine/saju/sipsin';
import { getOhaengForGan } from '@/engine/adapter/hanja-mapper';
import type { SipsinGroup } from './types';
import { groupFromOhaeng } from './sipsin-groups';

/** 지지 지장간 개수별 슬롯 가중치 (본기, 중기, 여기 순) */
const JI_WEIGHTS_1 = [1.0];
const JI_WEIGHTS_2 = [0.7, 0.3];
const JI_WEIGHTS_3 = [0.6, 0.3, 0.1];
/** 월지는 계절의 권(權)을 쥐므로 2배 가중 */
const MONTH_JI_MULTIPLIER = 2.0;

const SEASON_BY_MONTH_JI: Record<string, { name: string; kingOhaeng: string }> = {
  寅: { name: '봄(春)', kingOhaeng: '목' },
  卯: { name: '봄(春)', kingOhaeng: '목' },
  巳: { name: '여름(夏)', kingOhaeng: '화' },
  午: { name: '여름(夏)', kingOhaeng: '화' },
  申: { name: '가을(秋)', kingOhaeng: '금' },
  酉: { name: '가을(秋)', kingOhaeng: '금' },
  亥: { name: '겨울(冬)', kingOhaeng: '수' },
  子: { name: '겨울(冬)', kingOhaeng: '수' },
  辰: { name: '계절 마침(土旺)', kingOhaeng: '토' },
  戌: { name: '계절 마침(土旺)', kingOhaeng: '토' },
  丑: { name: '계절 마침(土旺)', kingOhaeng: '토' },
  未: { name: '계절 마침(土旺)', kingOhaeng: '토' },
};

export interface OhaengMeterSlot {
  slot: string;
  glyph: string;
  ohaeng: string;
  weight: number;
}

export interface OhaengMeter {
  /** 오행별 가중 점유율 (0~100, 소수 1자리) — 합은 100 근처 */
  distribution: { ohaeng: string; raw: number; percent: number; slots: string[] }[];
  /** 월지 계절과 왕(旺)한 오행 */
  season: { monthJi: string; name: string; kingOhaeng: string };
  /** 일간 강약: (비겁+인성) 점유율과 판정 */
  dayMaster: { score: number; verdict: 'strong' | 'balanced' | 'weak'; verdictLabel: string };
  /** 일간 축(비겁·인성) vs 외부 축(식상·재성·관성)의 그룹별 점유율 */
  groupPercents: Record<SipsinGroup, number>;
}

const OHAENG_ORDER = ['목', '화', '토', '금', '수'] as const;

/** 지지 슬롯 가중치 결정: 지장간 개수에 따라 본기/중기/여기 배분 */
function jiWeights(count: number): number[] {
  if (count <= 1) return JI_WEIGHTS_1;
  if (count === 2) return JI_WEIGHTS_2;
  return JI_WEIGHTS_3;
}

export function measureOhaeng(result: SajuResult): OhaengMeter {
  const { palja } = result;
  const raw: Record<string, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  const slotsByOhaeng: Record<string, string[]> = { 목: [], 화: [], 토: [], 금: [], 수: [] };
  const groupRaw: Record<SipsinGroup, number> = { bigeop: 0, siksang: 0, jaesung: 0, gwansung: 0, insung: 0 };
  let total = 0;

  const push = (slot: string, glyph: string, weight: number) => {
    // 천간과 지장간은 모두 천간 문자이므로 동일 대응표를 쓴다
    const ohaeng = getOhaengForGan(glyph) ?? '';
    if (!ohaeng || !(ohaeng in raw)) return;
    raw[ohaeng] += weight;
    total += weight;
    slotsByOhaeng[ohaeng].push(slotLabel(slot, glyph));
  };

  // 천간 4 — 각 1.0
  push('yearGan', palja.yearGan, 1.0);
  push('monthGan', palja.monthGan, 1.0);
  push('dayGan', palja.dayGan, 1.0);
  push('hourGan', palja.hourGan, 1.0);

  // 지지 4 — 지장간 분해 가중, 월지는 2배
  const jijiSlots: [string, string, number][] = [
    ['yearJi', palja.yearJi, 1.0],
    ['monthJi', palja.monthJi, MONTH_JI_MULTIPLIER],
    ['dayJi', palja.dayJi, 1.0],
    ['hourJi', palja.hourJi, 1.0],
  ];
  for (const [slot, ji, multiplier] of jijiSlots) {
    const jijanggan = JIJANGGAN_TABLE[ji] ?? [];
    const weights = jiWeights(jijanggan.length);
    jijanggan.forEach((gan, i) => {
      push(slot, gan, (weights[i] ?? 0.1) * multiplier);
    });
  }

  // 그룹별 집계 (일간 오행 대비 묶음)
  for (const ohaeng of OHAENG_ORDER) {
    const group = groupFromOhaeng(result, ohaeng);
    if (group) groupRaw[group] += raw[ohaeng];
  }

  const distribution = OHAENG_ORDER.map((ohaeng) => ({
    ohaeng,
    raw: raw[ohaeng],
    percent: total > 0 ? Math.round((raw[ohaeng] / total) * 1000) / 10 : 0,
    slots: slotsByOhaeng[ohaeng],
  }));

  const groupPercents = Object.fromEntries(
    Object.entries(groupRaw).map(([g, v]) => [g, total > 0 ? Math.round((v / total) * 1000) / 10 : 0]),
  ) as Record<SipsinGroup, number>;

  const score = Math.round(((groupRaw.bigeop + groupRaw.insung) / total) * 1000) / 10;
  const verdict: OhaengMeter['dayMaster']['verdict'] = score >= 55 ? 'strong' : score <= 42 ? 'weak' : 'balanced';
  const verdictLabel = verdict === 'strong' ? '신강(身强)' : verdict === 'weak' ? '신약(身弱)' : '중화(中和)';

  const monthJi = palja.monthJi;
  const seasonInfo = SEASON_BY_MONTH_JI[monthJi] ?? { name: '', kingOhaeng: '' };
  const season = { monthJi, ...seasonInfo };

  return { distribution, season, dayMaster: { score, verdict, verdictLabel }, groupPercents };
}

function slotLabel(slot: string, glyph: string): string {
  const pos =
    slot === 'yearGan' ? '년간' : slot === 'yearJi' ? '년지' : slot === 'monthGan' ? '월간' : slot === 'monthJi' ? '월지' : slot === 'dayGan' ? '일간' : slot === 'dayJi' ? '일지' : slot === 'hourGan' ? '시간' : '시지';
  return `${pos}${glyph}`;
}
