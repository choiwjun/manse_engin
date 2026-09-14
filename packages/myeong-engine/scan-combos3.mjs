import { buildSajuResult, runDetectors } from './dist/index.js';

const TARGETS = [
  'saju/combo/jaesaeng-gwan--daymaster-weak',
  'saju/combo/sangsaeng-jesal--daymaster-strong',
  'saju/combo/ohaeng-missing--daymaster-weak',
  'saju/combo/jiji-chung--daymaster-weak',
  'saju/combo/bigeop-gwada--daymaster-weak',
  'saju/combo/gwanin-sangsaeng--daymaster-strong',
  'saju/combo/gongmang-gwansung--daymaster-weak',
  'saju/combo/siksang-gwada--daymaster-weak',
];

const found = new Map();
const NOW = new Date('2026-09-13T12:00:00+09:00');
const HOURS = [1, 4, 7, 10, 13, 16, 19, 22];
let scanned = 0;

outer:
for (let year = 1950; year <= 2000; year += 1) {
  for (let month = 1; month <= 12; month += 1) {
    for (let day = 1; day <= 28; day += 1) {
      for (const hour of HOURS) {
        let r;
        try {
          r = buildSajuResult({ isLunar: false, year, month, day, hour, minute: 30, gender: 'male', birthPlace: null }, { now: NOW });
        } catch {
          continue;
        }
        scanned += 1;
        const keys = new Set(runDetectors(r).map((p) => p.key));
        for (const t of TARGETS) {
          if (keys.has(t) && !found.has(t)) {
            const palja = `${r.palja.yearGan}${r.palja.monthGan}${r.palja.dayGan}${r.palja.hourGan}`;
            const paljaJi = `${r.palja.yearJi}${r.palja.monthJi}${r.palja.dayJi}${r.palja.hourJi}`;
            found.set(t, { year, month, day, hour, minute: 30, gender: 'male', palja, paljaJi, gyeokguk: r.gyeokguk.name, yongsin: r.yongsin.ohaeng });
            console.log('✓', t, JSON.stringify(found.get(t)));
            if (found.size === TARGETS.length) break outer;
          }
        }
      }
    }
  }
}

console.log('scanned', scanned, 'found', found.size + '/' + TARGETS.length);
for (const t of TARGETS) if (!found.has(t)) console.log('✗ 미발견:', t);
