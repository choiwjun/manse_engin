// 역학 모듈 사용 예시 — 저장소 루트에서 `npm run build` 후 `node examples/modules.mjs`
import {
  calculatePalja, buildSajuResult,
  calculateCompatibility, interpretCompatibility, renderCompatibilityMarkdown,
  analyzeTojeong, interpretTojeong, renderTojeongMarkdown,
  analyzeNamesExtended, interpretNaming, interpretNamingWithSaju, renderNamingMarkdown,
  getCalendarDay, interpretTaekil, renderTaekilMarkdown,
  calculateZiwei, calculateQimen, interpretQimenResult,
  calculateDaeyukim, interpretDaeyukimResult, calculateGuseong,
  analyzeHongyeon, divineByTime, calculateHarak, calculateDaejeong,
  executeEngineModule,
} from '../packages/myeong-engine/dist/index.js';

const a = { isLunar: false, year: 1990, month: 5, day: 15, hour: 14, minute: 30, gender: 'male', birthPlace: null };
const b = { isLunar: false, year: 1992, month: 8, day: 3, hour: 9, minute: 0, gender: 'female', birthPlace: null };

// 궁합 — 일간·일지·오행 보완·본명성 4항목 100점, S~D 등급
const compat = calculateCompatibility({ person1: a, person2: b });
console.log('궁합', compat.totalScore, compat.grade, compat.categories.map((c) => `${c.name} ${c.score}/${c.maxScore}`).join(', '));
const compatNarrative = interpretCompatibility(buildSajuResult(a), buildSajuResult(b), compat, { nameA: '민준', nameB: '서연' });
console.log(renderCompatibilityMarkdown(compat, compatNarrative, { nameA: '민준', nameB: '서연' }).split('\n')[0]);

// 토정비결 — 상·중·하괘 144괘 (원문 해설은 미검증이라 제공하지 않음)
const tojeong = analyzeTojeong(1990, 1, 15, 2026);
console.log('토정', tojeong.gwae.gwaeCode, tojeong.contentStatus);
console.log(renderTojeongMarkdown(tojeong, interpretTojeong(tojeong)).split('\n')[0]);

// 작명 — 강희 획수·81수리·오격·자원오행, 사주 용신과 교차
const naming = analyzeNamesExtended('김', [{ givenName: '민준', hanjaChars: ['金', '敏', '俊'] }], 'kangxi');
const c0 = naming.candidates[0];
console.log('작명', c0.name, c0.hanjaStrokes, c0.totalScore);
console.log(renderNamingMarkdown(naming, interpretNaming(naming)).split('\n')[0]);
console.log(interpretNamingWithSaju(naming, buildSajuResult(a))[0].headline);

// 만세력 달력·택일 — 일진·십이직·길흉
const day = getCalendarDay(2026, 9, 13);
console.log('택일', day.dayGanJi, day.sinsal12, day.gilhyung, interpretTaekil(day).headline);
console.log(renderTaekilMarkdown(day, interpretTaekil(day)).split('\n')[0]);

// 자미두수 — 명반 12궁
const ziwei = calculateZiwei('1990-5-15', 14, 'male');
console.log('자미두수', ziwei.fiveElementsClass, ziwei.soulStar, ziwei.bodyStar, ziwei.palaces[0].name);

// 기문둔갑 — 시가 포국 + 해석
const qimen = calculateQimen('2026-09-13', 10);
console.log('기문', qimen.dunType, qimen.bureauNumber, qimen.yuan, interpretQimenResult(qimen).summary.slice(0, 40));

// 대육임 — 천지반·사과·삼전·12천장·과명 + 해석
const yukim = calculateDaeyukim('2026-09-13', 10);
console.log('대육임', yukim.wolJang, yukim.gwaMyeong, interpretDaeyukimResult(yukim).summary.slice(0, 40));

// 구성기학 — 본명성, 연·월·일반 구궁도
const guseong = calculateGuseong(1990, 'male', 2026, 9, 13);
console.log('구성', guseong.bonmyeongseong.name, guseong.yearChart.centerStar.name);

// 홍연·대정수 — 팔자 입력
const palja = calculatePalja(a);
const hongyeon = analyzeHongyeon(palja);
console.log('홍연', hongyeon.hongguksu, hongyeon.bonmyeongseong);
const daejeong = calculateDaejeong(palja);
console.log('대정수', daejeong.hexagramName, daejeong.changingLine);

// 매화역수·하락리수
const maehwa = divineByTime(2026, 9, 13, 10);
console.log('매화', maehwa.hexagramName, maehwa.changingLine, maehwa.cheYongRelation);
const harak = calculateHarak(1990, 5, 15);
console.log('하락', harak.hadosu, harak.nakseosu, harak.hexagramName);

// 계약 봉투 — 모든 모듈을 같은 형식으로 실행
const env = await executeEngineModule('ziwei', { calendarType: 'solar', date: '1990-05-15', hour: 14, gender: 'male' });
console.log(env.moduleId, env.engineVersion, env.warnings.map((w) => w.code));
