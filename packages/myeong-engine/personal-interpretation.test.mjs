import test from 'node:test';
import assert from 'node:assert/strict';
import * as engine from './dist/index.js';

test('Tojeong interpretation explains personal calculation without unverified fortune prose', () => {
  const result = engine.analyzeTojeong(1990, 1, 15, 2026);
  const narrative = engine.interpretTojeong({ ...result, interpretation: { yearlyFortune: 'UNVERIFIED-PROSE' } });
  assert.match(narrative.headline, /2026.*531/);
  const text = JSON.stringify(narrative);
  for (const expected of ['37', '16', '30', '15', '상괘', '중괘', '하괘', '미검증']) assert.ok(text.includes(expected), expected);
  assert.ok(!text.includes('UNVERIFIED-PROSE'));
  assert.ok(narrative.basisRefs.includes(result.calculation.policyId));
  assert.match(engine.renderTojeongMarkdown(result, narrative), /531/);
  const html = engine.renderTojeongHtml(result, narrative, { title: '<script>x</script>', counselor: { name: '<img src=x>' } });
  assert.ok(!html.includes('<script>x</script>'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('<img src=x>'));
});

test('Naming interpretation includes corrected grids, explicit stroke school and recommendation rationale', async () => {
  const { result } = await engine.executeEngineModule('naming', { surname: '박', candidates: [{ givenName: '화해', hanjaChars: ['朴', '花', '海'] }] });
  const n = engine.interpretNaming(result)[0];
  const text = JSON.stringify(n);
  for (const expected of ['朴 6획', '花 10획', '海 11획', '원격 21', '형격 16', '천격', '강희', '자원오행', '신고']) assert.ok(text.includes(expected), expected);
  assert.ok(n.basisRefs.includes(result.policy.id));
  const { result: recommended } = await engine.executeEngineModule('naming', { mode: 'recommend', surname: '김', surnameHanja: '金', birth: { year: 1990, month: 5, day: 15, hour: 14, minute: 30, gender: 'male', isLunar: false, birthPlace: null }, limit: 2 });
  for (const r of engine.interpretNaming(recommended)) {
    assert.ok(r.lines.some(l => l.label === '추천 기준' && l.text.includes(recommended.recommendation.targetElement)));
    assert.ok(r.lines.some(l => l.label === '추천 이유'));
  }
  assert.match(engine.renderNamingMarkdown(recommended, engine.interpretNaming(recommended)), /추천 기준/);
});


test('Tojeong explanations preserve leap/month-end adjustments and reject legacy results', () => {
  const leap = engine.analyzeTojeong(2023, 2, 1, 2026, { isLeapMonth: true });
  assert.ok(engine.interpretTojeong(leap).cautions.some(t => t.includes('윤2월') && t.includes('평2월')));
  const short = engine.analyzeTojeong(1990, 2, 30, 2026);
  assert.ok(engine.interpretTojeong(short).cautions.some(t => t.includes('30일 대신 29일')));
  assert.throws(() => engine.interpretTojeong({ ...short, calculation: undefined }), /다시 계산/);
});

test('Naming distinguishes modern/Hangul bases and avoids deterministic source wording in recommendations', async () => {
  const { result } = await engine.executeEngineModule('naming', { surname: '박', school: 'modern', candidates: [{ givenName: '화해', hanjaChars: ['朴', '花', '海'] }] });
  const text = JSON.stringify(engine.interpretNaming(result));
  assert.match(text, /현대 획수\(G 기준\)/);
  assert.match(text, /花 7획/);
  const hangul = engine.analyzeNameExtended('김', '수');
  assert.match(JSON.stringify(engine.interpretName(hangul, '김')), /한글 획수/);
  const withReason = { ...result, recommendation: { targetElement: '화', yongsinSchool: 'johu', considered: 1, reasons: ['본가을 금극왕에 丙火 단련이 반드시 필요하다'] } };
  const r = JSON.stringify(engine.interpretNaming(withReason));
  assert.ok(!r.includes('반드시'));
  assert.match(r, /전통 해석/);
});
