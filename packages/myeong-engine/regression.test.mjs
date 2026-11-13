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
  // 甲일간 + 己월간 + 辰월지(토 당령), 쟁합·극화 없음 → 갑기합화토격 (정격 판별보다 특수격 우선)
  const r = esm.determineGyeokguk({
    yearGan: '丙', yearJi: '子', monthGan: '己', monthJi: '辰',
    dayGan: '甲', dayJi: '午', hourGan: '丙', hourJi: '寅',
  });
  assert.equal(r.name, '갑기합화토격');
  // 년간 甲(쟁합·극화)이 있으면 참고 수준이라 정격이 대표, 화격은 후보로만 남는다
  const weak = esm.determineGyeokguk({
    yearGan: '甲', yearJi: '子', monthGan: '己', monthJi: '辰',
    dayGan: '甲', dayJi: '午', hourGan: '丙', hourJi: '寅',
  });
  assert.equal(weak.name, '편재격');
  assert.ok(weak.candidates?.some((c) => c.name === '갑기합화토격' && c.confidence === '참고'));
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
  assert.equal(r.interpretation, null);
  assert.equal(r.contentStatus, 'unverified');
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
  // 甲子 丁丑 己酉 壬申 비견격(록겁) — 용신 목(관성)·기신 금(식상)
  const r = esm.buildSajuResult(birth({ year: 1985, month: 1, day: 10, hour: 16, minute: 45 }), {
    now: new Date('2026-09-13T12:00:00+09:00'),
  });
  assert.equal(r.yongsin.ohaeng, '목');
  const mixed = esm.judgeGanJi(r, '甲', '申');
  assert.equal(mixed.verdict, 'mixed');
  assert.equal(mixed.ganAxis.verdict, 'fit');      // 천간 甲(목) = 용신
  assert.equal(mixed.jiAxis.verdict, 'tension');   // 지지 申(금) = 기신
  // 두 축이 같은 방향이면 그 방향으로 판정
  assert.equal(esm.judgeGanJi(r, '甲', '寅').verdict, 'fit');       // 甲寅 = 목·목
  assert.equal(esm.judgeGanJi(r, '庚', '申').verdict, 'tension');   // 庚申 = 금·금
  // 준기신(戊토, 기신 금을 생함) + 기신(申금) → tension
  assert.equal(esm.judgeGanJi(r, '戊', '申').verdict, 'tension');
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
  const jangResult = esm.determineGyeokguk({
    yearGan: '甲', yearJi: '子', monthGan: '己', monthJi: '辰', dayGan: '甲', dayJi: '午', hourGan: '丙', hourJi: '寅',
  });
  // 참고 수준 화격은 대표가 되지 않고 후보로 남는다 — 신뢰도·불성립 조건은 후보에 그대로 실린다
  const jang = jangResult.candidates.find((c) => c.name === '갑기합화토격');
  assert.ok(jang, `후보: ${jangResult.candidates?.map((c) => c.name)}`);
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

test('daeun direction follows the 陽男陰女順行 / 陰男陽女逆行 rule', () => {
  const GANS = '甲乙丙丁戊己庚辛壬癸', JIS = '子丑寅卯辰巳午未申酉戌亥';
  const step = (g, j, d) =>
    GANS[(GANS.indexOf(g) + d + 10) % 10] + JIS[(JIS.indexOf(j) + d + 12) % 12];
  const at = (year, gender) =>
    esm.buildSajuResult(birth({ year, month: 6, day: 15, gender }), { now: new Date('2026-09-12T00:00:00Z') });
  // 1990 = 庚午년 — 庚은 양간: 남자 순행(월주 다음 간지부터), 여자 역행
  const yangM = at(1990, 'male'), yangF = at(1990, 'female');
  for (const [r, dir, label] of [[yangM, +1, '양남 순행'], [yangF, -1, '양녀 역행']]) {
    const expected0 = step(r.palja.monthGan, r.palja.monthJi, dir);
    assert.equal(r.daeun[0].gan + r.daeun[0].ji, expected0, `${label} 첫 대운 — 월주 ${r.palja.monthGan}${r.palja.monthJi}에서 ${dir > 0 ? '다음' : '이전'} 간지`);
    for (let i = 1; i < r.daeun.length; i++) {
      const prev = r.daeun[i - 1], cur = r.daeun[i];
      assert.equal(cur.gan + cur.ji, step(prev.gan, prev.ji, dir), `${label} ${i}번째 대운 연속 ${dir > 0 ? '순' : '역'}행`);
    }
  }
  // 1991 = 辛未년 — 辛은 음간: 남자 역행, 여자 순행
  const yinM = at(1991, 'male'), yinF = at(1991, 'female');
  assert.equal(yinM.daeun[0].gan + yinM.daeun[0].ji, step(yinM.palja.monthGan, yinM.palja.monthJi, -1), '음남 역행');
  assert.equal(yinF.daeun[0].gan + yinF.daeun[0].ji, step(yinF.palja.monthGan, yinF.palja.monthJi, +1), '음녀 순행');
});

test('대운 개시 나이가 0~10세 범위이고 각 대운의 지지 오행이 함께 실린다', () => {
  const r = esm.buildSajuResult(birth({ year: 1985, month: 1, day: 10, hour: 16, minute: 45 }), { now: new Date('2025-12-13T00:00:00+09:00') });
  assert.ok(r.daeun[0].age > 0 && r.daeun[0].age <= 10, `개시 나이 ${r.daeun[0].age}`);
  for (const d of r.daeun) {
    assert.ok(d.ohaeng && d.jiOhaeng, `대운 ${d.gan}${d.ji} 양축 오행`);
    assert.ok(['목','화','토','금','수'].includes(d.jiOhaeng), `jiOhaeng=${d.jiOhaeng}`);
  }
  // 현재 대운에는 isCurrent 표시가 있어야 한다
  assert.ok(r.daeun.some(d => d.isCurrent), 'asOf 기준 현재 대운 표시');
});

