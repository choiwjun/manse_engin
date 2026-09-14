// 동적 문장 생성기 — 고정 문구(defaultText)를 "위치·강도·글자 파라미터를 받는 문장"으로 조립한다.
// 레지스트리의 conclusion(결론형) + detector의 slots/figures(첫형 재료)를 결합해
// 상담 등급의 문장을 만든다: "일지의 식신(酉)이 시간의 정재(壬)를 생하여(식상생재, 강도 최상), …"

import type { DetectedPattern, PatternSlot } from './types';
import { PATTERN_REGISTRY } from './registry';
import { conclusionFor } from './content';

/** 강도 0~1 → 상담 등급 라벨 */
export function strengthLabel(strength: number): string {
  if (strength >= 0.8) return '최상';
  if (strength >= 0.65) return '뚜렷';
  if (strength >= 0.5) return '보통';
  return '약';
}

/** Hangul 종성 판정 조사. 조사가 붙는 단어는 Hangul(십신명·위치 라벨)만 넘긴다 */
export function josa(word: string, pair: '이가' | '을를' | '은는' | '으로' | '와과'): string {
  const last = word[word.length - 1] ?? '';
  const code = last.charCodeAt(0);
  const isHangulSyllable = code >= 0xac00 && code <= 0xd7a3;
  const hasBatchim = isHangulSyllable && (code - 0xac00) % 28 !== 0;
  const isRieul = isHangulSyllable && (code - 0xac00) % 28 === 8; // ㄹ 받침 → '로'
  switch (pair) {
    case '이가':
      return hasBatchim ? '이' : '가';
    case '을를':
      return hasBatchim ? '을' : '를';
    case '은는':
      return hasBatchim ? '은' : '는';
    case '으로':
      return hasBatchim && !isRieul ? '으로' : '로';
    case '와과':
      return hasBatchim ? '과' : '와';
  }
}

/** 슬롯 한 개를 위치 문구로: '일지의 식신(酉)'. 십신이 없는 자리(일간 등)는 '일간(己)' */
function slotPhrase(s: PatternSlot): string {
  if (s.sipsin) return `${s.label}의 ${s.sipsin}(${s.glyph})`;
  return `${s.label}(${s.glyph})`;
}

/** 문장 조사 부착을 위해 조사 기준이 될 Hangul 단어를 뽑는다 (십신명 우선, 없으면 위치 라벨) */
function josaBase(s: PatternSlot): string {
  return s.sipsin ?? s.label;
}

function num(p: DetectedPattern, key: string, fallback = 0): number {
  const v = p.figures?.[key];
  return typeof v === 'number' ? v : fallback;
}

function str(p: DetectedPattern, key: string, fallback = ''): string {
  const v = p.figures?.[key];
  return typeof v === 'string' ? v : fallback;
}

// ---------- 카테고리별 첫형(위치·흐름 절) ----------

/** flow: 원(source)→대상(target) 흐름 문구. detector가 [source, target] 순으로 slots를 채운다 */
const FLOW_INTRO: Record<string, (src: PatternSlot, tgt: PatternSlot) => string> = {
  'saju/flow/sangsaeng-saengjae': (s, t) =>
    `${slotPhrase(s)}${josa(josaBase(s), '이가')} ${slotPhrase(t)}${josa(josaBase(t), '을를')} 생하여`,
  'saju/flow/gwanin-sangsaeng': (s, t) =>
    `${slotPhrase(s)}${josa(josaBase(s), '이가')} ${slotPhrase(t)}${josa(josaBase(t), '으로')} 이어져`,
  'saju/flow/jaesaeng-gwan': (s, t) =>
    `${slotPhrase(s)}${josa(josaBase(s), '이가')} ${slotPhrase(t)}${josa(josaBase(t), '을를')} 떠받쳐`,
  'saju/flow/sangsaeng-jesal': (s, t) =>
    `${slotPhrase(s)}${josa(josaBase(s), '이가')} ${slotPhrase(t)}${josa(josaBase(t), '을를')} 제어하여`,
};

const RELATION_INTRO: Record<string, (a: PatternSlot, b: PatternSlot) => string> = {
  'saju/relation/jiji-hap': (a, b) => `${slotPhrase(a)}${josa(josaBase(a), '이가')} ${slotPhrase(b)}${josa(josaBase(b), '와과')} 지지합을 이루어`,
  'saju/relation/jiji-chung': (a, b) => `${slotPhrase(a)}${josa(josaBase(a), '이가')} ${slotPhrase(b)}${josa(josaBase(b), '와과')} 서로 충을 이루어`,
  'saju/relation/jiji-hyeong': (a, b) => `${slotPhrase(a)}${josa(josaBase(a), '이가')} ${slotPhrase(b)}${josa(josaBase(b), '와과')} 형을 이루어`,
  'saju/relation/jiji-hae': (a, b) => `${slotPhrase(a)}${josa(josaBase(a), '이가')} ${slotPhrase(b)}${josa(josaBase(b), '와과')} 해를 형성하여`,
  'saju/relation/wonjin': (a, b) => `${slotPhrase(a)}${josa(josaBase(a), '이가')} ${slotPhrase(b)}${josa(josaBase(b), '와과')} 원진을 이루어`,
};

