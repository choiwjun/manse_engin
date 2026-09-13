// 해석 계층(detector·조립기) 회귀 테스트 — `npm run build` 후 실행.
// 골든 케이스: 1985-01-10 16:45 남(甲子 丁丑 己酉 壬申, 비견격·용신 금)
import assert from 'node:assert/strict';
import { buildSajuResult, interpretSaju, runDetectors, PATTERN_REGISTRY } from './dist/index.js';

const NOW = '2026-09-13T12:00:00+09:00';

function saju(input, now = new Date('2026-09-13T12:00:00+09:00')) {
  return buildSajuResult({ isLunar: false, birthPlace: null, ...input }, { now });
}

// 1) 골든 케이스 — 1985-01-10 16:45 남
{
  const r = saju({ year: 1985, month: 1, day: 10, hour: 16, minute: 45, gender: 'male' });
  const keys = runDetectors(r).map((p) => p.key);

  assert.ok(`${r.palja.yearGan}${r.palja.monthGan}${r.palja.dayGan}${r.palja.hourGan}` === '甲丁己壬', 'golden palja');
  assert.ok(keys.includes('saju/flow/sangsaeng-saengjae'), '식상생재 감지');
  assert.ok(keys.includes('saju/relation/gan-hap-gabgi'), '갑기합 감지 (년간 甲-일간 己)');
  assert.ok(keys.includes('saju/flow/gwanin-sangsaeng'), '정관(甲)+편인(丁) → 관인상생 감지');
  assert.ok(!keys.some((k) => k.startsWith('saju/cross/gongmang-')), '공망(寅卯) 미포함 → 교차 미감지');
  assert.ok(keys.includes('saju/cross/sinsal-장성-siksang'), '장성(일지)+식신 교차');
  assert.ok(keys.includes('saju/cross/sinsal-화개-bigeop'), '화개(월지)+비견 교차');
  assert.ok(keys.includes('saju/timing/daeun-fit'), '38세 辛巳(금)=용신 대운');

  const interp = interpretSaju(r);
  const priorities = interp.patterns.map((p) => p.priority);
  assert.deepEqual(priorities, [...priorities].sort((a, b) => a - b), '우선순위 정렬');
  assert.ok(interp.summary.headline.includes('비견격'), '헤드라인에 격국');
  assert.ok(interp.summary.headline.includes('금'), '헤드라인에 용신 오행');
  assert.ok(interp.summary.structureLines.length >= 2, '구조 문장 생성');
  assert.ok(interp.baseline.gyeokguk.length > 0 && interp.baseline.yongsin.length > 0, '1층 baseline 보존');
}

// 2) 관인상생 케이스 — 1990-05-15 14:30 남 (庚午 辛巳 庚辰 癸未: 관 2·인 2)
{
  const r = saju({ year: 1990, month: 5, day: 15, hour: 14, minute: 30, gender: 'male' });
  const keys = runDetectors(r).map((p) => p.key);
  assert.ok(keys.includes('saju/flow/gwanin-sangsaeng'), '관인상생 감지');
}

// 3) 계약 일관성 — 다양한 출생에서 (a) 모든 키가 레지스트리에 등록 (b) 강도 0~1 (c) 골든 문구 존재
{
  const samples = [
    { year: 1988, month: 11, day: 3, hour: 10, minute: 0, gender: 'female' },
    { year: 2001, month: 6, day: 22, hour: 3, minute: 15, gender: 'male' },
    { year: 1972, month: 12, day: 9, hour: 21, minute: 40, gender: 'female' },
    { year: 1999, month: 2, day: 28, hour: 6, minute: 5, gender: 'male' },
    { year: 1963, month: 8, day: 17, hour: null, minute: null, gender: 'male' }, // 시각 미상
  ];
  for (const s of samples) {
    const r = saju(s);
    for (const p of runDetectors(r)) {
      assert.ok(PATTERN_REGISTRY[p.key], `미등록 키: ${p.key}`);
      assert.ok(p.strength > 0 && p.strength <= 1, `강도 범위 이탈: ${p.key}=${p.strength}`);
      assert.ok(p.defaultText.length > 10, `기본 문구 없음: ${p.key}`);
      assert.ok(p.evidence.length >= 1, `근거 없음: ${p.key}`);
    }
    interpretSaju(r); // 예외 없이 조립되어야 한다
  }
}

// 4) 레지스트리 무결성 — 카테고리 접두사가 category 필드와 일치
for (const [key, meta] of Object.entries(PATTERN_REGISTRY)) {
  assert.ok(key.startsWith(`saju/${meta.category}/`), `키/카테고리 불일치: ${key}`);
  assert.ok(meta.title.length > 0 && meta.defaultText.length > 0, `메타 불완전: ${key}`);
}

console.log('interpretation.test: OK');
