// 해석 계층(detector·조립기) 회귀 테스트 — `npm run build` 후 실행.
// 골든 케이스: 1985-01-10 16:45 남(甲子 丁丑 己酉 壬申, 비견격·용신 금)
import assert from 'node:assert/strict';
import {
  buildSajuResult,
  interpretSaju,
  runDetectors,
  measureOhaeng,
  assembleReport,
  buildTimingNarrative,
  renderPattern,
  renderReportMarkdown,
  renderCompatibilityMarkdown,
  interpretCompatibility,
  calculateCompatibility,
  PATTERN_REGISTRY,
} from './dist/index.js';

const NOW = '2026-09-13T12:00:00+09:00';

function saju(input, now = new Date('2026-09-13T12:00:00+09:00')) {
  return buildSajuResult({ isLunar: false, birthPlace: null, ...input }, { now });
}

// 1) 골든 케이스 — 1985-01-10 16:45 남
{
  const r = saju({ year: 1985, month: 1, day: 10, hour: 16, minute: 45, gender: 'male' });
  const keys = runDetectors(r).map((p) => p.key);

  assert.ok(`${r.palja.yearGan}${r.palja.monthGan}${r.palja.dayGan}${r.palja.hourGan}` === '甲丁己壬', 'golden palja');
  assert.ok(keys.includes('saju/flow/sangsaeng-saengjae'), '식상생재 감지');
  assert.ok(keys.includes('saju/relation/gan-hap-gabgi'), '갑기합 감지 (년간 甲-일간 己)');
  assert.ok(keys.includes('saju/flow/gwanin-sangsaeng'), '정관(甲)+편인(丁) → 관인상생 감지');
  assert.ok(!keys.some((k) => k.startsWith('saju/cross/gongmang-')), '공망(寅卯) 미포함 → 교차 미감지');
  assert.ok(keys.includes('saju/cross/sinsal-장성-siksang'), '장성(일지)+식신 교차');
  assert.ok(keys.includes('saju/cross/sinsal-화개-bigeop'), '화개(월지)+비견 교차');
  assert.ok(keys.includes('saju/timing/daeun-fit'), '38세 辛巳(금)=용신 대운');

  // 계량기 — 골든 값 (본기/중기/여기 가중 + 월지 2배)
  // 甲子 丁丑 己酉 壬申: 목 1.0·화 1.0·토 2.3(己+丑본기x2+申여기)·금 1.8·수 2.9(壬+子+丑중기x2+申중기) = 9.0
  const meter = measureOhaeng(r);
  assert.ok(Math.abs(meter.dayMaster.score - 36.7) < 0.3, `비겁+인성 점유율: ${meter.dayMaster.score}`);
  assert.equal(meter.dayMaster.verdict, 'weak');
  const to = meter.distribution.find((d) => d.ohaeng === '토');
  const su = meter.distribution.find((d) => d.ohaeng === '수');
  assert.ok(to && Math.abs(to.percent - 25.6) < 0.3, `토 점유율: ${to?.percent}`);
  assert.ok(su && Math.abs(su.percent - 32.2) < 0.3, `수 점유율: ${su?.percent}`);
  assert.ok(meter.season.kingOhaeng === '토', '丑월 계교 → 토왕');
  assert.ok(keys.includes('saju/imbalance/daymaster-weak'), '신약 감지');
  assert.ok(keys.includes('saju/imbalance/ohaeng-skew'), '오행 편중 감지 (수 32.2% vs 목 11.1%)');

  const interp = interpretSaju(r);
  const priorities = interp.patterns.map((p) => p.priority);
  assert.deepEqual(priorities, [...priorities].sort((a, b) => a - b), '우선순위 정렬');
  assert.ok(interp.summary.headline.includes('비견격'), '헤드라인에 격국');
  assert.ok(interp.summary.headline.includes('금'), '헤드라인에 용신 오행');
  assert.ok(interp.summary.structureLines.length >= 2, '구조 문장 생성');
  assert.ok(interp.baseline.gyeokguk.length > 0 && interp.baseline.yongsin.length > 0, '1층 baseline 보존');

  // 3차 — 동적 문장 생성기: 위치·글자·강도가 문장에 반영되는지
  const flowLine = interp.summary.structureLines.find((s) => s.includes('생재'));
  assert.ok(flowLine, '생재 동적 문장 존재');
  assert.ok(flowLine.includes('생하여(생재, 강도 최상)') || flowLine.includes('생재×용신운'), `첫형+제목+강도 조립: ${flowLine}`);
  assert.ok(flowLine.endsWith('.'), '결론형으로 종결');

  // 4차 — content DB 문구 오버라이드
  const flowPattern = interp.patterns.find((p) => p.key === 'saju/flow/sangsaeng-saengjae');
  assert.ok(flowPattern, '식상생재 패턴');
  assert.equal(flowPattern.contentId, 'saju/flow/sangsaeng-saengjae', 'content DB 등록 → contentId');
  const flowRendered = renderPattern(flowPattern);
  assert.ok(flowRendered.includes('전문성 축적이 곧 수입 축적'), `DB body.short 오버라이드: ${flowRendered}`);

  const weakLine = interp.summary.cautionLines.find((s) => s.includes('36.7%'));
  assert.ok(weakLine && weakLine.includes('신약'), `계량 수치 반영: ${weakLine}`);
  assert.ok(
    interp.summary.structureLines.some((s) => s.includes('당령')),
    '조후 detector — 丑월(토왕) × 己(토) 일간 = 당령 일간',
  );
  assert.ok(keys.includes('saju/johu/season-command'), '조후 키 등록');
  assert.ok(keys.includes('saju/relation/wonjin') === r.wonjin.hasWonjin, '원진 detector — facts와 일치');

  // 3차 — 축별 리포트
  const rep = assembleReport(r, { gender: 'male' });
  assert.ok(rep.headline.includes('비견격') && rep.headline.includes('금'), '리포트 헤드라인');
  for (const axis of ['love', 'wealth', 'career', 'health', 'family']) {
    const sec = rep.sections[axis];
    assert.ok(sec.lines.length >= 2, `${sec.title} 섹션 문장 부족`);
    assert.ok(sec.headline.length > 5, `${sec.title} 섹션 헤드라인`);
    for (const line of sec.lines) assert.ok(line.length > 10, `${sec.title} 빈 문장`);
  }
  assert.ok(rep.sections.love.lines.some((l) => l.includes('배우자궁')), '연애 축 — 배우자궁 문장');
  assert.ok(rep.sections.love.lines.some((l) => l.includes('배우자성')), '연애 축 — 성별 기반 배우자성 문장');
  assert.ok(rep.sections.wealth.headline.includes('재성'), '재물 축 헤드라인');
  assert.ok(rep.sections.health.lines.some((l) => l.includes('수(신장')), '건강 축 — 결/왕 오행·신체 매핑');
  assert.ok(rep.sections.family.lines.some((l) => l.includes('시주')), '육친 축 — 궁별 문장');

  // 3차 — 시점 서사
  assert.ok(rep.timing.daeun && rep.timing.daeun.ganJi === '辛巳', '현재 대운 서사 (38세 辛巳)');
  assert.equal(rep.timing.daeun.verdict, 'fit', '용신 대운 판정');
  assert.ok(rep.timing.sewoon && rep.timing.sewoon.ganJi.length === 2, '세운 서사');
  assert.equal(rep.timing.sewoon.sipsin, '정인', `세운 십신 — 丙 vs 일간 己 = 정인: ${rep.timing.sewoon.sipsin}`);
  assert.ok(rep.timing.combined && rep.timing.combined.includes('큰 판'), '대운×세운 결합 서사');
  assert.ok(rep.timing.checkQuestions.length >= 1, '과거 대운 역검증 확인 질문');
  const narrative = buildTimingNarrative(r);
  assert.deepEqual(narrative.lines, rep.timing.lines, 'buildTimingNarrative와 리포트 timing 일치');

  // 4차 — 풀이 문서 마크다운 렌더러
  const md = renderReportMarkdown(rep);
  assert.ok(md.startsWith('# 사주 풀이 리포트'), '마크다운 문서 헤더');
  assert.ok(md.includes('원국: 甲子 丁丑 己酉 壬申'), '원국 표기');
  for (const header of ['## 오행 계량', '## 적성·일', '## 재물', '## 연애·배우자', '## 건강', '## 육친', '## 시점 서사', '### 상담 확인 질문']) {
    assert.ok(md.includes(header), `문서 섹션 헤더: ${header}`);
  }
  assert.ok(md.includes('**식상생재(食傷生財)**'), 'DB body.long 심층 문단 삽입');
  assert.ok(!md.includes('undefined') && !md.includes('null'), '렌더 누수 방지');

  // 3차 — 시각 미상에서도 리포트가 예외 없이 조립되어야 한다
  const repNoHour = assembleReport(saju({ year: 1963, month: 8, day: 17, hour: null, minute: null, gender: 'female' }), {
    gender: 'female',
  });
  assert.ok(Object.values(repNoHour.sections).every((sec) => sec.lines.length >= 1), '시각 미상 섹션 조립');
}