const TIMING_VERDICT: Record<string, (p: DetectedPattern) => string> = {
  'saju/timing/daeun-fit': (p) =>
    `현재 대운 ${str(p, 'age')}세 무렵의 ${str(p, 'ganJi')}가 용신 ${str(p, 'yongsin')}${josa(str(p, 'yongsin'), '을를')} 데려와`,
  'saju/timing/daeun-tension': (p) =>
    `현재 대운 ${str(p, 'age')}세 무렵의 ${str(p, 'ganJi')}가 기신 ${str(p, 'gisin')} 축으로 기울어`,
  'saju/timing/daeun-neutral': (p) =>
    `현재 대운 ${str(p, 'age')}세 무렵의 ${str(p, 'ganJi')}가 중간 오행(${str(p, 'ohaeng')})으로 흘러`,
};

const JOHU_INTRO: Record<string, (p: DetectedPattern) => string> = {
  'saju/johu/season-support': (p) =>
    `${str(p, 'season', '계절')}(${str(p, 'monthJi')}월)의 ${str(p, 'king')} 기운이 ${str(p, 'dayOhaeng')} 일간을 생하여`,
  'saju/johu/season-command': (p) => `${str(p, 'season', '계절')}에 ${str(p, 'dayOhaeng')} 일간이 당령(當令)하여`,
  'saju/johu/season-pressure': (p) =>
    `${str(p, 'season', '계절')}의 ${str(p, 'king')} 기운이 ${str(p, 'dayOhaeng')} 일간을 극하여`,
  'saju/johu/season-control': (p) =>
    `${str(p, 'dayOhaeng')} 일간이 ${str(p, 'season', '계절')}의 ${str(p, 'king')} 기운을 제어하여`,
  'saju/johu/season-drain': (p) =>
    `${str(p, 'dayOhaeng')} 일간이 ${str(p, 'season', '계절')}의 ${str(p, 'king')} 기운을 채워 흘려`,
};

function flowIntro(p: DetectedPattern): string | null {
  const [src, tgt] = p.slots ?? [];
  const builder = FLOW_INTRO[p.key];
  if (!builder || !src || !tgt) return null;
  return builder(src, tgt);
}

function relationIntro(p: DetectedPattern): string | null {
  const [a, b, c] = p.slots ?? [];
  const builder = RELATION_INTRO[p.key];
  if (builder) {
    if (!a || !b) return null;
    return builder(a, b);
  }
  // 삼합·방합 — slots [생지, 왕지(중지), 묘지(마침지)]
  if (p.key === 'saju/relation/samhap' || p.key === 'saju/relation/banghap') {
    if (!a || !b || !c) return null;
    const name = p.key === 'saju/relation/samhap' ? '삼합' : '방합';
    const guk = str(p, 'guk');
    if (!guk) return null;
    const glyphs = [a.glyph, b.glyph, c.glyph].join('');
    return `${a.label}(${a.glyph})·${b.label}(${b.glyph})·${c.label}(${c.glyph})로 ${name} ${glyphs} ${guk}을(를) 이루어`;
  }
  // 천간합 5종 — slots [a, b]
  if (p.key.startsWith('saju/relation/gan-hap-') && a && b) {
    return `${slotPhrase(a)}${josa(josaBase(a), '이가')} ${slotPhrase(b)}${josa(josaBase(b), '와과')} 천간합을 이루어`;
  }
  return null;
}

function crossIntro(p: DetectedPattern): string | null {
  if (p.key.startsWith('saju/cross/gongmang-')) {
    const slot = p.slots?.[0];
    if (!slot) return null;
    return `${slotPhrase(slot)} 자리가 공망으로 비어`;
  }
  if (p.key.startsWith('saju/cross/sinsal-')) {
    const main = p.slots?.[0];
    const sin = str(p, 'sin');
    if (!main || !sin) return null;
    return `${slotPhrase(main)}${josa(josaBase(main), '이가')} ${sin} 자리에 놓여`;
  }
  if (p.key === 'saju/cross/gyeokguk-yongsin-fit') {
    const gyeokguk = str(p, 'gyeokguk');
    const yongsin = str(p, 'yongsin');
    if (!gyeokguk || !yongsin) return null;
    return `격국 ${gyeokguk}과 용신 ${yongsin}이 같은 축 위에 놓여`;
  }
  if (p.key === 'saju/cross/gyeokguk-yongsin-split') {
    const gyeokguk = str(p, 'gyeokguk');
    const yongsin = str(p, 'yongsin');
    const gkGroup = str(p, 'gyeokgukGroup');
    const ysGroup = str(p, 'yongsinGroup');
    if (!gyeokguk || !yongsin) return null;
    return `격국 ${gyeokguk}(${gkGroup} 축)과 용신 ${yongsin}(${ysGroup} 축)이 갈라져`;
  }
  return null;
}

