// 사용 예시 — 저장소 루트에서 `npm run build` 후 `node examples/usage.mjs`
import {
  buildSajuResult, assembleReport, renderReportMarkdown, renderReportHtml,
  interpretSaju, measureOhaeng, buildTimingNarrative, applyPractitionerOverride,
  solarToLunar, listSolarTermsForYear, getMonthlyCalendar, executeEngineModuleById,
} from '../packages/myeong-engine/dist/index.js';

const birth = {
  isLunar: false, year: 1985, month: 1, day: 10,
  hour: 16, minute: 45, gender: 'male', birthPlace: null,
};
const now = new Date('2026-09-13T12:00:00+09:00');

// 1) 만세력 엔진 — 명식 계산
const saju = buildSajuResult(birth, { now });
const p = saju.palja;
console.log(`${p.yearGan}${p.yearJi} ${p.monthGan}${p.monthJi} ${p.dayGan}${p.dayJi} ${p.hourGan}${p.hourJi}`);
console.log(saju.gyeokguk.name, saju.yongsin.ohaeng, saju.strengthAssessment.label);
const current = saju.daeun.find((d) => d.isCurrent);
console.log('현재 대운', `${current.gan}${current.ji}`, `${current.age}세~`);

// 2) 사주풀이 엔진 — 패턴·리포트
const interp = interpretSaju(saju);
console.log(interp.summary.headline);
console.log(interp.patterns.length, interp.patterns[0].key);
const meter = measureOhaeng(saju);
console.log(meter.dayMaster.score, meter.dayMaster.verdict);
const report = assembleReport(saju, { gender: 'male', now });
console.log(Object.keys(report.sections));
const md = renderReportMarkdown(report);
const html = renderReportHtml(report, { counselor: { name: '명 상담실' } });
console.log(md.split('\n')[0], html.length > 1000);
console.log(buildTimingNarrative(saju, now).daeun.ganJi);

// 3) 역술인 판정 반영
const johu = applyPractitionerOverride(saju, { yongsinSchool: 'johu', note: '조후 우선' });
console.log(johu.yongsin.ohaeng);

// 4) 역법 유틸
console.log(JSON.stringify(solarToLunar({ year: 2024, month: 2, day: 10 })));
const ipchun = listSolarTermsForYear(2024).find((t) => t.koreanName === '입춘');
console.log(ipchun.month, ipchun.day, ipchun.hour, ipchun.minute);
console.log(getMonthlyCalendar(2026, 9).days[0]);


// 5) 계약 봉투
const env = await executeEngineModuleById('saju', { birth, now: now.toISOString() });
console.log(env.engineVersion, env.contractVersion, env.inputHash.slice(0, 12), env.warnings);