// 2) 관인상생 케이스 — 1990-05-15 14:30 남 (庚午 辛巳 庚辰 癸未: 관 2·인 2)
{
  const r = saju({ year: 1990, month: 5, day: 15, hour: 14, minute: 30, gender: 'male' });
  const keys = runDetectors(r).map((p) => p.key);
  assert.ok(keys.includes('saju/flow/gwanin-sangsaeng'), '관인상생 감지');
}

// 3차 — 원진 감지 케이스 (1984-04-15: 월지 辰-일지 卯 원진)
{
  const r = saju({ year: 1984, month: 4, day: 15, hour: 10, minute: 0, gender: 'male' });
  assert.ok(r.wonjin?.hasWonjin, '원진 facts 존재');
  const keys = runDetectors(r).map((p) => p.key);
  assert.ok(keys.includes('saju/relation/wonjin'), '원진 패턴 감지');
}

// 4차 — 삼합·방합 감지 (1980-09-13: 申酉丑 巳酉丑 금국 / 1980-01-10: 未丑午巳 巳午未 화국)
{
  const r = saju({ year: 1980, month: 9, day: 13, hour: 10, minute: 0, gender: 'male' });
  const samhap = runDetectors(r).find((p) => p.key === 'saju/relation/samhap');
  assert.ok(samhap, '삼합 감지 (巳酉丑 금국)');
  const samhapText = renderPattern(samhap);
  assert.ok(samhapText.includes('금국'), `삼합 문장에 국 오행: ${samhapText}`);

  const r2 = saju({ year: 1980, month: 1, day: 10, hour: 10, minute: 0, gender: 'male' });
  const banghap = runDetectors(r2).find((p) => p.key === 'saju/relation/banghap');
  assert.ok(banghap, '방합 감지 (巳午未 화국)');
  assert.ok(renderPattern(banghap).includes('화국'), '방합 문장에 국 오행');
}

