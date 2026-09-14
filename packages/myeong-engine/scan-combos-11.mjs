// 11차 신규 combo 키 8종을 발화시키는 sampleBirth 탐색 — dist 빌드 후 실행.
// 사용: node scan-combos-11.mjs
import { buildSajuResult, runDetectors } from './dist/index.js';

const TARGETS = [
  'saju/combo/gongmang-jaesung--daeun-tension',
  'saju/combo/gongmang-gwansung--daeun-tension',
  'saju/combo/jiji-hap--daeun-fit',
  'saju/combo/jiji-hap--daeun-tension',
  'saju/combo/jiji-hyeong--daeun-tension',
  'saju/combo/jiji-hae--daeun-tension',
  'saju/combo/daymaster-weak--johu-support',
  'saju/combo/daymaster-strong--johu-pressure',
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
        for (const gender of ['male', 'female']) {
          let r;
          try {
            r = buildSajuResult(
              { isLunar: false, year, month, day, hour, minute: 30, gender, birthPlace: null },
              { now: NOW },
            );
          } catch {
            continue;
          }
          scanned += 1;
          const keys = new Set(runDetectors(r).map((p) => p.key));
          for (const t of TARGETS) {
            if (keys.has(t) && !found.has(t)) {
              found.set(t, {
                year, month, day, hour, minute: 30, gender,
                palja: `${r.palja.yearGan}${r.palja.monthGan}${r.palja.dayGan}${r.palja.hourGan}`,
                paljaJi: `${r.palja.yearJi}${r.palja.monthJi}${r.palja.dayJi}${r.palja.hourJi}`,
                gyeokguk: r.gyeokguk.name,
                yongsin: r.yongsin.ohaeng,
              });
              console.log(`✓ ${t}\n    ${year}-${month}-${day} ${hour}:30 ${gender}  palja=${found.get(t).palja}(${found.get(t).paljaJi}) gyeokguk=${r.gyeokguk.name} yongsin=${r.yongsin.ohaeng}`);
              if (found.size === TARGETS.length) break outer;
            }
          }
        }
      }
    }
  }
}

console.log(`\nscanned ${scanned}개 명식, 발견 ${found.size}/${TARGETS.length}`);
for (const t of TARGETS) {
  if (!found.has(t)) console.log(`✗ 미발견: ${t}`);
}
