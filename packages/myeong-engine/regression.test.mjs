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

test('ziwei derives the five-elements class from the ming-gong stem-branch naeum', async () => {
  // 음력 2024-03-01 자시(0시): 명궁 戊辰 → 대림목 → 목삼국 (년주 甲辰 부등화=화육국이 아님)
  const r = (await esm.executeEngineModuleById('ziwei', {
    calendarType: 'lunar', date: '2024-03-01', hour: 0, gender: 'male', isLeapMonth: false,
  })).result;
  const ming = r.palaces.find(p => p.name === '명궁');
  assert.equal(ming.heavenlyStem + ming.earthlyBranch, '무진');
  assert.equal(r.fiveElementsClass, '목삼국');
});

test('ziwei places 丙子·丁丑 stems and palace names in reverse branch order', async () => {
  // 甲辰년(2024): 오호둔 순행으로 子궁=丙子, 丑궁=丁丑
  const r = (await esm.executeEngineModuleById('ziwei', {
    calendarType: 'solar', date: '2024-05-01', hour: 10, gender: 'male',
  })).result;
  const ja = r.palaces.find(p => p.earthlyBranch === '자');
  const chuk = r.palaces.find(p => p.earthlyBranch === '축');
  assert.equal(ja.heavenlyStem, '병');
  assert.equal(chuk.heavenlyStem, '정');
  // 궁명은 명궁에서 지지 역행으로 배치된다
  const bro = r.palaces.find(p => p.name === '형제');
  const ji = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];
  assert.equal(ji.indexOf(bro.earthlyBranch), (ji.indexOf(mingBranch(r)) + 11) % 12);
  function mingBranch(res) {
    return res.palaces.find(p => p.name === '명궁').earthlyBranch;
  }
});

test('ziwei star position follows the quotient-and-offset rule', async () => {
  // 목삼국(3) 음력 1일 → 자미=辰(진). 보수법: 1+2=3, 3/3=1, 寅+0=寅에서 보수2(짝수) 순행 → 辰
  const r = (await esm.executeEngineModuleById('ziwei', {
    calendarType: 'lunar', date: '2024-03-01', hour: 0, gender: 'male', isLeapMonth: false,
  })).result;
  assert.equal(r.fiveElementsClass, '목삼국');
  const ziweiPalace = r.palaces.find(p => p.majorStars.some(s => s.name === '자미'));
  assert.equal(ziweiPalace.earthlyBranch, '진');
});

test('qimen places all nine stems including 乙 and honors the term instant', async () => {
  for (const day of [1, 4, 7, 10, 13, 16, 19, 22, 25, 28]) {
    for (const hour of [0, 6, 12, 18]) {
      const r = (await esm.executeEngineModuleById('qimen', {
        solarDate: `2024-01-${String(day).padStart(2, '0')}`, hour,
      })).result;
      const earthStems = r.palaces.map(p => p.earthStem);
      assert.ok(earthStems.includes('乙'), `2024-01-${day} ${hour}h earth plate missing 乙`);
      assert.ok(earthStems.every(s => s !== ''), 'earth plate has empty palace');
    }
  }
  // 하지 2024-06-21 05:51: 절입 전은 망종, 후는 하지
  const before = (await esm.executeEngineModuleById('qimen', { solarDate: '2024-06-21', hour: 5 })).result;
  const after = (await esm.executeEngineModuleById('qimen', { solarDate: '2024-06-21', hour: 6 })).result;
  assert.equal(before.solarTerm, '망종');
  assert.equal(after.solarTerm, '하지');
});

test('daeyukim switches woljang at the exact term instant', async () => {
  // 우수 2024-02-19 13:13: 절입 전 월장 子(대한 기준), 후 亥(우수 기준)
  const before = (await esm.executeEngineModuleById('daeyukim', { solarDate: '2024-02-19', hour: 12 })).result;
  const after = (await esm.executeEngineModuleById('daeyukim', { solarDate: '2024-02-19', hour: 14 })).result;
  assert.equal(before.wolJang, '子');
  assert.equal(after.wolJang, '亥');
});

