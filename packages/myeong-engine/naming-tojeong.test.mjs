import test from 'node:test';
import assert from 'node:assert/strict';
import * as engine from './dist/index.js';

test('Kangxi dictionary examples and Korean surname glyphs use their own strokes', () => {
  const a = engine.analyzeNameExtended('박', '화해', { hanjaChars: ['朴', '花', '海'], school: 'kangxi' });
  assert.deepEqual(a.hanjaStrokes, [6, 10, 11]);
  assert.deepEqual(a.wonhyeong, { won: 21, hyeong: 16, yi: 17, jeong: 27 });
});

test('Tojeong converts solar birthdays, explains policy and withholds unverified prose', async () => {
  // 음력 1990-01-15 / 2026: 나이37+태세16 → 5, 30+월건15 → 3, 15+일진16 → 1.
  const r = await engine.executeEngineModule('tojeong', { birthYear: 1990, birthMonth: 1, birthDay: 15, targetYear: 2026 });
  assert.equal(r.result.gwae.gwaeCode, '531');
  assert.equal(r.result.interpretation, null);
  assert.equal(r.result.contentStatus, 'unverified');
  assert.equal(r.result.calculation.koreanAge, 37);
  const solar = engine.lunarToSolar({ year: 1990, month: 1, day: 15, isLeapMonth: false });
  const s = await engine.executeEngineModule('tojeong', { birthYear: solar.year, birthMonth: solar.month, birthDay: solar.day, targetYear: 2026, calendarType: 'solar' });
  assert.deepEqual(s.result.gwae, r.result.gwae);
});

test('recommendation uses the supplied birth chart and provides bounded, traceable candidates', async () => {
  const birth = { year: 1990, month: 5, day: 15, hour: 14, minute: 30, gender: 'male', isLunar: false, birthPlace: null };
  const input = { mode: 'recommend', surname: '김', surnameHanja: '金', birth, school: 'kangxi', limit: 4 };
  const env = await engine.executeEngineModule('naming', input);
  const r = env.result;
  assert.ok(r.candidates.length > 0 && r.candidates.length <= 4);
  assert.equal(r.recommendation.targetElement, engine.buildSajuResult(birth).yongsin.ohaeng);
  assert.ok(r.candidates.every(c => c.jawonOhaeng.ohaengs.slice(1).includes(r.recommendation.targetElement)));
  assert.ok(r.recommendation.reasons.length > 0);
  assert.deepEqual(engine.recommendNames(input), r);
});

test('naming keeps stroke schools separate, checks readings and never mixes unknown glyphs', () => {
  const k = engine.analyzeNameExtended('김', '영해', { hanjaChars: ['金', '英', '海'], school: 'kangxi' });
  const m = engine.analyzeNameExtended('김', '영해', { hanjaChars: ['金', '英', '海'], school: 'modern' });
  assert.deepEqual(k.hanjaStrokes, [8, 11, 11]);
  assert.deepEqual(m.hanjaStrokes, [8, 8, 10]);
  assert.deepEqual(k.fiveGrids, { cheon: 9, in: 19, ji: 22, oe: 12, chong: 30 });
  assert.equal(engine.lookupHanja('萬').kangxi, 15);
  assert.equal(engine.lookupHanja('萬').modern, 12);
  assert.throws(() => engine.analyzeNameExtended('김', '영해', { hanjaChars: ['金', '', '海'] }));
  assert.throws(() => engine.analyzeNameExtended('김', '영해', { hanjaChars: ['金', '𠮷', '海'] }));
  assert.throws(() => engine.analyzeNameExtended('김', '영해', { hanjaChars: ['金', '明', '海'] }));
  assert.throws(() => engine.analyzeNameExtended('', '영해', {}));
  const one = engine.analyzeNameExtended('이', '수', { hanjaChars: ['李', '秀'] });
  assert.deepEqual(one.wonhyeong, { won: 7, hyeong: 14, yi: 14, jeong: 14 });
  assert.deepEqual(one.fiveGrids, { cheon: 8, in: 14, ji: 8, oe: 2, chong: 14 });
  const compound = engine.analyzeNameExtended('남궁', '수', { hanjaChars: ['南', '宮', '秀'] });
  assert.deepEqual(compound.wonhyeong, { won: 7, hyeong: 26, yi: 26, jeong: 26 });
  assert.deepEqual(compound.fiveGrids, { cheon: 19, in: 17, ji: 8, oe: 10, chong: 26 });
});