test('지지 육합·육충 전체 매트릭스가 감지된다', () => {
  const mk = (a, b) => ({ yearGan:'甲', yearJi:a, monthGan:'丙', monthJi:b, dayGan:'戊', dayJi:'辰', hourGan:'庚', hourJi:'戌' });
  const rel = (a, b, t) => esm.analyzeJijiRelations(mk(a, b)).filter(x => x.type === t && x.jijis.includes(a) && x.jijis.includes(b));
  for (const [a, b] of [['子','丑'],['寅','亥'],['卯','戌'],['辰','酉'],['巳','申'],['午','未']])
    assert.ok(rel(a, b, '합').length > 0, `육합 ${a}${b}`);
  for (const [a, b] of [['子','午'],['丑','未'],['寅','申'],['卯','酉'],['辰','戌'],['巳','亥']])
    assert.ok(rel(a, b, '충').length > 0, `육충 ${a}${b}`);
  // 해(害) 6쌍
  for (const [a, b] of [['子','未'],['丑','午'],['寅','巳'],['卯','辰'],['申','亥'],['酉','戌']])
    assert.ok(rel(a, b, '해').length > 0, `육해 ${a}${b}`);
  // 파(破) 6쌍
  for (const [a, b] of [['子','酉'],['丑','辰'],['寅','亥'],['卯','午'],['巳','申'],['未','戌']])
    assert.ok(rel(a, b, '파').length > 0, `육파 ${a}${b}`);
});

test('세운·월운 간지가 60갑자 규칙과 일치한다', () => {
  // 2026년은 丙午년 — 세운 간지로 丙午가 와야 한다
  const r = esm.buildSajuResult(birth({ year: 1985, month: 1, day: 10, hour: 16, minute: 45 }), { now: new Date('2026-06-15T12:00:00+09:00') });
  assert.equal(r.seun.gan + r.seun.ji, '丙午', `2026년 세운 — 실제 ${r.seun.gan}${r.seun.ji}`);
  assert.equal(r.wolun.gan + r.wolun.ji, '甲午', `2026년 6월(입양력 기준) 월운 — 실제 ${r.wolun.gan}${r.wolun.ji}`);
});

test('학파별 용신 스프레드와 점수제 강약이 결과에 함께 실린다', () => {
  const r = esm.buildSajuResult(birth({ year: 1985, month: 1, day: 10, hour: 16, minute: 45 }), { now: new Date('2025-12-13T00:00:00+09:00') });
  // 4학파 전부 존재하고 각각 오행을 결정한다
  for (const s of ['gyeokguk', 'johu', 'gangyak', 'mulsang']) {
    assert.ok(r.yongsinBySchool?.[s]?.ohaeng, `${s} 학파 용신`);
    assert.ok(['목','화','토','금','수'].includes(r.yongsinBySchool[s].ohaeng));
  }
  // 기본값은 선택 학파(격국)의 결과와 같아야 한다
  assert.equal(r.yongsin.ohaeng, r.yongsinBySchool.gyeokguk.ohaeng);
  // 점수제 강약 — 구조와 필드 존재
  const sa = r.strengthAssessment;
  assert.ok(sa && ['strong','neutral','weak'].includes(sa.level) && sa.label && Number.isFinite(sa.score));
  assert.ok(['旺','相','休','囚','死'].includes(sa.wangState), `왕상휴수사: ${sa.wangState}`);
  // 리포트에도 병기된다
  const rep = esm.assembleReport(r);
  assert.ok(rep.context.yongsinSchoolSpread.includes('격국') && rep.context.yongsinSchoolSpread.includes('조후'), '학파 스프레드');
  assert.ok(rep.context.strengthScoreLabel.includes(sa.label), '점수제 강약 병기');
});

test('루트 소스와 패키지 미러의 생성 콘텐츠 DB가 동일하다', () => {
  const root = JSON.parse(readFileSync(new URL('../../src/engine/interpretation/content-db.generated.json', import.meta.url)));
  const pkg = JSON.parse(readFileSync(new URL('./src/engine/interpretation/content-db.generated.json', import.meta.url)));
  assert.deepEqual(pkg, root, 'build.mjs가 루트·미러에 같은 DB를 생성해야 한다');
  assert.ok(Object.keys(root).length >= 160, `엔트리 수: ${Object.keys(root).length}`);
});

test('격국이 차순위 후보를 함께 노출한다 (특수격 성립 시 정격이 candidates로)', () => {
  // 화격 + 정격 동시 성립 — 甲己 간합이 辰월(토)에 득령, 정격으로는 辰 본기 戊 = 편재격
  const hwa = esm.determineGyeokguk({
    yearGan: '丙', yearJi: '子', monthGan: '己', monthJi: '辰', dayGan: '甲', dayJi: '午', hourGan: '丙', hourJi: '寅',
  });
  assert.equal(hwa.name, '갑기합화토격');
  assert.ok(hwa.candidates?.some(c => c.name === '편재격'), `후보 목록: ${hwa.candidates?.map(c => c.name)}`);

  // 건록월 — 실제 생일로 甲日 寅月을 찾는다 (2024-02는 丙寅월)
  let r;
  for (let d = 5; d < 29; d++) {
    const cand = esm.buildSajuResult(birth({ year: 2024, month: 2, day: d }), { now: new Date('2026-09-12T00:00:00Z') });
    if (cand.palja.dayGan === '甲' && cand.palja.monthJi === '寅') { r = cand; break; }
  }
  assert.ok(r, '甲日 寅月 명식을 찾아야 한다');
  // 건록격(또는 더 상위 특수격)이 대표이고, 정격이 후보로 남는다
  assert.ok(r.gyeokguk.candidates?.length > 0, `후보 없음 — gyeokguk=${r.gyeokguk.name}`);
  assert.ok(r.gyeokguk.candidates.every(c => c.name.endsWith('격') && c.confidence && c.basis?.length));
  const md = esm.renderReportMarkdown(esm.assembleReport(r));
  assert.ok(md.includes('격국 후보'), '리포트에 격국 후보 표기');
});