test('gyeokguk reaches special formations before ordinary classification', () => {
  // 甲일간 + 己월간 + 辰월지 → 갑기합화토격 (정격 판별보다 특수격 우선)
  const r = esm.determineGyeokguk({
    yearGan: '甲', yearJi: '子', monthGan: '己', monthJi: '辰',
    dayGan: '甲', dayJi: '午', hourGan: '丙', hourJi: '寅',
  });
  assert.equal(r.name, '갑기합화토격');
  // 정격 경로는 여전히 동작한다
  const ordinary = esm.determineGyeokguk({
    yearGan: '甲', yearJi: '子', monthGan: '丙', monthJi: '子',
    dayGan: '丙', dayJi: '午', hourGan: '丙', hourJi: '寅',
  });
  assert.ok(ordinary.name.length > 0);
});

test('contract validation rejects invalid and non-finite inputs', async () => {
  const reject = async (id, input, code) => {
    await assert.rejects(
      esm.executeEngineModuleById(id, input),
      err => err.code === code,
      `${id} ${JSON.stringify(input)}`,
    );
  };
  await reject('maehwa', { method: 'number', first: NaN, second: 3 }, 'INVALID_INPUT');
  await reject('maehwa', { method: 'number', first: Infinity, second: 3 }, 'INVALID_INPUT');
  await reject('maehwa', { method: 'number', first: -1, second: 3 }, 'OUT_OF_RANGE');
  await reject('harak', { year: 2024, month: 99, day: 99 }, 'INVALID_INPUT');
  await reject('ziwei', { calendarType: 'solar', date: '1990-01-01', hour: 24, gender: 'male' }, 'OUT_OF_RANGE');
  await reject('qimen', { solarDate: '2024-13-40', hour: 10 }, 'INVALID_INPUT');
  await reject('hongyeon', { palja: { yearGan: '', yearJi: '', monthGan: '', monthJi: '', dayGan: '', dayJi: '', hourGan: '', hourJi: '' } }, 'INVALID_INPUT');
  await reject('saju', { birth: birth({ year: 1990, month: 5, day: 15, hour: 99 }), now: '2025-01-15T00:00:00Z' }, 'OUT_OF_RANGE');

  // 3주(시주 생략) 입력은 경고와 함께 통과한다
  const hy = await esm.executeEngineModuleById('hongyeon', {
    palja: { yearGan: '甲', yearJi: '子', monthGan: '己', monthJi: '辰', dayGan: '甲', dayJi: '午', hourGan: '', hourJi: '' },
  });
  assert.ok(hy.warnings.some(w => w.code === 'PARTIAL_THREE_PILLARS'));
});