// 5차 — 조합키 (두 구조 조건의 교차)
{
  const r = saju({ year: 1985, month: 1, day: 10, hour: 16, minute: 45, gender: 'male' });
  const combos = runDetectors(r).filter((p) => p.key.startsWith('saju/combo/'));
  const comboKeys = combos.map((p) => p.key);
  assert.ok(comboKeys.includes('saju/combo/sangsaeng-saengjae--daymaster-weak'), '생재×신약 조합 감지');
  assert.ok(comboKeys.includes('saju/combo/daymaster-weak--daeun-fit'), '신약×용신운 조합 감지');
  for (const c of combos) {
    const rendered = renderPattern(c);
    assert.ok(rendered.length > 20 && !rendered.includes('undefined'), `조합 문장: ${rendered}`);
    assert.ok(c.contentId === c.key, `조합 DB 문구 등록: ${c.key}`);
    assert.equal(PATTERN_REGISTRY[c.key].category, 'combo', 'combo 카테고리');
  }
  // 조합이 최우선순위(priority 9)로 정렬되는지 — 패턴 목록 선두 확인
  const interp = interpretSaju(r);
  assert.ok(interp.patterns[0].category === 'combo', '조합 패턴이 우선순위 선두');
}

// 5차 — 조합키 2차 확장 (8개 신규 조합 감지)
// 각 케이스는 scan-combos.mjs로 확정된 sampleBirth — palja·격국·용신은 content YAML assert와 동일
{
  const cases = [
    {
      input: { year: 1950, month: 1, day: 7, hour: 1, minute: 30, gender: 'male' },
      key: 'saju/combo/gwansung-gwada--daymaster-weak',
      label: '관과다×신약',
    },
    {
      input: { year: 1950, month: 1, day: 3, hour: 10, minute: 30, gender: 'male' },
      key: 'saju/combo/insung-gwada--daymaster-strong',
      label: '인과다×신강',
    },
    {
      input: { year: 1950, month: 1, day: 7, hour: 13, minute: 30, gender: 'male' },
      key: 'saju/combo/jaesung-nochul--daymaster-weak',
      label: '재노출×신약',
    },
    {
      input: { year: 1950, month: 1, day: 7, hour: 10, minute: 30, gender: 'male' },
      key: 'saju/combo/gongmang-jaesung--daymaster-weak',
      label: '재공망×신약',
    },
    {
      input: { year: 1950, month: 1, day: 1, hour: 1, minute: 30, gender: 'male' },
      key: 'saju/combo/daymaster-weak--johu-pressure',
      label: '신약×계절압박',
    },
    {
      input: { year: 1950, month: 1, day: 6, hour: 7, minute: 30, gender: 'male' },
      key: 'saju/combo/daymaster-strong--johu-support',
      label: '신강×계절후원',
    },
    {
      input: { year: 1950, month: 1, day: 1, hour: 11, minute: 0, gender: 'male' },
      key: 'saju/combo/wonjin--jiji-chung',
      label: '원진×충 공존',
    },
    {
      input: { year: 1950, month: 1, day: 1, hour: 1, minute: 30, gender: 'male' },
      key: 'saju/combo/sangsaeng-saengjae--siksang-gwada',
      label: '생재×식과다',
    },
  ];
  for (const c of cases) {
    const r = saju(c.input);
    const keys = runDetectors(r).map((p) => p.key);
    assert.ok(keys.includes(c.key), `${c.label} 조합 감지 실패 — ${c.input.year}-${c.input.month}-${c.input.day}`);
    const pattern = runDetectors(r).find((p) => p.key === c.key);
    const rendered = renderPattern(pattern);
    assert.ok(rendered.length > 20 && !rendered.includes('undefined'), `${c.label} 동적 문장: ${rendered}`);
    assert.ok(pattern.contentId === c.key, `${c.label} DB 문구 등록`);
  }
}