test('학파별 용신 근거와 일치/불일치가 리포트에 노출된다', () => {
  const r = esm.buildSajuResult(birth({ year: 1985, month: 1, day: 10, hour: 16, minute: 45 }), {
    now: new Date('2025-12-13T00:00:00+09:00'),
  });
  const rep = esm.assembleReport(r);
  const details = rep.context.yongsinSchoolDetails;
  assert.ok(details?.length === 4, '4학파 상세');
  for (const d of details) {
    assert.ok(d.school && d.yongsin && d.gisin && d.reasoning.length > 5, `${d.school} 근거`);
    assert.equal(typeof d.agree, 'boolean');
  }
  // 이 명식은 격국(금)과 조후·강약·물상(화)이 갈린다 — 불일치 표시가 있어야 한다
  assert.ok(details.some(d => !d.agree), '학파 불일치 케이스 존재');
  const md = esm.renderReportMarkdown(rep);
  assert.ok(md.includes('학파: 용신'), '학파별 근거 행');
  assert.ok(md.includes('불일치'), '불일치 표기');
});

test('applyPractitionerOverride — 역술인 선택이 용신·격국·운 판정·리포트에 일관 반영된다', () => {
  const r = esm.buildSajuResult(birth({ year: 1985, month: 1, day: 10, hour: 16, minute: 45 }), {
    now: new Date('2025-12-13T00:00:00+09:00'),
  });
  assert.equal(esm.judgeGanJi(r, '辛', '巳').verdict, 'mixed', '기본 용신(목)·기신(금) 기준 辛巳는 혼재');
  assert.equal(esm.judgeGanJi(r, '壬', '子').verdict, 'fit', '기본 용신(목) 기준 壬子(수)는 준용신 fit');

  // 학파 채택 — 조후학파 용신(화)·기신(수)으로 바꾸면 壬子는 tension, 丙午는 fit
  const picked = esm.applyPractitionerOverride(r, { yongsinSchool: 'johu', note: '丑월 조후 우선' });
  assert.equal(picked.yongsin.ohaeng, r.yongsinBySchool.johu.ohaeng);
  assert.ok(picked.yongsin.reasoning.includes('최종 채택'));
  assert.equal(picked.practitionerOverride?.note, '丑월 조후 우선');
  assert.equal(esm.judgeGanJi(picked, '丙', '午').verdict, 'fit', '용신 화 기준 丙午 = 용신축 일치 → fit');
  assert.equal(esm.judgeGanJi(picked, '壬', '子').verdict, 'tension', '조후 기신(수) 기준 壬子 → tension');
  const rep = esm.assembleReport(picked);
  assert.ok(rep.context.practitionerChoice?.includes('조후'), '리포트에 역술인 선택 표기');
  assert.ok(esm.renderReportMarkdown(rep).includes('역술인 선택'));

  // 용신 오행 직접 지정 — 학파 채택보다 우선한다
  const direct = esm.applyPractitionerOverride(r, { yongsinOhaeng: '수', yongsinSchool: 'johu' });
  assert.equal(direct.yongsin.ohaeng, '수');
  assert.ok(direct.yongsin.reasoning.includes('직접 지정') || direct.yongsin.yongsin.includes('역술인 선택'));

  // 격국 직접 지정 — 후보 밖 이름이면 '직접 지정'으로 표기되고 격국학파 용신이 재계산된다
  const reGeok = esm.applyPractitionerOverride(r, { gyeokgukName: '식신격' });
  assert.equal(reGeok.gyeokguk.name, '식신격');
  assert.ok(reGeok.gyeokguk.basis?.some(b => b.includes('역술인')), '역술인 지정 근거');
  // 식신격 → 격국학파 용신은 재성(일간 己토가 극하는 수)
  assert.equal(reGeok.yongsin.ohaeng, '수', `격국 변경 시 용신 재계산 — 실제 ${reGeok.yongsin.ohaeng}`);
  assert.equal(reGeok.yongsinBySchool.gyeokguk.ohaeng, '수');
  // 원본은 변하지 않는다
  assert.equal(r.gyeokguk.name, '비견격');
  assert.equal(r.yongsin.ohaeng, '목');
});

// ---------------------------------------------------------------------------
// 2026 정확성 재검증 회귀 테스트 (외부 기준: 자평 오자둔, 紫微斗數全書·iztro 2.6.5)
// ---------------------------------------------------------------------------