test('compatibility scores unknown-time charts against the valid-character count', async () => {
  const p = { year: 1990, month: 5, day: 15, hour: null, minute: null, gender: 'male' };
  const q = { year: 1992, month: 7, day: 20, hour: null, minute: null, gender: 'female' };
  const env = await esm.executeEngineModuleById('compatibility', { person1: p, person2: q });
  assert.equal(env.warnings.filter(w => w.code === 'TIME_UNKNOWN').length, 2);
  assert.ok(Number.isFinite(env.result.ohaengComplement.score));
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

test('tojeong derives a collision-free 8x6x3 gwae from traditional formulas', () => {
  // 갑진년(2024): 태세수 = 중천수(甲 11) + 중천수(辰 11) = 22
  // 생년 1990 → 한국나이 35 → 상괘 = (35 + 22) % 8 = 1
  const r = esm.analyzeTojeong(1990, 5, 15, 2024);
  assert.equal(r.gwae.sangGwae, 1);
  assert.ok(r.gwae.jungGwae >= 1 && r.gwae.jungGwae <= 6);
  assert.ok(r.gwae.haGwae >= 1 && r.gwae.haGwae <= 3);
  const expected =
    (r.gwae.sangGwae - 1) * 18 + (r.gwae.jungGwae - 1) * 3 + r.gwae.haGwae;
  assert.equal(r.gwae.gwaeNumber, expected);
  assert.equal(r.gwae.gwaeCode, `${r.gwae.sangGwae}${r.gwae.jungGwae}${r.gwae.haGwae}`);
  assert.ok(r.interpretation && r.interpretation.title);
  // 생년이 결과에 반영된다
  const other = esm.analyzeTojeong(1991, 5, 15, 2024);
  assert.notEqual(other.gwae.sangGwae, r.gwae.sangGwae);
});

test('lunar month length helper returns 29 or 30 and matches conversion range', () => {
  for (const [y, m] of [[2024, 1], [2024, 5], [2023, 2], [1990, 9]]) {
    const days = esm.getLunarMonthDays(y, m);
    assert.ok(days === 29 || days === 30, `${y}-${m}: ${days}`);
    // 말일(30) 변환 가능 여부와 일치해야 한다
    let day30ok = true;
    try { esm.lunarToSolar({ year: y, month: m, day: 30, isLeapMonth: false }); } catch { day30ok = false; }
    assert.equal(day30ok, days === 30, `${y}-${m} day30 vs days=${days}`);
  }
});

test('harak hexagram lookup respects the lower*10+upper key convention', () => {
  assert.equal(esm.calculateHexagramNumber(1, 8), 12); // 天地否
  assert.equal(esm.calculateHexagramNumber(8, 1), 11); // 地天泰
  assert.throws(() => esm.calculateHexagramNumber(0, 5));
  assert.throws(() => esm.calculateHexagramNumber(9, 5));
  const h = esm.calculateHarak(2024, 6, 15);
  assert.ok(h.hexagramNumber >= 1 && h.hexagramNumber <= 64);
});

test('daeyukim applies the nine-gates derivation with jeok-first priority', () => {
  const r = esm.calculateDaeyukim('2024-06-15', 10);
  assert.ok(typeof r.gwaMyeong === 'string' && r.gwaMyeong.endsWith('과'));
  assert.equal(r.samJeon.length, 3);
  // 사과에서 적(하극상)이 정확히 1개면 그 상신이 초전이어야 한다
  const O = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };
  const BO = { 子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水' };
  const haJek = r.saGwa.filter(g => O[BO[g.lower]] === BO[g.upper]);
  if (haJek.length === 1) {
    assert.equal(r.samJeon[0].branch, haJek[0].upper);
  }
});

test('naming rejects partial hanja arrays and non-hangul characters', () => {
  assert.throws(() => esm.analyzeNameExtended('김', '철수', { hanjaChars: ['金', '哲'] }));
  const ok = esm.analyzeNameExtended('김', '철수', { hanjaChars: ['金', '哲', '秀'] });
  assert.equal(ok.hanjaStrokes.length, 3);
  assert.throws(() => esm.analyzeNameExtended('김', 'AB', {}));
});

test('calendar emits the twelve officers (十二直) names', () => {
  const TWELVE = new Set(['건일', '제일', '만일', '평일', '정일', '집일', '파일', '위일', '성일', '수일', '개일', '폐일']);
  const seen = new Set();
  for (let d = 1; d <= 28; d++) {
    const day = esm.getCalendarDay(2024, 3, d);
    assert.ok(TWELVE.has(day.sinsal12), `unexpected: ${day.sinsal12}`);
    seen.add(day.sinsal12);
  }
  // 건제법은 12일 주기 — 한 달에 12종 전부 등장해야 한다
  assert.equal(seen.size, 12);
});

test('package version matches ENGINE_VERSION', () => {
  const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url)));
  assert.equal(pkg.version, esm.ENGINE_VERSION);
});

// ---------- 원리 검증 — 구현 결과가 아니라 고전 규칙 자체를 단언한다 ----------