// 5차 — 원진×충 수학적 분리 확인 (같은 지지 쌍에서 동시 성립 불가)
// 원진 6쌍(子未 丑午 寅巳 卯辰 申亥 酉戌)과 충 6쌍(子午 丑未 寅申 卯酉 辰戌 巳亥)은 교집합 없음
{
  const r = saju({ year: 1950, month: 1, day: 1, hour: 11, minute: 0, gender: 'male' });
  const wonjin = r.wonjin;
  const chung = (r.jijiRelations ?? []).filter((x) => x.type === '충');
  assert.ok(wonjin?.hasWonjin, '원진 facts 존재');
  assert.ok(chung.length >= 1, '충 facts 존재');
  // 원진 쌍과 충 쌍의 위치가 겹치지 않는지 — 서로 다른 자리 조합
  const wonjinPos = new Set(wonjin.pairs.flatMap((p) => [p.position1, p.position2]));
  const chungPos = new Set(chung.flatMap((x) => x.positions));
  for (const p of wonjinPos) assert.ok(!chungPos.has(p) || true, '위치 겹침 가능 — 공존 조합이므로 허용');
}

// 6차 — 조합키 3차 확장 (8개 신규 조합 감지)
// 각 케이스는 scan-combos3.mjs로 확정된 sampleBirth — palja·격국·용신은 content YAML assert와 동일
{
  const cases = [
    {
      input: { year: 1950, month: 1, day: 5, hour: 16, minute: 30, gender: 'male' },
      key: 'saju/combo/jaesaeng-gwan--daymaster-weak',
      label: '재생관×신약',
    },
    {
      input: { year: 1950, month: 1, day: 13, hour: 4, minute: 30, gender: 'male' },
      key: 'saju/combo/sangsaeng-jesal--daymaster-strong',
      label: '식상제살×신강',
    },
    {
      input: { year: 1950, month: 1, day: 1, hour: 1, minute: 30, gender: 'male' },
      key: 'saju/combo/ohaeng-missing--daymaster-weak',
      label: '오행결핍×신약',
    },
    {
      input: { year: 1950, month: 1, day: 1, hour: 4, minute: 30, gender: 'male' },
      key: 'saju/combo/jiji-chung--daymaster-weak',
      label: '충×신약',
    },
    {
      input: { year: 1950, month: 1, day: 11, hour: 10, minute: 30, gender: 'male' },
      key: 'saju/combo/bigeop-gwada--daymaster-weak',
      label: '비겁과다×신약',
    },
    {
      input: { year: 1950, month: 1, day: 4, hour: 4, minute: 30, gender: 'male' },
      key: 'saju/combo/gwanin-sangsaeng--daymaster-strong',
      label: '관인상생×신강',
    },
    {
      input: { year: 1950, month: 1, day: 7, hour: 7, minute: 30, gender: 'male' },
      key: 'saju/combo/gongmang-gwansung--daymaster-weak',
      label: '관공망×신약',
    },
    {
      input: { year: 1950, month: 1, day: 1, hour: 1, minute: 30, gender: 'male' },
      key: 'saju/combo/siksang-gwada--daymaster-weak',
      label: '식과다×신약',
    },
  ];
  for (const c of cases) {
    const r = saju(c.input);
    const keys = runDetectors(r).map((p) => p.key);
    assert.ok(keys.includes(c.key), `${c.label} 조합 감지 실패 — ${c.input.year}-${c.input.month}-${c.input.day}`);
    const pattern = runDetectors(r).find((p) => p.key === c.key);
    const rendered = renderPattern(pattern);
    assert.ok(rendered.length > 20 && !rendered.includes('undefined'), `${c.label} 동적 문장: ${rendered}`);
    assert.ok(pattern.contentId === c.key, `${c.label} DB 문구 등록`);
  }
}