test('qimen 23시는 다음 날 자시로 포국한다 (같은 날 0시와 같지 않다)', () => {
  // 2024-03-10 癸酉일: 0시 = 壬子시, 23시 = 다음 자시 甲子시(甲戌일)
  const at0 = esm.calculateQimen('2024-03-10', 0);
  const at23 = esm.calculateQimen('2024-03-10', 23);
  const next0 = esm.calculateQimen('2024-03-11', 0);
  assert.equal(at0.hourGan + at0.hourJi, '壬子');
  assert.equal(at23.hourGan + at23.hourJi, '甲子');
  assert.equal(at23.dayGan + at23.dayJi, '甲戌');
  const { solarDate: _a, ...chart23 } = at23;
  const { solarDate: _b, ...chartNext0 } = next0;
  assert.deepEqual(chart23, chartNext0, '절입 경계가 없으면 23시 포국 = 다음 날 0시 포국');
  // 23시 시주는 사주 엔진(오자둔)과 같아야 한다
  for (const [y, m, d] of [[1990, 5, 15], [2001, 11, 2], [2024, 8, 20], [2033, 1, 9]]) {
    const q = esm.calculateQimen(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`, 23);
    const p = esm.calculatePalja(birth({ year: y, month: m, day: d, hour: 23, minute: 30 }));
    assert.equal(q.hourGan + q.hourJi, p.hourGan + p.hourJi, `${y}-${m}-${d} 23시 시주`);
  }
});

test('ziwei 신주(身主)는 년지 기준 표준표를 따른다', () => {
  // 子午 火星, 丑未 天相, 寅申 天梁, 卯酉 天同, 辰戌 文昌, 巳亥 天機
  const expected = { 자: '화성', 축: '천상', 인: '천량', 묘: '천동', 진: '문창', 사: '천기', 오: '화성', 미: '천상', 신: '천량', 유: '천동', 술: '문창', 해: '천기' };
  for (let year = 1984; year < 1996; year++) {
    const r = esm.calculateZiwei(`${year}-06-15`, 12, 'male');
    const yearZhi = r.chineseDate.slice(1, 2);
    assert.equal(r.bodyStar, expected[yearZhi], `${year}년(${yearZhi}) 신주`);
  }
});

test('ziwei 소한(小限)은 남순여역으로 배치한다', () => {
  // 1990-05-15 庚午년: 寅午戌 → 辰궁에서 1세 시작. 남=순행(巳 2세), 여=역행(卯 2세)
  const ages = (r, b) => r.palaces.find(p => p.earthlyBranch === b).ages.slice(0, 2);
  const male = esm.calculateZiwei('1990-05-15', 14, 'male');
  const female = esm.calculateZiwei('1990-05-15', 14, 'female');
  assert.deepEqual(ages(male, '진'), [1, 13]);
  assert.deepEqual(ages(male, '사'), [2, 14]);
  assert.deepEqual(ages(male, '묘'), [12, 24]);
  assert.deepEqual(ages(female, '진'), [1, 13]);
  assert.deepEqual(ages(female, '묘'), [2, 14]);
  assert.deepEqual(ages(female, '사'), [12, 24]);
});

test('ziwei 庚년 천괴는 丑, 천월은 未 (甲戊庚牛羊)', () => {
  const r = esm.calculateZiwei('1990-05-15', 14, 'male');
  const minor = b => r.palaces.find(p => p.earthlyBranch === b).minorStars.map(s => s.name);
  assert.ok(minor('축').includes('천괴'), '丑궁 천괴');
  assert.ok(minor('미').includes('천월'), '未궁 천월');
  assert.ok(!minor('축').includes('천월') && !minor('미').includes('천괴'));
});

test('대운: 절입 시각과 같은 분에 태어난 순행자는 다음 절까지 센다', () => {
  // 1990 입춘 = 1990-02-04 11:14:00 KST (초 0). 출생 순간부터 戊寅월.
  const ipchun = esm.listSolarTermsForYear(1990).find(t => t.koreanName === '입춘');
  assert.deepEqual([ipchun.month, ipchun.day, ipchun.hour, ipchun.minute, ipchun.second], [2, 4, 11, 14, 0]);
  const gyeongchip = esm.listSolarTermsForYear(1990).find(t => t.koreanName === '경칩');
  const kst = t => Date.UTC(t.year, t.month - 1, t.day, t.hour, t.minute, t.second);
  const expectedMonths = (kst(gyeongchip) - kst(ipchun)) / 86_400_000 * 4;

  const male = birth({ year: 1990, month: 2, day: 4, hour: 11, minute: 14, gender: 'male' }); // 庚 양남 → 순행
  const pm = esm.calculatePalja(male);
  assert.equal(pm.monthGan + pm.monthJi, '戊寅');
  const fwd = esm.calculateDaeun(pm, male, 1)[0];
  assert.equal(fwd.gan + fwd.ji, '己卯');
  assert.ok(Math.abs(fwd.startAgeMonths - expectedMonths) < 1e-6, `순행 개시 월수 ${fwd.startAgeMonths} ≠ ${expectedMonths}`);
  assert.equal(esm.calculateYunStartAge(male), Math.floor(expectedMonths / 12));

  const female = { ...male, gender: 'female' }; // 庚 양녀 → 역행: 방금 지난 입춘까지 0일
  const rev = esm.calculateDaeun(esm.calculatePalja(female), female, 1)[0];
  assert.equal(rev.gan + rev.ji, '丁丑');
  assert.equal(rev.startAgeMonths, 0);
});

test('ziwei 윤달 보정(fixLeap): 윤달 16일 이후는 다음 달로 본다', () => {
  // 2020 윤4월 20일 = 양력 2020-06-11 (한·중 역법 동일). 午시.
  // 기준(iztro 2.6.5 fixLeap=true): 명궁·신궁 子, 좌보 申, 우필 午, 화육국, 자미 酉
  const fixed = esm.calculateZiwei('2020-06-11', 12, 'male');
  const pos = (r, star) => r.palaces.find(p => [...p.majorStars, ...p.minorStars].some(s => s.name === star)).earthlyBranch;
  assert.equal(fixed.soulPalaceBranch, '자');
  assert.equal(fixed.bodyPalaceBranch, '자');
  assert.equal(pos(fixed, '좌보'), '신');
  assert.equal(pos(fixed, '우필'), '오');
  assert.equal(fixed.fiveElementsClass, '화육국');
  assert.equal(pos(fixed, '자미'), '유');
  assert.equal(fixed.lunarDate, '2020-4-20', '표시용 음력 날짜는 실제 날짜를 유지');
  // 음력 입력 경로도 같은 명반
  const byLunar = esm.calculateZiweiByLunar('2020-04-20', 12, 'male', true);
  assert.deepEqual(byLunar.palaces, fixed.palaces);
  // fixLeap=false 이면 윤달을 본래 달로 본다
  const unfixed = esm.calculateZiwei('2020-06-11', 12, 'male', false);
  assert.equal(unfixed.soulPalaceBranch, '해');
  assert.equal(unfixed.fiveElementsClass, '토오국');
  // 윤달 15일 이전은 보정과 무관
  const early = esm.calculateZiwei('2020-06-01', 12, 'male');
  assert.equal(early.soulPalaceBranch, '해');
  assert.equal(pos(early, '자미'), '묘');
});

// ---------------------------------------------------------------------------
// 2026 풀이 엔진 재검증 회귀 테스트 — 원진 표·대운 나이·원진 문장 위치·조사
// ---------------------------------------------------------------------------

test('원진(怨嗔)은 표준 6쌍(子未 丑午 寅酉 卯申 辰亥 巳戌)이며 육해(六害)와 구분된다', () => {
  const standard = [['子', '未'], ['丑', '午'], ['寅', '酉'], ['卯', '申'], ['辰', '亥'], ['巳', '戌']];
  const expected = Object.fromEntries(standard.flatMap(([a, b]) => [[a, b], [b, a]]));
  assert.deepEqual({ ...esm.WONJIN_TABLE }, expected);
  assert.equal(esm.WONJIN_TABLE_KR['인'], '유');
  assert.equal(esm.WONJIN_TABLE_KR['사'], '술');

  // 申丑亥午: 申亥는 육해(원진 아님), 丑午만 원진
  const r1 = esm.buildSajuResult(birth({ year: 1993, month: 1, day: 18, hour: 11 }));
  assert.equal(`${r1.palja.yearJi}${r1.palja.monthJi}${r1.palja.dayJi}${r1.palja.hourJi}`, '申丑亥午');
  assert.deepEqual(r1.wonjin.pairs.map((p) => `${p.position1}${p.branch1}-${p.position2}${p.branch2}`), ['월지丑-시지午']);

  // 戌亥戌巳: 巳戌 원진 2쌍
  const r2 = esm.buildSajuResult(birth({ year: 1946, month: 12, day: 2, hour: 9 }));
  assert.equal(`${r2.palja.yearJi}${r2.palja.monthJi}${r2.palja.dayJi}${r2.palja.hourJi}`, '戌亥戌巳');
  assert.deepEqual(r2.wonjin.pairs.map((p) => `${p.position1}-${p.position2}`), ['년지-시지', '일지-시지']);

  // 해석 계층의 원진 패턴은 facts와 일치
  for (const r of [r1, r2]) {
    const keys = esm.runDetectors(r).map((p) => p.key);
    assert.equal(keys.includes('saju/relation/wonjin'), true);
  }
});

test('원진 문장은 위치 라벨로 자리를 밝힌다 (글자 중복 없음)', () => {
  const r = esm.buildSajuResult(birth({ year: 1993, month: 1, day: 18, hour: 11 }));
  const p = esm.runDetectors(r).find((x) => x.key === 'saju/relation/wonjin');
  assert.ok(p, '원진 패턴');
  const text = esm.renderPattern(p);
  assert.match(text, /^월지\(丑\)가 시지\(午\)와 원진을 이루어/);
  assert.doesNotMatch(text, /([子丑寅卯辰巳午未申酉戌亥])\(\1\)/);
});

test('현재 대운 문장에 대운 시작 나이가 들어간다', () => {
  const now = new Date('2026-06-15T03:00:00Z');
  const r = esm.buildSajuResult(birth({ year: 1990, month: 10, day: 21, hour: 8, minute: 47 }), { now });
  const current = r.daeun.find((d) => d.isCurrent);
  assert.ok(current);
  const p = esm.runDetectors(r).find((x) => x.key.startsWith('saju/timing/daeun-'));
  assert.ok(esm.renderPattern(p).includes(`현재 대운 ${current.age}세 무렵의 ${current.gan}${current.ji}`));
  const md = esm.renderReportMarkdown(esm.assembleReport(r, { gender: 'male', now }));
  assert.ok(!/대운 세 무렵/.test(md), '나이 빈칸 없음');
});

// 조사 검사기 — 오행·간지(한자)·괄호 설명 뒤의 조사가 받침과 맞는지 본다.
const READ = { 甲: '갑', 乙: '을', 丙: '병', 丁: '정', 戊: '무', 己: '기', 庚: '경', 辛: '신', 壬: '임', 癸: '계', 子: '자', 丑: '축', 寅: '인', 卯: '묘', 辰: '진', 巳: '사', 午: '오', 未: '미', 申: '신', 酉: '유', 戌: '술', 亥: '해', 木: '목', 火: '화', 土: '토', 金: '금', 水: '수' };
const JOSA_RE = /(?:(?<![가-힣])([목화토금수])|([甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥木火土金水])|([가-힣甲-龥])\([^()\n]{1,20}\))(은|는|이|가|을|를|과|와|으로|로)(?=[\s,.·:;!?)"'」』—-]|$)/g;
function josaErrors(text) {
  const out = [];
  for (const m of text.matchAll(JOSA_RE)) {
    const ch = READ[m[1] ?? m[2] ?? m[3]] ?? (m[1] ?? m[2] ?? m[3]);
    const code = ch.charCodeAt(0);
    if (code < 0xac00 || code > 0xd7a3) continue;
    const jong = (code - 0xac00) % 28;
    const has = jong !== 0;
    const p = m[4];
    const bad = ['는', '를', '와', '가'].includes(p) ? has
      : ['은', '을', '과', '이'].includes(p) ? !has
      : p === '으로' ? !has || jong === 8
      : has && jong !== 8;
    if (bad) out.push(m[0]);
  }
  return out;
}

test('사주 풀이 리포트(Markdown·HTML)의 동적 조사가 받침과 맞는다', () => {
  const nows = ['2026-01-15', '2026-04-15', '2026-06-15', '2026-09-15', '2027-02-20'].map((d) => new Date(`${d}T03:00:00Z`));
  const errors = [];
  let i = 0;
  for (let year = 1932; year <= 2012; year += 4) {
    for (const [month, day, hour] of [[1, 9, 3], [4, 21, 13], [7, 3, null], [10, 27, 20]]) {
      const now = nows[i++ % nows.length];
      const gender = i % 2 ? 'male' : 'female';
      const r = esm.buildSajuResult(birth({ year, month, day, hour, minute: hour === null ? null : 15, gender }), { now });
      const report = esm.assembleReport(r, { gender, now });
      const md = esm.renderReportMarkdown(report);
      const html = esm.renderReportHtml(report).replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ');
      for (const e of [...josaErrors(md), ...josaErrors(html)]) errors.push(`${year}-${month}-${day}: ${e}`);
    }
  }
  assert.deepEqual([...new Set(errors)].slice(0, 20), []);
});

// ---------------------------------------------------------------------------
// 시각 기반 모듈의 법정시(서머타임) 정규화 — 사주 엔진과 같은 기준
// ---------------------------------------------------------------------------

test('기문·육임·자미는 서머타임을 뺀 표준시로 시주를 잡는다 (1987 DST)', () => {
  const date = '1987-07-15';
  for (let h = 0; h < 24; h++) {
    const p = esm.calculatePalja(birth({ year: 1987, month: 7, day: 15, hour: h, minute: 0 }));
    const q = esm.calculateQimen(date, h);
    assert.equal(`${q.hourGan}${q.hourJi}`, `${p.hourGan}${p.hourJi}`, `qimen ${h}시`);
    const d = esm.calculateDaeyukim(date, h);
    assert.equal(d.hourJi, p.hourJi, `daeyukim ${h}시`);
    assert.equal(`${d.dayGan}${d.dayJi}`, `${p.dayGan}${p.dayJi}`, `daeyukim 일주 ${h}시`);
  }
  // 서머타임 23시 = 표준시 22시(亥) → 기문은 같은 날 일주
  const q23 = esm.calculateQimen(date, 23);
  const p23 = esm.calculatePalja(birth({ year: 1987, month: 7, day: 15, hour: 23, minute: 0 }));
  assert.equal(`${q23.dayGan}${q23.dayJi}`, `${p23.dayGan}${p23.dayJi}`);
  // 자미: 서머타임 23시와 22시는 같은 亥시 명반, 0시는 전날 23시(子)
  assert.deepEqual(esm.calculateZiwei(date, 23, 'male'), esm.calculateZiwei(date, 22, 'male'));
  assert.equal(esm.calculateZiwei(date, 23, 'male').time, '해시');
  assert.equal(esm.calculateZiwei(date, 0, 'male').lunarDate, '1987-6-19');
});

test('기문·육임의 절기 경계도 표준 순간(UTC+9) 기준으로 비교한다 (1987 DST)', () => {
  // 망종 1987-06-06 14:18 KST — 서머타임 시계 15:00은 KST 14:00이라 아직 소만
  assert.equal(esm.calculateQimen('1987-06-06', 15).solarTerm, '소만');
  assert.equal(esm.calculateQimen('1987-06-06', 16).solarTerm, '망종');
  // 하지 1987-06-22 07:10 KST — 월장은 하지 전후로 바뀐다
  const before = esm.calculateDaeyukim('1987-06-22', 5).wolJang;
  const after = esm.calculateDaeyukim('1987-06-22', 12).wolJang;
  assert.notEqual(before, after);
  assert.equal(esm.calculateDaeyukim('1987-06-22', 8).wolJang, before);
  assert.equal(esm.calculateDaeyukim('1987-06-22', 9).wolJang, after);
});

test('법정시 정의 이전(1908 이전) 날짜도 기문·육임·자미 계산은 그대로 동작한다', () => {
  assert.doesNotThrow(() => esm.calculateQimen('1900-01-01', 12));
  assert.doesNotThrow(() => esm.calculateDaeyukim('1900-01-01', 12));
  assert.doesNotThrow(() => esm.calculateZiwei('1900-01-01', 12, 'male'));
});

// ---------------------------------------------------------------------------
// 다른 풀이 모듈의 조사 — 기문·육임·토정·궁합·작명
// ---------------------------------------------------------------------------

const DIGIT_READ = ['영', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
const VOCAB = ['천봉', '천임', '천충', '천보', '천영', '천예', '천주', '천심', '천금', '민준', '서연', '지우', '하늘'];
const VOCAB_RE = new RegExp(`(?<![가-힣])(${VOCAB.join('|')}|[0-9])(은|는|이|가|을|를|과|와|으로|로)(?=[\\s,.·:;!?)"'」』—-]|$)`, 'g');
function josaErrorsExtended(text) {
  const out = josaErrors(text);
  for (const m of text.matchAll(VOCAB_RE)) {
    const word = m[1];
    const last = /[0-9]/.test(word) ? DIGIT_READ[Number(word)] : word[word.length - 1];
    const jong = (last.charCodeAt(0) - 0xac00) % 28;
    const has = jong !== 0;
    const p = m[2];
    const bad = ['는', '를', '와', '가'].includes(p) ? has
      : ['은', '을', '과', '이'].includes(p) ? !has
      : p === '으로' ? !has || jong === 8
      : has && jong !== 8;
    if (bad) out.push(m[0]);
  }
  return out;
}

test('기문·육임·토정·궁합·작명 풀이의 동적 조사가 받침과 맞는다', () => {
  const errors = [];
  const push = (tag, text) => { for (const e of josaErrorsExtended(text)) errors.push(`${tag}: ${e}`); };
  for (let k = 0; k < 60; k++) {
    const date = new Date(Date.UTC(2024, 0, 1 + k * 6)).toISOString().slice(0, 10);
    const hour = (k * 5) % 24;
    push(`qimen ${date} ${hour}`, JSON.stringify(esm.interpretQimenResult(esm.calculateQimen(date, hour))));
    push(`daeyukim ${date} ${hour}`, JSON.stringify(esm.interpretDaeyukimResult(esm.calculateDaeyukim(date, hour))));
  }
  for (let y = 1960; y <= 2000; y += 3) {
    const t = esm.analyzeTojeong(y, (y % 12) + 1, (y % 27) + 1, 2026);
    push(`tojeong ${y}`, esm.renderTojeongMarkdown(t, esm.interpretTojeong(t)));
  }
  const people = [
    ['민준', { year: 1990, month: 5, day: 15, hour: 14, minute: 30, gender: 'male' }],
    ['서연', { year: 1992, month: 8, day: 3, hour: 9, minute: 0, gender: 'female' }],
    ['지우', { year: 1988, month: 2, day: 20, hour: 6, minute: 0, gender: 'female' }],
    ['하늘', { year: 1991, month: 11, day: 9, hour: 21, minute: 0, gender: 'male' }],
  ];
  for (const [nameA, pa] of people) for (const [nameB, pb] of people) {
    if (nameA === nameB) continue;
    const compat = esm.calculateCompatibility({ person1: { isLunar: false, ...pa }, person2: { isLunar: false, ...pb } });
    const a = esm.buildSajuResult(birth(pa));
    const b = esm.buildSajuResult(birth(pb));
    const narrative = esm.interpretCompatibility(a, b, compat, { nameA, nameB });
    push(`compat ${nameA}-${nameB}`, esm.renderCompatibilityMarkdown(compat, narrative, { nameA, nameB }));
  }
  for (const [given, pb] of [['민수', people[0][1]], ['서아', people[1][1]], ['하준', people[2][1]], ['지호', people[3][1]]]) {
    const text = JSON.stringify(esm.interpretNameWithSaju(esm.analyzeName('김', given), '김', esm.buildSajuResult(birth(pb))));
    push(`naming ${given}`, text);
    assert.doesNotMatch(text, /이\(가\)|은\(는\)|을\(를\)|와\(과\)/, `naming ${given}: 병기 조사 대신 받침에 맞는 조사`);
  }
  assert.deepEqual([...new Set(errors)].slice(0, 20), []);
});

test('대운이 용신을 간접적으로 도울 때는 "용신을 데려온다"고 쓰지 않는다', () => {
  const now = new Date('2026-06-15T03:00:00Z');
  let direct = 0;
  let indirect = 0;
  for (let year = 1940; year <= 2005 && (direct < 3 || indirect < 3); year++) {
    for (const month of [1, 4, 7, 10]) {
      const r = esm.buildSajuResult(birth({ year, month, day: 11, hour: 10 }), { now });
      const p = esm.runDetectors(r).find((x) => x.key === 'saju/timing/daeun-fit');
      if (!p) continue;
      const y = r.yongsin.ohaeng;
      const touches = p.figures.ganOhaeng === y || p.figures.jiOhaeng === y;
      const text = esm.renderPattern(p);
      if (touches) {
        direct++;
        assert.match(text, /데려와/, text);
      } else {
        indirect++;
        assert.doesNotMatch(text, /데려와/, text);
      }
    }
  }
  assert.ok(direct >= 1 && indirect >= 1, `표본 부족 direct=${direct} indirect=${indirect}`);
});

test('삼합·방합·삼형에 같은 지지가 두 자리면 두 자리 모두 관계 위치로 기록한다', () => {
  const palja = (yearJi, monthJi, dayJi, hourJi) => ({ yearGan: '甲', monthGan: '丙', dayGan: '戊', hourGan: '庚', yearJi, monthJi, dayJi, hourJi });
  const triple = (rels, type) => rels.find((r) => r.type === type && r.positions.length >= 3);

  // 戌未丑未 — 丑戌未 삼형, 未가 월지·시지 두 자리
  const hy = triple(esm.analyzeJijiRelations(palja('戌', '未', '丑', '未')), '형');
  assert.deepEqual([...hy.positions].sort(), ['dayJi', 'hourJi', 'monthJi', 'yearJi']);
  assert.equal(hy.jijis.length, 4);

  // 申子辰子 — 申子辰 삼합, 子가 월지·시지
  const sh = triple(esm.analyzeJijiRelations(palja('申', '子', '辰', '子')), '삼합');
  assert.deepEqual(sh.positions, ['yearJi', 'monthJi', 'hourJi', 'dayJi']);
  assert.deepEqual(sh.jijis, ['申', '子', '子', '辰']);

  // 중복이 없으면 기존 3자리 표기를 유지한다
  const plain = triple(esm.analyzeJijiRelations(palja('寅', '午', '戌', '子')), '삼합');
  assert.deepEqual(plain.positions, ['yearJi', 'monthJi', 'dayJi']);
});

// ---------------------------------------------------------------------------
// 사주풀이 엔진 판정 논리 재검증 (2026) — 도화·맥락 문장·결핍 기준·특수격·강약 등급·편중·흐름·신살·록겁격·문구
// ---------------------------------------------------------------------------

const sample = (count, fn, opts = {}) => {
  // 결정적 표본: 1932~2011년, 월·일·시를 고르게 돌린다
  let k = 0;
  for (let i = 0; i < count; i++) {
    const year = 1932 + (i * 7) % 80;
    const month = 1 + (i * 5) % 12;
    const day = 1 + (i * 11) % 28;
    const hour = (i * 13) % 24;
    let r;
    try {
      r = esm.buildSajuResult(birth({ year, month, day, hour, minute: 30, gender: i % 2 ? 'female' : 'male' }), { now: new Date('2026-06-15T03:00:00Z'), ...opts });
    } catch { continue; }
    if (fn(r, { year, month, day, hour, gender: i % 2 ? 'female' : 'male' }) === false) break;
    k++;
  }
  return k;
};
const GEN = { 목: '화', 화: '토', 토: '금', 금: '수', 수: '목' };
const CTRL = { 목: '토', 토: '수', 수: '화', 화: '금', 금: '목' };
const OH = { 甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토', 己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수' };
const roleOf = (day, o) => (o === day ? '비겁' : GEN[day] === o ? '식상' : CTRL[day] === o ? '재성' : CTRL[o] === day ? '관성' : '인성');

test('연살(도화)이 있으면 연애 축에 매력 지표 문장이 나온다', () => {
  let found = 0;
  sample(400, (r, b) => {
    if (!r.sinsal.some((s) => s.name === '연살')) return;
    const love = JSON.stringify(esm.assembleReport(r, { gender: b.gender, now: new Date('2026-06-15T03:00:00Z') }).sections.love);
    assert.match(love, /도화\(연살·年殺\)[이가] .+에 있어 인기·매력의 지표가 됩니다/, `${b.year}-${b.month}-${b.day}`);
    found++;
  });
  assert.ok(found >= 10, `연살 표본 ${found}`);
});

test('"이 명식에서" 맥락 문장은 패턴마다 다르고 같은 문장을 반복하지 않는다', () => {
  sample(60, (r, b) => {
    const md = esm.renderReportMarkdown(esm.assembleReport(r, { gender: b.gender, now: new Date('2026-06-15T03:00:00Z') }));
    const lines = md.split('\n').filter((l) => l.startsWith('- 이 명식에서:'));
    assert.equal(new Set(lines).size, lines.length, `${b.year}-${b.month}-${b.day} 맥락 문장 중복`);
    assert.doesNotMatch(md, /다른 축이라, 이 패턴은 본업과 활용점 사이의 다리 역할/);
  });
});

test('격국·용신 축 교차 패턴은 격국용신 규칙의 정의상 결과일 때는 내지 않는다', () => {
  sample(200, (r) => {
    const keys = esm.runDetectors(r).map((p) => p.key);
    assert.ok(!keys.some((k) => k.startsWith('saju/cross/gyeokguk-yongsin-')), '기본(격국) 학파에서는 동어반복');
  });
  let seen = 0;
  sample(200, (r) => {
    const keys = esm.runDetectors(r).map((p) => p.key);
    if (keys.some((k) => k.startsWith('saju/cross/gyeokguk-yongsin-'))) seen++;
  }, { subSchool: 'johu' });
  assert.ok(seen > 0, '다른 학파 용신이면 격국과의 축 관계를 알린다');
});

test('오행 결핍 조합은 결오행(0%)일 때만 나온다', () => {
  sample(400, (r) => {
    const keys = new Set(esm.runDetectors(r).map((p) => p.key));
    const comboMissing = [...keys].filter((k) => k.startsWith('saju/combo/ohaeng-missing--'));
    if (comboMissing.length > 0) assert.ok(keys.has('saju/imbalance/ohaeng-missing'), comboMissing.join(','));
  });
});

test('참고 수준(불성립 요소 다수·생조)의 특수격은 대표 격국이 아니라 후보로만 둔다', () => {
  // 壬 일간 종재격 — 미세 통근이 있어 참고 수준
  const jong = esm.buildSajuResult(birth({ year: 1986, month: 6, day: 7, hour: 10, minute: 0 }));
  assert.notEqual(jong.gyeokguk.name, '종재격');
  assert.ok(jong.gyeokguk.candidates?.some((c) => c.name === '종재격' && c.confidence === '참고'));
  // 戊癸 간합이 寅월(목, 화를 생조) — 당령이 아니라 생조라 대표 화격이 될 수 없다
  const hwa = esm.buildSajuResult(birth({ year: 1985, month: 3, day: 5, hour: 20, minute: 0 }));
  assert.notEqual(hwa.gyeokguk.name, '무계합화화격');
  // 대표 격국의 특수격은 확정·유력만
  sample(600, (r) => {
    if (/종|합화/.test(r.gyeokguk.name)) assert.notEqual(r.gyeokguk.confidence, '참고', r.gyeokguk.name);
  });
});

test('점수제 강약 등급은 지지·견제의 순세력 순서를 따르고 극단 등급은 드물다', () => {
  const ORDER = ['태약', '신약', '중화신약', '중화신강', '신강', '태강'];
  const byLabel = Object.fromEntries(ORDER.map((l) => [l, []]));
  let n = 0;
  sample(1500, (r) => {
    const a = r.strengthAssessment;
    byLabel[a.label].push(a.score - a.hostilePressure);
    if (a.label === '태강') assert.ok(a.deukryeong && a.deukji, '태강은 득령·득지가 함께 있어야 한다');
    n++;
  });
  const mean = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length;
  const means = ORDER.filter((l) => byLabel[l].length > 0).map((l) => mean(byLabel[l]));
  for (let i = 1; i < means.length; i++) assert.ok(means[i] > means[i - 1], `등급 순서 ${JSON.stringify(ORDER.map((l) => [l, byLabel[l].length]))}`);
  assert.ok(byLabel['태강'].length / n <= 0.1, `태강 ${byLabel['태강'].length}/${n}`);
  assert.ok(byLabel['태약'].length / n <= 0.1, `태약 ${byLabel['태약'].length}/${n}`);
  assert.ok(byLabel['신강'].length >= byLabel['태강'].length, '신강이 태강보다 흔하다');
});

test('오행 편중 패턴은 한 오행이 평균의 두 배(40%) 이상일 때만 나온다', () => {
  let n = 0;
  let fired = 0;
  sample(600, (r) => {
    n++;
    const p = esm.runDetectors(r).find((x) => x.key === 'saju/imbalance/ohaeng-skew');
    if (!p) return;
    fired++;
    assert.ok(p.figures.topPercent >= 40, `top ${p.figures.topPercent}`);
  });
  assert.ok(fired / n <= 0.5, `편중 발화 ${fired}/${n}`);
});

test('상생 흐름의 두 자리가 떨어져 있으면 "생한다"고 단정하지 않는다', () => {
  const pi = (s) => (s.startsWith('year') ? 0 : s.startsWith('month') ? 1 : s.startsWith('day') ? 2 : 3);
  let far = 0;
  sample(400, (r) => {
    for (const p of esm.runDetectors(r).filter((x) => x.key.startsWith('saju/flow/') && x.slots?.length === 2)) {
      const text = esm.renderPattern(p);
      if (Math.abs(pi(p.slots[0].slot) - pi(p.slots[1].slot)) > 1) {
        far++;
        assert.match(text, /떨어져 있어/, text);
        assert.doesNotMatch(text, /생하여|떠받쳐|제어하여|이어져\(/, text);
      }
    }
  });
  assert.ok(far > 0);
});

test('12신살 교차 패턴은 기준 자리(일지) 자신에서 만들지 않는다', () => {
  sample(400, (r) => {
    for (const p of esm.runDetectors(r).filter((x) => x.key.startsWith('saju/cross/sinsal-'))) {
      assert.notEqual(p.slots?.[0]?.slot, 'dayJi', p.key);
    }
  });
});

test('록겁격(건록·양인·비견·겁재격)의 격국용신은 관성, 기신은 식상 (자평진전 祿劫·陽刃 用官煞)', () => {
  let n = 0;
  sample(600, (r) => {
    if (!/^(건록|양인|비견|겁재)격$/.test(r.gyeokguk.name)) return;
    const day = OH[r.palja.dayGan];
    const y = r.yongsinBySchool.gyeokguk;
    assert.equal(roleOf(day, y.ohaeng), '관성', `${r.gyeokguk.name} ${y.yongsin}`);
    assert.equal(roleOf(day, y.gisin[0]), '식상', `${r.gyeokguk.name} ${y.gisin}`);
    n++;
  });
  assert.ok(n > 20, `록겁격 표본 ${n}`);
});

test('패턴 제목·문구 DB 정리 — 한자 표기 통일, 키 그대로인 제목 없음, 기신운 조합은 주의', () => {
  const content = JSON.parse(readFileSync(new URL('../../src/engine/interpretation/content-db.generated.json', import.meta.url)));
  for (const [key, meta] of Object.entries(esm.PATTERN_REGISTRY)) {
    if (/신강/.test(meta.title.split('(')[0])) assert.match(meta.title, /身强/, meta.title);
    if (/원진/.test(meta.title)) assert.match(meta.title, /怨嗔/, meta.title);
    if (/--(daeun|seun)-tension$/.test(key)) assert.equal(meta.polarity, 'caution', key);
  }
  for (const entry of Object.values(content)) {
    assert.match(entry.title, /[가-힣]/, `제목이 키 그대로: ${entry.id}`);
    if (/원진/.test(entry.title)) assert.match(entry.title, /怨嗔/, entry.title);
    // 등록부 제목과 콘텐츠 제목은 한 글자도 다르지 않아야 한다(한자 약어·풀어쓰기 혼용 금지)
    const reg = esm.PATTERN_REGISTRY[entry.id];
    if (reg) assert.equal(reg.title, entry.title, `등록부·콘텐츠 제목 불일치: ${entry.id}`);
  }
});