test('旺相休囚死 direction follows the classical rule (五行精紀)', () => {
  // 당령자는 旺, 당령이 생하는 것은 相, 당령을 생하는 것은 休,
  // 당령을 극하는 것은 囚, 당령이 극하는 것은 死
  // 일간 甲(목) 기준 — 강약용신 학파의 reasoning에 (旺|相|休|囚|死, 점수…)로 노출된다
  const at = (month, day) =>
    esm.buildSajuResult(birth({ year: 1990, month, day }), {
      now: new Date('2026-09-12T00:00:00Z'),
      subSchool: 'gangyak',
    });
  const wangOf = r => r.yongsin.reasoning.match(/\(([旺相休囚死]),\s*점수/)[1];
  const cases = [
    [{ month: 2, day: 8 }, '甲辰', '寅', '旺'],   // 같은 오행(목)
    [{ month: 11, day: 15 }, '甲申', '亥', '相'],  // 수생목 — 당령이 일간을 생함
    [{ month: 5, day: 9 }, '甲戌', '巳', '休'],    // 목생화 — 일간이 당령을 생함
    [{ month: 4, day: 9 }, '甲辰', '辰', '囚'],    // 목극토 — 일간이 당령을 극함
    [{ month: 9, day: 16 }, '甲申', '酉', '死'],   // 금극목 — 당령이 일간을 극함
  ];
  for (const [input, dayP, monthJi, expected] of cases) {
    const r = at(input.month, input.day);
    assert.equal(dayPillar(r.palja), dayP, `${JSON.stringify(input)} 일주`);
    assert.equal(r.palja.monthJi, monthJi, `${JSON.stringify(input)} 월지`);
    assert.equal(wangOf(r), expected, `${dayP} ${monthJi}월 → ${expected} 기대, 실제 ${r.yongsin.reasoning}`);
  }
});

test('삼형 두 글자 조합도 형으로 감지하고 완성형은 중복 보고하지 않는다', () => {
  const mk = (y, m, d, h) => ({
    yearGan: '甲', yearJi: y, monthGan: '丙', monthJi: m, dayGan: '戊', dayJi: d, hourGan: '庚', hourJi: h,
  });
  const hyeong = rels => rels.filter(x => x.type === '형').map(x => x.jijis.join(''));
  // 寅巳申 계열 부분쌍 (세 번째 글자 없음)
  assert.ok(hyeong(esm.analyzeJijiRelations(mk('寅', '巳', '午', '子'))).includes('寅巳'), '寅巳 부분 형');
  assert.ok(hyeong(esm.analyzeJijiRelations(mk('巳', '申', '午', '子'))).includes('巳申'), '巳申 부분 형');
  assert.ok(hyeong(esm.analyzeJijiRelations(mk('寅', '申', '午', '子'))).includes('寅申'), '寅申 부분 형');
  // 丑戌未 계열 부분쌍
  assert.ok(hyeong(esm.analyzeJijiRelations(mk('丑', '戌', '寅', '子'))).includes('丑戌'), '丑戌 부분 형');
  assert.ok(hyeong(esm.analyzeJijiRelations(mk('戌', '未', '寅', '子'))).includes('戌未'), '戌未 부분 형');
  assert.ok(hyeong(esm.analyzeJijiRelations(mk('丑', '未', '寅', '子'))).includes('丑未'), '丑未 부분 형');
  // 완성형은 삼형 하나만 — 부분쌍을 중복 보고하지 않는다
  const triple = hyeong(esm.analyzeJijiRelations(mk('寅', '巳', '申', '子')));
  assert.deepEqual(triple, ['寅巳申'], `완성형만 보고: ${triple}`);
  // 형이 아예 없는 조합에서는 false positive가 없어야 한다 (子卯형을 피하기 위해 子 없이 구성)
  assert.equal(hyeong(esm.analyzeJijiRelations(mk('寅', '午', '辰', '酉'))).length, 0, '寅午辰酉 — 형 없음');
});

test('lunar birth dates are validated by lunar month length and leap-month existence', async () => {
  const run = input =>
    esm.executeEngineModuleById('saju', { birth: birth({ isLunar: true, ...input }), now: '2025-01-15T00:00:00Z' });
  // 유효한 음력 1909-02-30 — 양력 2월은 28일이지만 음력 2월은 30일까지 존재한다
  const ok = await run({ year: 1909, month: 2, day: 30 });
  assert.equal(ok.moduleId, 'saju');
  // 존재하지 않는 음력 2000-03-30 — 그 해 음력 3월은 29일
  assert.equal(esm.getLunarMonthDays(2000, 3), 29);
  await assert.rejects(run({ year: 2000, month: 3, day: 30 }), err => err.code === 'INVALID_INPUT');
  // 윤달 — 2012년은 윤3월이 실제로 존재하고 윤4월은 없다
  const leap = await run({ year: 2012, month: 3, day: 15, isLeapMonth: true });
  assert.equal(leap.moduleId, 'saju');
  await assert.rejects(run({ year: 2012, month: 4, day: 15, isLeapMonth: true }), err => err.code === 'INVALID_INPUT');
});

test('now requires RFC 3339 with an explicit UTC designator and a real date', async () => {
  const run = now => esm.executeEngineModuleById('saju', { birth: birth({ year: 1990, month: 5, day: 15 }), now });
  await assert.rejects(run('0'), err => err.code === 'INVALID_INPUT');                    // 숫자 문자열
  await assert.rejects(run('2025-02-30'), err => err.code === 'INVALID_INPUT');           // 형식 자체가 불량
  await assert.rejects(run('2025-01-01T00:00:00'), err => err.code === 'INVALID_INPUT');  // 타임존 없음
  await assert.rejects(run('2025-02-30T00:00:00Z'), err => err.code === 'INVALID_INPUT'); // 정규화되던 무효 날짜
  assert.equal((await run('2025-01-15T00:00:00Z')).moduleId, 'saju');
  assert.equal((await run('2025-01-15T09:00:00+09:00')).moduleId, 'saju');
});

test('judgeGanJi judges stem and branch axes separately and reports mixed verdicts', () => {
  // 甲子 丁丑 己酉 壬申 — 용신 금·기신 화
  const r = esm.buildSajuResult(birth({ year: 1985, month: 1, day: 10, hour: 16, minute: 45 }), {
    now: new Date('2026-09-13T12:00:00+09:00'),
  });
  const mixed = esm.judgeGanJi(r, '辛', '巳');
  assert.equal(mixed.verdict, 'mixed');
  assert.equal(mixed.ganAxis.verdict, 'fit');      // 천간 辛(금) = 용신
  assert.equal(mixed.jiAxis.verdict, 'tension');   // 지지 巳(화) = 기신
  // 두 축이 같은 방향이면 그 방향으로 판정
  assert.equal(esm.judgeGanJi(r, '庚', '申').verdict, 'fit');       // 庚申 = 금·금
  assert.equal(esm.judgeGanJi(r, '丙', '午').verdict, 'tension');   // 丙午 = 화·화
  // 한 축만 방향이 있으면 그 축을 따른다 — 巳화 기신 + 甲목 준기신
  assert.equal(esm.judgeGanJi(r, '甲', '巳').verdict, 'tension');
});

test('judgeGanJi neutral axis exists and a directed axis dominates a neutral one', () => {
  // 甲辰 일주 — 용신 금, 기신 토: 수는 양축 모두 중간이다
  const r = esm.buildSajuResult(birth({ year: 1985, month: 1, day: 5 }), {
    now: new Date('2026-09-13T12:00:00+09:00'),
  });
  const neutral = esm.judgeGanJi(r, '壬', '子');
  assert.equal(neutral.verdict, 'neutral');
  assert.equal(neutral.ganAxis.verdict, 'neutral');
  assert.equal(neutral.jiAxis.verdict, 'neutral');
  // 천간 甲목 용신 방향 + 지지 子수 중간 → 방향 있는 축을 따른다
  const oneSided = esm.judgeGanJi(r, '甲', '子');
  assert.equal(oneSided.verdict, 'fit');
  assert.equal(oneSided.ganAxis.verdict, 'fit');
  assert.equal(oneSided.jiAxis.verdict, 'neutral');
});

test('SajuResult.asOf pins the reference time so omitted now stays deterministic', () => {
  const asOf = new Date('2032-10-01T12:00:00+09:00'); // 辛巳 대운 종료 직전 — 전환 임박 구간
  const r = esm.buildSajuResult(birth({ year: 1985, month: 1, day: 10, hour: 16, minute: 45 }), { now: asOf });
  assert.equal(r.asOf, asOf.toISOString());
  const implicit = esm.buildTimingNarrative(r);          // now 생략 → asOf 기준
  const explicit = esm.buildTimingNarrative(r, asOf);
  assert.deepEqual(implicit, explicit, 'now 생략 시 asOf 기준과 동일해야 한다');
  assert.ok(implicit.transition?.imminent, 'asOf 기준으로 전환 임박 판정');
});

test('gyeokguk exposes confidence, basis, and blockers metadata', () => {
  const r = esm.buildSajuResult(birth({ year: 1985, month: 1, day: 10, hour: 16, minute: 45 }), {
    now: new Date('2026-09-13T12:00:00+09:00'),
  });
  assert.ok(['확정', '유력', '참고'].includes(r.gyeokguk.confidence), `confidence: ${r.gyeokguk.confidence}`);
  assert.ok(Array.isArray(r.gyeokguk.basis) && r.gyeokguk.basis.length > 0, '성립 근거');
  assert.ok(Array.isArray(r.gyeokguk.blockers), '불성립 조건 배열');
  // 화격 후보 — 甲己 간합 + 辰月(토)은 쟁합·극화 없이 성립해야 확정
  const hw = esm.determineGyeokguk({
    yearGan: '丙', yearJi: '子', monthGan: '己', monthJi: '辰', dayGan: '甲', dayJi: '午', hourGan: '丙', hourJi: '寅',
  });
  assert.equal(hw.name, '갑기합화토격');
  assert.equal(hw.confidence, '확정');
  // 쟁합 — 같은 甲이 년간에 중복되면 신뢰도가 낮아진다
  const jang = esm.determineGyeokguk({
    yearGan: '甲', yearJi: '子', monthGan: '己', monthJi: '辰', dayGan: '甲', dayJi: '午', hourGan: '丙', hourJi: '寅',
  });
  assert.equal(jang.name, '갑기합화토격');
  assert.notEqual(jang.confidence, '확정');
  assert.ok(jang.blockers.some(b => b.includes('쟁합')), `쟁합 blocker: ${jang.blockers}`);
});

test('report discloses which strength and yongsin models produced the output', () => {
  const r = esm.buildSajuResult(birth({ year: 1985, month: 1, day: 10, hour: 16, minute: 45 }), {
    now: new Date('2026-09-13T12:00:00+09:00'),
  });
  const rep = esm.assembleReport(r);
  assert.ok(rep.context.strengthModel.includes('점유율'), '강약 모델 명시');
  assert.ok(rep.context.yongsinModel.includes('용신'), '용신 모델 명시');
  assert.ok(rep.context.modelNote.length > 10, '두 모델의 관계 안내');
  const md = esm.renderReportMarkdown(rep);
  assert.ok(md.includes('계산 모델'), '마크다운 리포트에 모델 명시');
});

test('jijanggan 子 follows the 子中單癸水 convention (single hidden stem)', () => {
  assert.deepEqual(esm.JIJANGGAN_TABLE['子'], ['癸']);
  const detail = esm.calculateJijangganSipsin({
    yearGan: '甲', yearJi: '子', monthGan: '丙', monthJi: '寅', dayGan: '戊', dayJi: '辰', hourGan: '庚', hourJi: '午',
  });
  // 子는 본기 하나만 — 여기·중기 키가 없어야 한다
  assert.deepEqual(Object.keys(detail.yearJi), ['bongi']);
  assert.ok('junggi' in detail.monthJi && 'yeogi' in detail.monthJi, '寅은 여기·중기·본기');
});