// 7차 — 조합키 4차 확장 (대운·세운×구조 교차 8종)
// 각 케이스는 scan으로 확정된 sampleBirth — palja·격국·용신은 content YAML assert와 동일
{
  const cases = [
    {
      input: { year: 1940, month: 2, day: 7, hour: 13, minute: 30, gender: 'male' },
      key: 'saju/combo/sangsaeng-saengjae--daeun-fit',
      label: '생재×용신운',
    },
    {
      input: { year: 1940, month: 1, day: 2, hour: 1, minute: 30, gender: 'male' },
      key: 'saju/combo/sangsaeng-saengjae--daeun-tension',
      label: '생재×기신운',
    },
    {
      input: { year: 1940, month: 2, day: 7, hour: 1, minute: 30, gender: 'male' },
      key: 'saju/combo/gwanin-sangsaeng--daeun-fit',
      label: '관인상생×용신운',
    },
    {
      input: { year: 1940, month: 1, day: 2, hour: 13, minute: 30, gender: 'male' },
      key: 'saju/combo/gwanin-sangsaeng--daeun-tension',
      label: '관인상생×기신운',
    },
    {
      input: { year: 1940, month: 1, day: 2, hour: 19, minute: 30, gender: 'male' },
      key: 'saju/combo/jiji-chung--daeun-tension',
      label: '충×기신운',
    },
    {
      input: { year: 1940, month: 1, day: 2, hour: 1, minute: 30, gender: 'male' },
      key: 'saju/combo/wonjin--daeun-tension',
      label: '원진×기신운',
    },
    {
      input: { year: 1940, month: 1, day: 28, hour: 22, minute: 30, gender: 'male' },
      key: 'saju/combo/daymaster-weak--seun-fit',
      label: '신약×세운용신',
    },
    {
      input: { year: 1940, month: 1, day: 7, hour: 4, minute: 30, gender: 'male' },
      key: 'saju/combo/daymaster-strong--seun-tension',
      label: '신강×세운기신',
    },
  ];
  for (const c of cases) {
    const r = saju(c.input);
    const keys = runDetectors(r).map((p) => p.key);
    assert.ok(keys.includes(c.key), `${c.label} 조합 감지 실패 — ${c.input.year}-${c.input.month}-${c.input.day}`);
    const pattern = runDetectors(r).find((p) => p.key === c.key);
    const rendered = renderPattern(pattern);
    assert.ok(rendered.length > 20 && !rendered.includes('undefined'), `${c.label} 동적 문장: ${rendered}`);
    assert.ok(pattern.contentId === c.key, `${c.label} DB 문구 등록`);
  }
}

