import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import KoreanLunarCalendar from 'korean-lunar-calendar';
import * as esm from './dist/index.js';

const require = createRequire(import.meta.url);
const cjs = require('./dist/index.cjs');
const birth = o => ({ isLunar: false, birthPlace: null, hour: 12, minute: 0, gender: 'male', ...o });
const dateKey = d => `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
const ym = p => `${p.yearGan}${p.yearJi} ${p.monthGan}${p.monthJi}`;
const dayPillar = p => `${p.dayGan}${p.dayJi}`;
const parts = (year, month, day, hour, minute, second = 0) => ({ year, month, day, hour, minute, second });
const nasa = JSON.parse(readFileSync(new URL('./fixtures/nasa-new-moons-2050-2102.json', import.meta.url)));

// References: KASI 2012 announcement and korean-lunar-calendar KASI table.
// https://www.kasi.re.kr/kor/publication/post/newsMaterial/2444
const lunarFixtures = [
  [{ year: 2012, month: 4, day: 8, isLeapMonth: false }, '2012-05-28'],
  [{ year: 2012, month: 3, day: 1, isLeapMonth: true }, '2012-04-21'],
  [{ year: 2017, month: 5, day: 1, isLeapMonth: true }, '2017-06-24'],
  [{ year: 1997, month: 1, day: 1, isLeapMonth: false }, '1997-02-08'],
  [{ year: 2024, month: 1, day: 1, isLeapMonth: false }, '2024-02-10'],
];

for (const [format, e] of [['esm', esm], ['cjs', cjs]]) {
  test(`${format}: Korean lunar fixtures convert both ways and produce the same palja`, () => {
    for (const [lunar, key] of lunarFixtures) {
      const solar = e.lunarToSolar({ ...lunar, hour: 12, minute: 0 });
      assert.equal(dateKey(solar), key);
      const converted = e.solarToLunar(solar);
      assert.deepEqual([converted.year, converted.month, converted.day, converted.isLeapMonth], [lunar.year, lunar.month, lunar.day, lunar.isLeapMonth]);
      assert.deepEqual(e.calculatePalja(birth({ ...lunar, isLunar: true })), e.calculatePalja(birth(solar)));
    }
    assert.throws(() => e.lunarToSolar({ year: 2012, month: 4, day: 1, isLeapMonth: true }), err => err.code === 'MANSERYEOK_DATA_ERROR');
  });

  test(`${format}: true solar time changes the hour pillar, not the ipchun instant or yun direction`, () => {
    const b = birth({ year: 2024, month: 2, day: 4, hour: 17, minute: 40 });
    const regular = e.calculatePalja(b);
    const corrected = e.calculatePalja(b, { trueSolarTime: true, longitude: 127 });
    assert.equal(ym(regular), '甲辰 丙寅');
    assert.equal(ym(corrected), '甲辰 丙寅');
    assert.equal(regular.hourJi, '酉');
    assert.equal(corrected.hourJi, '申');
    const contexts = [false, true].map(trueSolarTime => e.createNormalizedManseryeokContext(b, { trueSolarTime }));
    const resolutions = contexts.map(c => e.ManseryeokEngine.getYunStartAgeResolutionFromContext(c, b.gender, '甲'));
    assert.deepEqual(contexts[0].yearMonthContextDateTime, contexts[1].yearMonthContextDateTime);
    assert.equal(contexts[0].yearMonthContextDateTime.basis, 'kst');
    assert.deepEqual(resolutions[0], resolutions[1]);
    assert.equal(resolutions[0].direction, 'forward');
    assert.equal(resolutions[0].targetJeol.koreanName, '경칩');
  });

  test(`${format}: UTC+08:30 birth labels use the actual instant for solar terms`, () => {
    const b = birth({ year: 1955, month: 2, day: 4, hour: 23, minute: 5 });
    const c = e.createNormalizedManseryeokContext(b);
    assert.equal(c.legalTime.totalOffsetMinutes, 510);
    assert.equal(c.yearMonthContextDateTime.minute, 35);
    assert.equal(ym(e.calculatePalja(b)), '乙未 戊寅');
  });

  test(`${format}: all 12 jeol boundaries agree across legal/DST/true-solar clocks`, () => {
    const ji = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
    const major = ['소한', '입춘', '경칩', '청명', '입하', '망종', '소서', '입추', '백로', '한로', '입동', '대설'];
    // Intl's independent IANA database supplies historical clock labels.
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Seoul', year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', hourCycle: 'h23',
    });
    for (const year of [1910, 1955, 1960, 1987, 1988, 2024]) {
      for (const term of e.listSolarTermsForYear(year).filter(t => major.includes(t.koreanName))) {
        const index = major.indexOf(term.koreanName);
        const termStamp = e.toKstTimestamp(term);
        for (const after of [false, true]) {
          const stamp = (after ? Math.floor(termStamp / 60_000) + 1 : Math.ceil(termStamp / 60_000) - 1) * 60_000;
          const fields = Object.fromEntries(formatter.formatToParts(new Date(stamp)).filter(p => p.type !== 'literal').map(p => [p.type, Number(p.value)]));
          const b = birth(fields);
          const expected = ji[(index + (after ? 1 : 0)) % 12];
          for (const trueSolarTime of [false, true]) {
            const p = e.calculatePalja(b, { trueSolarTime });
            assert.equal(p.monthJi, expected, `${year} ${term.koreanName}, after=${after}, trueSolarTime=${trueSolarTime}`);
          }
        }
      }
    }
  });

  test(`${format}: historical transition labels use half-open gaps and folds`, () => {
    // https://data.iana.org/time-zones/tzdb/asia, Asia/Seoul
    for (const d of [parts(1954, 3, 20, 23, 30), parts(1954, 3, 20, 23, 59, 59), parts(1987, 10, 11, 2, 30)]) {
      assert.throws(() => e.resolveKoreanLegalTime(d), err => err.code === 'AMBIGUOUS_CIVIL_TIME');
    }
    for (const d of [parts(1908, 4, 1, 0, 2, 7), parts(1912, 1, 1, 0, 0), parts(1912, 1, 1, 0, 29, 59), parts(1961, 8, 10, 0, 29, 59), parts(1987, 5, 10, 2, 30)]) {
      assert.throws(() => e.resolveKoreanLegalTime(d), err => err.code === 'NONEXISTENT_CIVIL_TIME');
    }
    for (const [d, offset] of [
      [parts(1908, 4, 1, 0, 2, 8), 510], [parts(1911, 12, 31, 23, 59, 59), 510],
      [parts(1912, 1, 1, 0, 30), 540], [parts(1954, 3, 20, 23, 29, 59), 540],
      [parts(1954, 3, 21, 0, 0), 510], [parts(1954, 3, 21, 0, 15), 510],
      [parts(1961, 8, 10, 0, 30), 540], [parts(1987, 5, 10, 3, 0), 600],
      [parts(1987, 10, 11, 3, 0), 540],
    ]) assert.equal(e.resolveKoreanLegalTime(d).totalOffsetMinutes, offset);
  });

  test(`${format}: unknown times preserve the date and do not create transition errors`, async () => {
    for (const d of [parts(1990, 5, 15, 0, 0), parts(1987, 8, 8, 0, 0), parts(1948, 6, 1, 0, 0), parts(1961, 8, 10, 0, 0)]) {
      const expected = e.getGanji({ ...d, hour: 12 }).day.ganji;
      for (const trueSolarTime of [false, true]) {
        for (const midnightMode of ['yaja', 'joja']) {
          const b = birth({ ...d, hour: null, minute: null });
          const c = e.createNormalizedManseryeokContext(b, { trueSolarTime, midnightMode });
          const p = e.calculatePalja(b, { trueSolarTime, midnightMode });
          assert.equal(dayPillar(p), expected);
          assert.equal(p.hourGan + p.hourJi, '');
          assert.equal(c.timeKnown, false);
          assert.equal(c.trueSolar.enabled, false);
          assert.equal(c.solarCivilDateTime.hour, 12);
          assert.equal(e.ManseryeokEngine.getPaljaFromContext(c).hourJi, '');
        }
      }
    }
    const env = await e.executeEngineModuleById('saju', {
      birth: birth({ year: 1948, month: 6, day: 1, hour: null, minute: null }), now: '2026-09-12T00:00:00Z',
    });
    assert.ok(env.warnings.some(w => w.code === 'TIME_UNKNOWN' && w.message.includes('정오')));
  });

  test(`${format}: known midnight correction and both zi-hour schools remain effective`, () => {
    const b = birth({ year: 1990, month: 5, day: 15, hour: 0, minute: 10 });
    assert.equal(dayPillar(e.calculatePalja(b)), '庚辰');
    assert.equal(dayPillar(e.calculatePalja(b, { trueSolarTime: true })), '己卯');
    const late = { ...b, hour: 23, minute: 30 };
    const yaja = e.calculatePalja(late, { midnightMode: 'yaja' });
    const joja = e.calculatePalja(late, { midnightMode: 'joja' });
    assert.equal(dayPillar(yaja), '庚辰');
    assert.equal(dayPillar(joja), '辛巳');
    assert.equal(ym(yaja), ym(joja));
    assert.equal(yaja.hourGan + yaja.hourJi, joja.hourGan + joja.hourJi);
  });

  test(`${format}: current daeun switches at its fractional start age, including the exact boundary`, () => {
    const b = birth({ year: 1990, month: 5, day: 15, hour: 14, minute: 30 });
    const p = e.calculatePalja(b);
    const rowsAt = time => e.calculateDaeun(p, b, 3, undefined, new Date(time));
    const early = rowsAt('1997-05-15T05:30:00Z');
    assert.ok(Math.abs(early[0].startAgeMonths - 86.87861111111111) < 1e-9);
    assert.equal(early.some(r => r.isCurrent), false);
    // 7 years + 2 months + 26 days 8h36m after birth, using 30 days/fractional month.
    const first = Date.parse('1997-08-10T14:06:00Z');
    assert.equal(rowsAt(first - 1).some(r => r.isCurrent), false);
    assert.equal(rowsAt(first)[0].isCurrent, true);
    const second = Date.parse('2007-08-10T14:06:00Z');
    assert.equal(rowsAt(second - 1)[0].isCurrent, true);
    assert.deepEqual(rowsAt(second).map(r => r.isCurrent), [false, true, false]);
  });

  test(`${format}: full results support both directions throughout the 2101 upper boundary`, () => {
    assert.equal(e.listSolarTermsForYear(2102).length, 24);
    for (const gender of ['male', 'female']) {
      for (const d of [parts(2101, 12, 8, 12, 0), parts(2101, 12, 31, 23, 59)]) {
        const result = e.buildSajuResult(birth({ ...d, gender }), { now: new Date('2026-09-12T00:00:00Z') });
        assert.equal(result.daeun.length, 8);
        assert.ok(result.daeun.every(r => Number.isFinite(r.startAgeMonths)));
      }
    }
    assert.throws(() => e.calculatePalja(birth(parts(2102, 1, 1, 12, 0))), err => err.code === 'MANSERYEOK_POLICY_ERROR');
  });
}

test('all 74,144 solar dates round-trip; all dates through 2050 agree with the Korean reference', () => {
  const reference = new KoreanLunarCalendar();
  let count = 0;
  for (let stamp = Date.UTC(1899, 0, 1); stamp <= Date.UTC(2101, 11, 31); stamp += 86_400_000) {
    const d = new Date(stamp);
    const solar = { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
    const lunar = esm.solarToLunar(solar);
    assert.equal(dateKey(esm.lunarToSolar(lunar)), dateKey(solar));
    if (solar.year <= 2050) {
      assert.ok(reference.setSolarDate(solar.year, solar.month, solar.day));
      const r = reference.getLunarCalendar();
      assert.deepEqual([lunar.year, lunar.month, lunar.day, lunar.isLeapMonth], [r.year, r.month, r.day, r.intercalation]);
    }
    count++;
  }
  assert.equal(count, 74144);
});

test('projected lunar month starts agree with NASA new-moon dates in KST', () => {
  for (const stamp of nasa.newMoons) {
    const d = new Date(Date.parse(stamp) + 9 * 3_600_000);
    if (d.getUTCFullYear() > 2101) continue;
    const lunar = esm.solarToLunar({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() });
    assert.equal(lunar.day, 1, stamp);
  }
  for (let year = 2051; year <= 2101; year++) {
    const winter = esm.listSolarTermsForYear(year).find(t => t.koreanName === '동지');
    const lunar = esm.solarToLunar(winter);
    assert.equal(lunar.month, 11, `Winter solstice ${year}`);
    assert.equal(lunar.isLeapMonth, false, `Winter solstice ${year}`);
  }
});

test('2024 solar-term timestamps remain within one minute of the KASI reference', () => {
  // https://astro.kasi.re.kr/life/post/calendardata
  const fixtures = [
    [1,6,5,49], [1,20,23,7], [2,4,17,27], [2,19,13,13], [3,5,11,23], [3,20,12,6],
    [4,4,16,2], [4,19,23,0], [5,5,9,10], [5,20,22,0], [6,5,13,10], [6,21,5,51],
    [7,6,23,20], [7,22,16,44], [8,7,9,9], [8,22,23,55], [9,7,12,11], [9,22,21,44],
    [10,8,4,0], [10,23,7,15], [11,7,7,20], [11,22,4,56], [12,7,0,17], [12,21,18,21],
  ];
  const terms = esm.listSolarTermsForYear(2024);
  assert.equal(terms.length, fixtures.length);
  fixtures.forEach(([month, day, hour, minute], i) => {
    const expected = Date.UTC(2024, month - 1, day, hour, minute);
    const t = terms[i];
    const actual = Date.UTC(t.year, t.month - 1, t.day, t.hour, t.minute, t.second);
    assert.ok(Math.abs(actual - expected) <= 60_000, t.koreanName);
  });
});