function imbalanceIntro(p: DetectedPattern): string | null {
  switch (p.key) {
    case 'saju/imbalance/daymaster-strong': {
      const score = num(p, 'dayMasterScore');
      if (!score) return null;
      return `일간의 축(비겁+인성)이 ${score}%로 두터워`;
    }
    case 'saju/imbalance/daymaster-weak': {
      const score = num(p, 'dayMasterScore');
      if (!score) return null;
      return `일간의 축(비겁+인성)이 ${score}%로 얇아`;
    }
    case 'saju/imbalance/ohaeng-skew': {
      const top = str(p, 'top');
      const bottom = str(p, 'bottom');
      if (!top || !bottom) return null;
      return `오행 분포가 ${top} ${num(p, 'topPercent')}%부터 ${bottom} ${num(p, 'bottomPercent')}%까지 기울어`;
    }
    case 'saju/imbalance/ohaeng-missing': {
      const missing = str(p, 'missing');
      if (!missing) return null;
      return `명식에 ${missing} 오행이 비어`;
    }
    case 'saju/imbalance/jaesung-nochul': {
      const exposed = num(p, 'exposed');
      if (!exposed) return null;
      return `재성이 천간에 ${exposed}개 드러나`;
    }
    default:
      break;
  }
  if (p.key.startsWith('saju/imbalance/')) {
    const group = str(p, 'group');
    const count = num(p, 'count');
    if (group && count) return `${group}${josa(group, '이가')} 8자리 중 ${count}자리로 몰려`;
  }
  return null;
}

function timingIntro(p: DetectedPattern): string | null {
  const verdict = TIMING_VERDICT[p.key];
  if (verdict) {
    if (!str(p, 'ganJi')) return null;
    return verdict(p);
  }
  if (p.key === 'saju/timing/daeun-seun-fit') {
    const daeun = str(p, 'daeunGanJi');
    const seun = str(p, 'seunGanJi');
    const yongsin = str(p, 'yongsin');
    if (!daeun || !seun || !yongsin) return null;
    return `대운 ${daeun}과 세운 ${seun}가 함께 용신 ${yongsin} 축을 밀어`;
  }
  if (p.key === 'saju/timing/daeun-seun-tension') {
    const daeun = str(p, 'daeunGanJi');
    const seun = str(p, 'seunGanJi');
    const gisin = str(p, 'gisin');
    if (!daeun || !seun || !gisin) return null;
    return `대운 ${daeun}과 세운 ${seun}가 함께 기신 ${gisin} 축으로 기울어`;
  }
  return null;
}

function johuIntro(p: DetectedPattern): string | null {
  const builder = JOHU_INTRO[p.key];
  if (!builder || !str(p, 'dayOhaeng')) return null;
  return builder(p);
}

/** 조합 패턴 — 두 구조 조건의 교차. 키별 고정 첫형 */
const COMBO_INTRO: Record<string, string> = {
  'saju/combo/sangsaeng-saengjae--daymaster-weak': '식상생재의 흐름 위에 얇은 일간 축이 얹혀',
  'saju/combo/sangsaeng-saengjae--daymaster-strong': '식상생재의 흐름에 두터운 일간 축이 더해져',
  'saju/combo/jaesung-nochul--bigeop-gwada': '천간에 드러난 재성 옆에 몰려든 비겁이 서서',
  'saju/combo/gwanin-sangsaeng--insung-gwada': '관인상생의 성장 라인 위에 과다한 인성이 쌓여',
  'saju/combo/daymaster-weak--daeun-fit': '얇은 일간 축이 용신 대운의 도움을 받아',
  'saju/combo/daymaster-weak--daeun-tension': '얇은 일간 축이 기신 대운의 무게를 맞아',
  'saju/combo/daymaster-strong--daeun-fit': '두터운 일간 축이 용신 대운과 힘을 합해',
  'saju/combo/daymaster-strong--daeun-tension': '두터운 일간 축이 기신 대운과 마주 서서',
};

function buildIntro(p: DetectedPattern): string | null {
  switch (p.category) {
    case 'combo':
      return COMBO_INTRO[p.key] ?? null;
    case 'flow':
      return flowIntro(p);
    case 'relation':
      return relationIntro(p);
    case 'cross':
      return crossIntro(p);
    case 'imbalance':
      return imbalanceIntro(p);
    case 'timing':
      return timingIntro(p);
    case 'johu':
      return johuIntro(p);
  }
}

/**
 * 패턴 하나를 상담 등급 문장으로 조립한다.
 * - 결론형: content DB(body.short) > 레지스트리 conclusion
 * - slots/figures가 충분하면: "{첫형}({짧은 제목}, 강도 {라벨}), {결론형}"
 * - 재료가 부족하면 기존 형식 "{제목}: {defaultText}"로 fallback
 */
export function renderPattern(p: DetectedPattern): string {
  const meta = PATTERN_REGISTRY[p.key];
  const conclusion = conclusionFor(p.key, meta?.conclusion ?? '');
  const intro = buildIntro(p);
  if (!intro || !conclusion) return `${p.title}: ${p.defaultText}`;
  const short = p.title.replace(/\(.*\)\s*$/, '');
  return `${intro}(${short}, 강도 ${strengthLabel(p.strength)}), ${conclusion}`;
}