test('Tojeong leap birthdays require explicit supported policy and real input dates', async () => {
  const leap = { birthYear: 2023, birthMonth: 2, birthDay: 1, isLeapMonth: true, targetYear: 2026 };
  const r = await engine.executeEngineModule('tojeong', leap);
  assert.equal(r.result.calculation.leapMonthAdjusted, true);
  assert.equal(r.result.calculation.leapMonthPolicy, 'regular-month');
  await assert.rejects(engine.executeEngineModule('tojeong', { ...leap, leapMonthPolicy: 'reject' }));
  await assert.rejects(engine.executeEngineModule('tojeong', { ...leap, birthYear: 2024 }));
  await assert.rejects(engine.executeEngineModule('tojeong', { ...leap, calendarType: 'solar' }));
  await assert.rejects(engine.executeEngineModule('tojeong', { ...leap, isLeapMonth: 'yes' }));
  assert.throws(() => engine.analyzeTojeong(2027, 1, 1, 2026));
  assert.throws(() => engine.analyzeTojeong(1990.5, 1, 1, 2026));
  assert.throws(() => engine.analyzeTojeong(1990, 2, 31, 2026, { calendarType: 'solar' }));
  const short = engine.analyzeTojeong(1990, 2, 30, 2026);
  assert.equal(short.calculation.monthDays, 29);
  assert.equal(short.calculation.effectiveDay, 29);
  assert.equal(short.calculation.dayAdjusted, true);
  const zero = engine.analyzeTojeong(1991, 5, 15, 2024);
  assert.equal(zero.gwae.sangGwae, 8);
});

test('recommendations honor preferred reading, limit and changed yongsin', () => {
  const birth = { year: 1990, month: 5, day: 15, hour: 14, minute: 30, gender: 'male', isLunar: false, birthPlace: null };
  const options = { surname: '김', surnameHanja: '金', birth, limit: 3 };
  const base = engine.recommendNames(options);
  const sameName = engine.recommendNames({ ...options, givenName: base.candidates[0].name });
  assert.ok(sameName.candidates.length > 0);
  assert.ok(sameName.candidates.every(c => c.name === base.candidates[0].name));
  assert.deepEqual(engine.recommendNames(options), base);
  assert.deepEqual(engine.recommendNames({ ...options, givenName: '뿡뿡' }).candidates, []);
  assert.throws(() => engine.recommendNames({ ...options, limit: 7 }));
  assert.throws(() => engine.recommendNames({ ...options, surnameHanja: '朴' }));
  assert.throws(() => engine.recommendNames({ ...options, birth: { ...birth, day: 32 } }));
  let different = false;
  for (const month of [1, 2, 7, 10, 12]) {
    const other = engine.recommendNames({ ...options, birth: { ...birth, month } });
    if (other.recommendation.targetElement === base.recommendation.targetElement) continue;
    different = true;
    assert.notDeepEqual(other.candidates.map(c => c.hanjaChars), base.candidates.map(c => c.hanjaChars));
    assert.ok(other.candidates.every(c => c.jawonOhaeng.ohaengs.slice(1).includes(other.recommendation.targetElement)));
    break;
  }
  assert.ok(different, 'different chart fixture exercises a different target element');
});

test('all 2137 stroke entries agree with the committed raw reference and retain positive counts', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = JSON.parse(await readFile(new URL('../../src/engine/naming/stroke-source.json', import.meta.url), 'utf8'));
  assert.equal(Object.keys(source.entries).length, 2137);
  for (const [char, ref] of Object.entries(source.entries)) {
    const entry = engine.lookupHanja(char);
    assert.equal(entry.kangxi, ref.kangxi, char);
    assert.equal(entry.modern, ref.modern, char);
    assert.ok(entry.kangxi > 0 && entry.modern > 0, char);
  }
});


test('contract rejects oversized requests and preserves explicit Hangul-only basis', async () => {
  await assert.rejects(engine.executeEngineModule('naming', { surname: '김', candidates: Array.from({ length: 7 }, () => ({ givenName: '수' })) }));
  await assert.rejects(engine.executeEngineModule('naming', { mode: 'unknown', surname: '김', candidates: [{ givenName: '수' }] }));
  const r = await engine.executeEngineModule('naming', { surname: '김', candidates: [{ givenName: '수' }] });
  assert.equal(r.result.candidates[0].strokeBasis, 'hangul');
  assert.ok(r.warnings.some(w => w.code === 'MISSING_OPTIONAL_DATA'));
});

test('Tojeong upper trigrams match published worked examples', () => {
  // https://www.gilra.kr/fortune-lab/records/advanced.tojeong.calc1
  // 2010 庚寅: age32, taese18 → upper2. 2012 壬辰: age40, taese19 → upper3.
  const first = engine.analyzeTojeong(1979, 1, 1, 2010);
  assert.equal(first.calculation.taeseSu, 18);
  assert.equal(first.gwae.sangGwae, 2);
  const second = engine.analyzeTojeong(1973, 1, 1, 2012);
  assert.equal(second.calculation.taeseSu, 19);
  assert.equal(second.gwae.sangGwae, 3);
});
