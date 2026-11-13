// 패턴 키(조합키 등)를 발화시키는 sampleBirth 탐색 — dist 빌드 후 실행.
// content YAML의 sampleBirth와 interpretation.test.mjs 케이스를 고를 때 쓴다.
//
// 사용:
//   node scripts/scan-combos.mjs <key> [key ...] [--from 1950] [--to 2010] [--gender male|female|both]
//   node scripts/scan-combos.mjs --all            # 레지스트리의 saju/combo/* 전부
//
// 기준 시각은 interpretation.test.mjs와 같은 2026-09-13T12:00+09:00 (대운·세운 판정 재현용).
import { buildSajuResult, runDetectors, PATTERN_REGISTRY } from '../dist/index.js';

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const optionNames = new Set(['--from', '--to', '--gender']);
const keys = args.filter((a, i) => !a.startsWith('--') && !optionNames.has(args[i - 1]));
const targets = args.includes('--all')
  ? Object.keys(PATTERN_REGISTRY).filter((k) => k.startsWith('saju/combo/'))
  : keys;

if (targets.length === 0) {
  console.error('사용: node scripts/scan-combos.mjs <key> [key ...] [--from 1950] [--to 2010] [--gender both]  |  --all');
  process.exit(1);
}
const unknown = targets.filter((k) => !PATTERN_REGISTRY[k]);
if (unknown.length > 0) {
  console.error(`레지스트리에 없는 키: ${unknown.join(', ')}`);
  process.exit(1);
}

const fromYear = Number(option('--from', 1950));
const toYear = Number(option('--to', 2010));
const genderOpt = option('--gender', 'both');
const genders = genderOpt === 'both' ? ['male', 'female'] : [genderOpt];
const NOW = new Date('2026-09-13T12:00:00+09:00');
const HOURS = [1, 4, 7, 10, 13, 16, 19, 22];

const found = new Map();
let scanned = 0;
outer:
for (let year = fromYear; year <= toYear; year += 1) {
  for (let month = 1; month <= 12; month += 1) {
    for (let day = 1; day <= 28; day += 1) {
      for (const hour of HOURS) {
        for (const gender of genders) {
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
          const detected = new Set(runDetectors(r).map((p) => p.key));
          for (const t of targets) {
            if (detected.has(t) && !found.has(t)) {
              const palja = `${r.palja.yearGan}${r.palja.monthGan}${r.palja.dayGan}${r.palja.hourGan}`;
              const paljaJi = `${r.palja.yearJi}${r.palja.monthJi}${r.palja.dayJi}${r.palja.hourJi}`;
              found.set(t, { year, month, day, hour, minute: 30, gender, palja, paljaJi, gyeokguk: r.gyeokguk.name, yongsin: r.yongsin.ohaeng });
              console.log(`✓ ${t}\n    ${year}-${month}-${day} ${hour}:30 ${gender}  palja=${palja}(${paljaJi}) gyeokguk=${r.gyeokguk.name} yongsin=${r.yongsin.ohaeng}`);
              if (found.size === targets.length) break outer;
            }
          }
        }
      }
    }
  }
}

console.log(`\nscanned ${scanned}개 명식, 발견 ${found.size}/${targets.length}`);
for (const t of targets) {
  if (!found.has(t)) console.log(`✗ 미발견: ${t}`);
}
