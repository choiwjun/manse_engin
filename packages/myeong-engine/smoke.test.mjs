// 패키지 산출물 스모크 테스트 — `npm run build` 후 `node smoke.test.mjs`
// 공개 API의 핵심 회귀(子 지장간 순서, DST 절기 경계, 범위/데이터 에러)를 검증한다.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const cjs = require('./dist/index.cjs');
const esm = await import('./dist/index.js');

for (const [name, e] of [['cjs', cjs], ['esm', esm]]) {
  const birth = (o) => ({ isLunar: false, birthPlace: null, ...o });

  // 1) 기본 사주 — 1990-05-15 14:30 남 → 庚午 辛巳 庚辰 癸未
  const r = e.buildSajuResult(birth({ year: 1990, month: 5, day: 15, hour: 14, minute: 30, gender: 'male' }));
  assert.equal(`${r.palja.yearGan}${r.palja.yearJi}`, '庚午', `${name}: year pillar`);
  assert.equal(`${r.palja.dayGan}${r.palja.dayJi}`, '庚辰', `${name}: day pillar`);

  // 2) 子월 지장간 본기-first — 丙일간 子월은 정관격
  let found = false;
  for (let d = 7; d <= 31 && !found; d++) {
    const p = e.calculatePalja(birth({ year: 1996, month: 12, day: d, hour: 12, minute: 0, gender: 'male' }));
    if (p.monthJi === '子' && p.dayGan === '丙') {
      assert.equal(e.determineGyeokguk(p).name, '정관격', `${name}: 子월 격국`);
      found = true;
    }
  }
  assert.ok(found, `${name}: 子월 丙일 케이스 없음`);

  // 3) DST 절기 경계 — 1987-08-08 입추 10:29 표준시
  const before = e.calculatePalja(birth({ year: 1987, month: 8, day: 8, hour: 10, minute: 45, gender: 'male' }));
  const after = e.calculatePalja(birth({ year: 1987, month: 8, day: 8, hour: 11, minute: 45, gender: 'male' }));
  assert.equal(`${before.monthGan}${before.monthJi}`, '丁未', `${name}: DST 라벨 10:45`);
  assert.equal(`${after.monthGan}${after.monthJi}`, '戊申', `${name}: DST 라벨 11:45`);

  // 4) 범위/데이터 에러 타이핑
  assert.throws(
    () => e.calculatePalja(birth({ year: 2102, month: 1, day: 1, hour: 0, minute: 0, gender: 'male' })),
    (err) => err.code === 'MANSERYEOK_POLICY_ERROR',
    `${name}: range error`,
  );
  assert.throws(
    () => e.solarToLunar({ year: 1898, month: 6, day: 15 }),
    (err) => err.code === 'MANSERYEOK_DATA_ERROR',
    `${name}: data error`,
  );

  // 5) 음력↔양력 일치 — 음력 2024-01-01 = 양력 2024-02-10
  const lunar = e.calculatePalja({ isLunar: true, isLeapMonth: false, birthPlace: null, year: 2024, month: 1, day: 1, hour: 10, minute: 0, gender: 'female' });
  const solar = e.calculatePalja(birth({ year: 2024, month: 2, day: 10, hour: 10, minute: 0, gender: 'female' }));
  assert.equal(lunar.dayGan, solar.dayGan, `${name}: lunar↔solar day pillar`);
}

// 6) 모듈 봉투 — crypto.subtle 필요
const env = await esm.executeEngineModuleById('saju', {
  birth: { isLunar: false, birthPlace: null, year: 1990, month: 5, day: 15, hour: 14, minute: 30, gender: 'male' },
  now: '2025-01-15T00:00:00Z',
});
assert.ok(env.runId, 'envelope runId');
assert.ok(env.inputHash, 'envelope inputHash');

console.log('smoke test: all assertions passed');
