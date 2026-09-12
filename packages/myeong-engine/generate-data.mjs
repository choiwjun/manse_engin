// Offline, reproducible data generation. Runtime bundles need neither dependency.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import KoreanLunarCalendar from 'korean-lunar-calendar';
import { SearchMoonPhase, SearchSunLongitude } from 'astronomy-engine';

const packageDir = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(packageDir, '../../src/engine/core/data');
const DAY_MS = 86_400_000;
const KST_MS = 9 * 3_600_000;
const dayNumber = date => Math.floor((date.getTime() + KST_MS) / DAY_MS);
const dateKey = day => new Date(day * DAY_MS).toISOString().slice(0, 10);
const terms = JSON.parse(readFileSync(path.join(dataDir, 'solar-terms.generated.json'), 'utf8'));

// The legacy term file stores UTC+08:00 calendar labels, normalized to KST at
// runtime. Preserve the established 1899–2101 values; add the missing buffer year.
terms['2102'] = terms['2024'].map((template, i) => {
  const month = Math.floor(i / 2) + 1;
  const time = SearchSunLongitude((285 + i * 15) % 360, new Date(Date.UTC(2102, month - 1, 1)), 30);
  assert.ok(time, `Missing solar term ${i} in 2102`);
  const source = new Date(Math.round(time.date.getTime() / 1000) * 1000 + 8 * 3_600_000);
  return {
    sourceName: template.sourceName, koreanName: template.koreanName,
    year: source.getUTCFullYear(), month: source.getUTCMonth() + 1, day: source.getUTCDate(),
    hour: source.getUTCHours(), minute: source.getUTCMinutes(), second: source.getUTCSeconds(),
    julianDay: source.getTime() / DAY_MS + 2440587.5,
  };
});

const principalTerms = Object.values(terms).flatMap(yearTerms => yearTerms
  .filter((_, i) => i % 2 === 1)
  .map(t => ({
    name: t.koreanName, year: t.year,
    day: Math.floor(Date.UTC(t.year, t.month - 1, t.day, t.hour + 1, t.minute, t.second) / DAY_MS),
  })));

const moons = [];
let cursor = new Date(Date.UTC(1911, 10, 1));
while (cursor < new Date(Date.UTC(2103, 1, 1))) {
  const time = SearchMoonPhase(0, cursor, 40);
  assert.ok(time, `Missing new moon after ${cursor.toISOString()}`);
  moons.push({ day: dayNumber(time.date), utc: time.date.getTime() });
  cursor = time.AddDays(1).date;
}

// Independent future check, including new moons close to Korean midnight.
const nasa = JSON.parse(readFileSync(path.join(packageDir, 'fixtures/nasa-new-moons-2050-2102.json'), 'utf8'));
for (const stamp of nasa.newMoons) {
  const utc = Date.parse(stamp);
  const match = moons.find(m => Math.abs(m.utc - utc) < 120_000);
  assert.ok(match, `New moon does not agree with NASA within 2 minutes: ${stamp}`);
  assert.equal(match.day, dayNumber(new Date(stamp)), `New moon KST day differs from NASA: ${stamp}`);
}

const winters = principalTerms.filter(t => t.name === '동지' && t.year >= 1911);
const lunarMonths = [];
for (let i = 0; i < winters.length - 1; i++) {
  const first = moons.findLastIndex(m => m.day <= winters[i].day);
  const next = moons.findLastIndex(m => m.day <= winters[i + 1].day);
  const count = next - first;
  assert.ok(count === 12 || count === 13, `Invalid month count in solstice cycle ${winters[i].year}`);
  let leapIndex = -1;
  if (count === 13) {
    for (let j = first + 1; j < next; j++) {
      // Months and principal terms belong to CIVIL DATES, not intervals between
      // conjunction instants. A term on the next month's first date is excluded.
      if (!principalTerms.some(t => t.day >= moons[j].day && t.day < moons[j + 1].day)) {
        leapIndex = j;
        break;
      }
    }
    assert.notEqual(leapIndex, -1, '13-month cycle has no intercalation month');
  }
  let year = winters[i].year;
  let month = 11;
  for (let j = first; j < next; j++) {
    const leap = j === leapIndex;
    if (j > first && !leap) {
      month = month % 12 + 1;
      if (month === 1) year++;
    }
    const length = moons[j + 1].day - moons[j].day;
    assert.ok(length === 29 || length === 30, 'Invalid lunar month length');
    lunarMonths.push({ year, month, leap, start: moons[j].day, end: moons[j + 1].day });
  }
}

const reference = new KoreanLunarCalendar();
let checkedMonths = 0;
for (const m of lunarMonths) {
  const start = new Date(m.start * DAY_MS);
  if (start.getUTCFullYear() < 1912 || start.getUTCFullYear() > 2050) continue;
  assert.ok(reference.setSolarDate(start.getUTCFullYear(), start.getUTCMonth() + 1, start.getUTCDate()));
  const actual = reference.getLunarCalendar();
  assert.deepEqual([m.year, m.month, 1, m.leap], [actual.year, actual.month, actual.day, actual.intercalation], dateKey(m.start));
  checkedMonths++;
}

const projected = new Map();
for (const m of lunarMonths) {
  for (let day = m.start; day < m.end; day++) projected.set(day, [m.year, m.month, day - m.start + 1, Number(m.leap)]);
}
const solarToLunar = {};
const lunarToSolar = {};
for (let day = Date.UTC(1899, 0, 1) / DAY_MS; day <= Date.UTC(2101, 11, 31) / DAY_MS; day++) {
  const date = new Date(day * DAY_MS);
  const year = date.getUTCFullYear(), month = date.getUTCMonth() + 1, dom = date.getUTCDate();
  let lunar;
  if (year <= 2050) {
    assert.ok(reference.setSolarDate(year, month, dom), `Reference range miss: ${dateKey(day)}`);
    const r = reference.getLunarCalendar();
    lunar = [r.year, r.month, r.day, Number(r.intercalation)];
  } else {
    lunar = projected.get(day);
    assert.ok(lunar, `Projection range miss: ${dateKey(day)}`);
  }
  const [ly, lm, ld, leap] = lunar;
  const lunarKey = `${ly}-${String(lm).padStart(2, '0')}-${String(ld).padStart(2, '0')}-${leap}`;
  assert.equal(lunarToSolar[lunarKey], undefined, `Duplicate lunar date: ${lunarKey}`);
  solarToLunar[dateKey(day)] = lunar;
  lunarToSolar[lunarKey] = [year, month, dom];
}
// Check the table/projection seam explicitly before replacing either data file.
assert.deepEqual(projected.get(Date.UTC(2050, 11, 31) / DAY_MS), solarToLunar['2050-12-31']);
writeFileSync(path.join(dataDir, 'lunar-solar.generated.json'), JSON.stringify({ solarToLunar, lunarToSolar }));
writeFileSync(path.join(dataDir, 'solar-terms.generated.json'), JSON.stringify(terms, null, 2) + '\n');
console.log(`Generated ${Object.keys(solarToLunar).length} Korean lunar/solar dates and the 2102 term buffer.`);
console.log(`Verified ${checkedMonths} reference month starts and ${nasa.newMoons.length} NASA future new moons.`);