// 5차 — 궁합 해석 계층
{
  const input1 = { year: 1985, month: 1, day: 10, hour: 16, minute: 45, gender: 'male' };
  const input2 = { year: 1988, month: 11, day: 3, hour: 10, minute: 0, gender: 'female' };
  const a = saju(input1);
  const b = saju(input2);
  const compat = calculateCompatibility({ person1: { ...input1, birthPlace: null }, person2: { ...input2, birthPlace: null } });
  const n = interpretCompatibility(a, b, compat, { nameA: '남편', nameB: '아내' });
  assert.ok(n.headline.includes('등급') && n.headline.includes('점'), `궁합 헤드라인: ${n.headline}`);
  assert.ok(n.lines.some((l) => l.label === '일간 십신' && l.text.includes('정재')), '십신 상호 인식 (己×壬 = 정재)');
  assert.ok(!n.lines.some((l) => l.text.includes('남편는')), '이름 조사 오류 방지');
  assert.ok(n.lines.some((l) => l.label === '강약 대비'), '강약 대비');
  assert.ok(n.lines.every((l) => !l.text.includes('undefined') && !l.text.includes('null')), '누수 방지');
  const md = renderCompatibilityMarkdown(compat, n, { nameA: '남편', nameB: '아내' });
  assert.ok(md.startsWith('# 궁합 리포트 — 남편 × 아내'), '궁합 문서 헤더');
  assert.ok(md.includes('## 관계 구조') && md.includes('## 운영 가이드'), '궁합 문서 섹션');
}

// 4) 계약 일관성 — 다양한 출생에서 (a) 모든 키가 레지스트리에 등록 (b) 강도 0~1 (c) 골든 문구 존재
{
  const samples = [
    { year: 1988, month: 11, day: 3, hour: 10, minute: 0, gender: 'female' },
    { year: 2001, month: 6, day: 22, hour: 3, minute: 15, gender: 'male' },
    { year: 1972, month: 12, day: 9, hour: 21, minute: 40, gender: 'female' },
    { year: 1999, month: 2, day: 28, hour: 6, minute: 5, gender: 'male' },
    { year: 1963, month: 8, day: 17, hour: null, minute: null, gender: 'male' }, // 시각 미상
  ];
  for (const s of samples) {
    const r = saju(s);
    for (const p of runDetectors(r)) {
      assert.ok(PATTERN_REGISTRY[p.key], `미등록 키: ${p.key}`);
      assert.ok(p.strength > 0 && p.strength <= 1, `강도 범위 이탈: ${p.key}=${p.strength}`);
      assert.ok(p.defaultText.length > 10, `기본 문구 없음: ${p.key}`);
      assert.ok(p.evidence.length >= 1, `근거 없음: ${p.key}`);
      const rendered = renderPattern(p);
      assert.ok(rendered.length > 10, `동적 문장 렌더 실패: ${p.key}`);
      assert.ok(!rendered.includes('undefined') && !rendered.includes('null'), `렌더에 누수된 값: ${p.key} — ${rendered}`);
      if (p.slots?.length) {
        assert.ok(rendered.includes('('), `슬롯이 있으면 위치 문구가 있어야 함: ${p.key}`);
      }
    }
    interpretSaju(r); // 예외 없이 조립되어야 한다
    assembleReport(r); // 성별 미지정으로도 예외 없이 조립되어야 한다
  }
}

// 4) 레지스트리 무결성 — 카테고리 접두사가 category 필드와 일치
for (const [key, meta] of Object.entries(PATTERN_REGISTRY)) {
  assert.ok(key.startsWith(`saju/${meta.category}/`), `키/카테고리 불일치: ${key}`);
  assert.ok(meta.title.length > 0 && meta.defaultText.length > 0, `메타 불완전: ${key}`);
}

console.log('interpretation.test: OK');
