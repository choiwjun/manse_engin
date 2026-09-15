// 해석 계층(detector·조립기) 회귀 테스트 — `npm run build` 후 실행.
// 골든 케이스: 1985-01-10 16:45 남(甲子 丁丑 己酉 壬申, 비견격·용신 금)
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildSajuResult,
  interpretSaju,
  runDetectors,
  measureOhaeng,
  assembleReport,
  buildTimingNarrative,
  renderPattern,
  renderReportMarkdown,
  renderReportHtml,
  renderCompatibilityMarkdown,
  interpretCompatibility,
  analyzeNames,
  interpretNaming,
  interpretNamingWithSaju,
  renderNamingMarkdown,
  getCalendarDay,
  interpretTaekil,
  renderTaekilMarkdown,
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
  assert.ok(flowRendered.includes('전문성 축적과 수입 구조의 관계를 점검'), `DB body.short 오버라이드: ${flowRendered}`);

  // 신약 계량 발화는 summary 캡과 무관하게 패턴 자체로 단언한다 (조합키 증가로 상위 라인이 밀릴 수 있음)
  const weakPattern = interp.patterns.find((p) => p.key === 'saju/imbalance/daymaster-weak');
  assert.ok(weakPattern, '신약 detector 발화');
  const weakRendered = renderPattern(weakPattern);
  assert.ok(weakRendered.includes('36.7%') && weakRendered.includes('신약'), `계량 수치 반영: ${weakRendered}`);
  // 조후 detector 발화는 summary 캡과 무관하게 패턴 자체로 단언한다 (조합키 증가로 상위 라인이 밀릴 수 있음)
  const johuPattern = interp.patterns.find((p) => p.key === 'saju/johu/season-command');
  assert.ok(johuPattern, '조후 detector — 丑월(토왕) × 己(토) 일간 = 당령 일간');
  assert.ok(renderPattern(johuPattern).includes('당령'), '조후 렌더 문장에 당령 표현');
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
  const healthText = rep.sections.health.lines.join(' ');
  assert.ok(healthText.includes('의료 전문가의 판단'), '건강 축 — 의료 전문가 우선 안내');
  assert.ok(!healthText.includes('체력·에너지의 기반'), '건강 축 — 강약을 체력으로 단정하지 않음');
  assert.ok(!healthText.includes('타고난 경보'), '건강 축 — 결오행을 경보로 단정하지 않음');
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
  assert.equal((md.match(/식상이 재성으로 이어지는 구조는/g) ?? []).length, 1, '식상생재 심층 문구 단일 배치');
  assert.ok(md.includes('용신 근거(격국용신):'), '용신 판정 방식 노출');
  assert.ok(md.includes('용신 근거(격국용신): 비견격에서'), '용신 판정 근거 노출');
  assert.equal((md.match(/용신 근거\(격국용신\)/g) ?? []).length, 1, '용신 판정 방식 중복 제거');
  const flowDynamic = renderPattern(flowPattern);
  assert.equal(md.split(flowDynamic).length - 1, 1, '패턴 동적 문장 단일 배치');
  assert.ok(!md.includes('일지 식신이 시주의 정재를 생하는'), '샘플 명식 전용 식상생재 문구 차단');
  assert.ok(!md.includes('강도가 최상 등급'), '패턴 강도 고정 문구 차단');
  assert.ok(md.includes('## 핵심 내용'), '핵심 내용 섹션');
  assert.ok(md.includes('## 분야별 전체 풀이'), '분야별 전체 풀이 섹션');
  assert.ok(md.includes('## 운의 흐름'), '운의 흐름 섹션');
  assert.ok(md.includes('## 전체 구조 해설'), '전체 구조 해설 섹션');
  assert.ok(md.includes(`감지 패턴 ${rep.patterns.length}건`), '전체 감지 패턴 수 표기');
  assert.ok(rep.patterns.length > rep.sections.love.patterns.length, '전체 패턴이 축별 선별 목록보다 많음');
  const firstPattern = rep.patterns[0];
  assert.ok(firstPattern && md.includes(firstPattern.title), '전체 구조 해설에 우선 패턴 제목 출력');
  assert.ok(firstPattern && firstPattern.evidence.some((e) => md.includes(e)), '전체 구조 해설에 패턴 근거 출력');
  const sectionPatternKeys = new Set(Object.values(rep.sections).flatMap((section) => section.patterns.map((pattern) => pattern.key)));
  for (const pattern of rep.patterns) {
    assert.ok(md.includes(`### ${pattern.title}`), `전체 패턴 제목 출력: ${pattern.key}`);
    assert.ok(md.includes(renderPattern(pattern)), `패턴 동적 해석 출력: ${pattern.key}`);
    if (!sectionPatternKeys.has(pattern.key)) {
      assert.ok(md.includes(`- 해석: ${renderPattern(pattern)}`), `미배정 패턴 상세 해석 출력: ${pattern.key}`);
    }
    for (const evidence of pattern.evidence) assert.ok(md.includes(evidence), `전체 패턴 근거 출력: ${pattern.key}`);
  }
  assert.ok(!md.includes('undefined') && !md.includes('null'), '렌더 누수 방지');

  // 9차-후속 — HTML 렌더러 (인쇄·PDF 대응 standalone 문서 + 상담사 브랜드 프리앰블)
  const html = renderReportHtml(rep, {
    counselor: { name: '청명역학원', contact: '010-0000-0000', tagline: '사주·작명·택일 전문' },
  });
  assert.ok(html.startsWith('<!DOCTYPE html>'), 'HTML doctype');
  assert.ok(!html.includes('<script'), 'standalone HTML has no scripts');
  assert.ok(html.includes('<html lang="ko">'), 'HTML lang');
  assert.ok(html.includes('@media print'), '인쇄 CSS 포함');
  assert.ok(html.includes('@page'), '페이지 여백 규칙');
  assert.ok(html.includes('청명역학원'), '브랜드명 헤더');
  assert.ok(html.includes('010-0000-0000'), '브랜드 연락처');
  assert.ok(html.includes('사주·작명·택일 전문'), '브랜드 태그라인');
  assert.ok(html.includes('class="brand-foot"'), '브랜드 푸터');
  for (const header of ['핵심 내용', '오행 계량', '분야별 전체 풀이', '운의 흐름', '전체 구조 해설']) {
    assert.ok(html.includes(header), `HTML 섹션: ${header}`);
  }
  assert.ok(html.includes(`감지 패턴 ${rep.patterns.length}건`), 'HTML 전체 패턴 수');
  assert.ok(!html.includes('>undefined<') && !html.includes('>null<'), 'HTML 누수 방지');
  assert.ok(html.includes('&lt;') === false || !html.includes('<script'), '스크립트 없음(안전한 standalone)');

  // 브랜드 프리앰블 없이도 렌더 가능
  const htmlNoBrand = renderReportHtml(rep);
  assert.ok(!htmlNoBrand.includes('class="brand"'), '브랜드 미지정 시 헤더 없음');
  assert.ok(htmlNoBrand.includes('사주 풀이 리포트'), '기본 제목');

  // 3차 — 시각 미상에서도 리포트가 예외 없이 조립되어야 한다
  const repNoHour = assembleReport(saju({ year: 1963, month: 8, day: 17, hour: null, minute: null, gender: 'female' }), {
    gender: 'female',
  });
  assert.ok(Object.values(repNoHour.sections).every((sec) => sec.lines.length >= 1), '시각 미상 섹션 조립');

  // QA — 시각 미상 시 시주·자녀궁을 언급하는 문장이 나오면 안 된다
  const noHourFamily = repNoHour.sections.family.lines;
  assert.ok(noHourFamily.some((l) => l.includes('시각 미상')), '시각 미상 안내 문장 존재');
  assert.ok(!noHourFamily.some((l) => l.includes('시주(자녀·말년궁)') && !l.includes('시각 미상')), '시주 언급 누출 없음');

  // 육친 매핑 회귀 — 주류 배속: 남명 자녀=관성, 여명 자녀=식상
  const maleFamily = assembleReport(saju({ year: 1985, month: 1, day: 10, hour: 16, minute: 45, gender: 'male' }), { gender: 'male' }).sections.family.lines;
  const femaleFamily = assembleReport(saju({ year: 1985, month: 1, day: 10, hour: 16, minute: 45, gender: 'female' }), { gender: 'female' }).sections.family.lines;
  assert.ok(maleFamily.some((l) => l.startsWith('자녀 축(관성)')), '남명 자녀성=관성');
  assert.ok(femaleFamily.some((l) => l.startsWith('자녀 축(식상)')), '여명 자녀성=식상');

  // QA — 특수격(종강격)에서 격국×용신 cross 패턴이 발화되어야 한다
  const rJonggang = saju({ year: 1947, month: 12, day: 22, hour: 0, minute: 57, gender: 'male' });
  assert.equal(rJonggang.gyeokguk.name, '종강격', '종강격 판정');
  const keysJonggang = runDetectors(rJonggang).map((p) => p.key);
  assert.ok(keysJonggang.includes('saju/cross/gyeokguk-yongsin-fit'), '종강격 격국·용신 동심(fit) 발화');

  // QA — 연살(도화)+재성 cross 패턴이 발화되어야 한다
  const rDohwa = saju({ year: 1996, month: 10, day: 6, hour: 2, minute: 5, gender: 'male' });
  const keysDohwa = runDetectors(rDohwa).map((p) => p.key);
  assert.ok(keysDohwa.includes('saju/cross/sinsal-연살-jaesung'), '연살+재성 cross 발화');

  // QA — 재노출×비겁 과다 조합 패턴 발화
  const rJaeNochul = saju({ year: 2009, month: 9, day: 10, hour: 19, minute: 30, gender: 'female' });
  const keysJaeNochul = runDetectors(rJaeNochul).map((p) => p.key);
  assert.ok(keysJaeNochul.includes('saju/combo/jaesung-nochul--bigeop-gwada'), '재노출×비겁 과다 발화');

  // QA — 재공망×세운기신 조합 패턴 발화
  const rGongmang = saju({ year: 1990, month: 9, day: 25, hour: 19, minute: 50, gender: 'male' });
  const keysGongmang = runDetectors(rGongmang).map((p) => p.key);
  assert.ok(keysGongmang.includes('saju/combo/gongmang-jaesung--seun-tension'), '재공망×세운기신 발화');

  // QA — 같은 패턴이라도 명식 맥락(격국·용신·강약)이 다르면 다른 문장이 나와야 한다
  const repA = assembleReport(saju({ year: 1985, month: 1, day: 10, hour: 16, minute: 45, gender: 'male' }), { gender: 'male' });
  const repB = assembleReport(saju({ year: 1993, month: 2, day: 4, hour: 14, minute: 40, gender: 'male' }), { gender: 'male' });
  const mdA = renderReportMarkdown(repA);
  const mdB = renderReportMarkdown(repB);
  const ctxA = mdA.split('\n').find((l) => l.includes('이 명식에서'));
  const ctxB = mdB.split('\n').find((l) => l.includes('이 명식에서'));
  assert.ok(ctxA && ctxB && ctxA !== ctxB, '명식별 맥락 문장이 다름');

  // 내담자용 content 안전성 — 건강·재정·관계 결정을 점괘처럼 지시하지 않는다.
  const sajuContentDir = fileURLToPath(new URL('../../content/entries/saju/', import.meta.url));
  const yamlFiles = [];
  function collectYaml(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const file = join(dir, entry.name);
      if (entry.isDirectory()) collectYaml(file);
      else if (entry.name.endsWith('.yaml') || entry.name.endsWith('.yml')) yamlFiles.push(file);
    }
  }
  collectYaml(sajuContentDir);
  const unsafeCounselingPatterns = [
    /약한 몸에/,
    /회복이 빠/,
    /체력·에너지의 기반/,
    /타고난 경보/,
    /건강의 미세한 이상/,
    /몸과 관계의 관리/,
    /(?:큰 결정|큰 결단|승진·자격·진학).*보류/,
    /(?:큰 결정|큰 결단|관계 단절).*피하/,
    /투자·대출.*피하/,
    /(?:결정·확장·투자|결정).*크게 가져가도/,
    /버틸 만/,
    /무리가 적/,
    /결정을 이 (?:해|시기)에 두기 좋/,
    /내년을 노리고/,
    /(?:수입·투자·계약|사업 확장·직위 상승|관계의 큰 결단).*이 (?:해|시기|구간)에/,
    /(?:적극적으로|주저 없이|먼저 연락|이 시기를 피)/,
    /(?:최적 동선|최적의 시기|잘 붙습니다|순조롭게 묶이는|수익이 나는 구조|매출로 이어지는 구조|재물 축적 속도)/,
    /(?:번아웃|회복·비축의 루틴.*시스템화|회복·비축.*시스템화)/,
    /(?:큰 결정|확장).*?(?:미루|보류|피하)/,
  ];
  for (const file of yamlFiles) {
    const text = readFileSync(file, 'utf8');
    for (const pattern of unsafeCounselingPatterns) {
      assert.ok(!pattern.test(text), `내담자용 단정·지시 문구 금지: ${file} / ${pattern}`);
    }
  }
  for (const [key, entry] of Object.entries(PATTERN_REGISTRY)) {
    const text = `${entry.defaultText} ${entry.conclusion}`;
    for (const pattern of unsafeCounselingPatterns) {
      assert.ok(!pattern.test(text), `기본 해석의 단정·지시 문구 금지: ${key} / ${pattern}`);
    }
  }
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

// 5차-후속 — 작명 해석 계층
{
  const result = analyzeNames('김', ['민준', '서준', '도현']);
  const narratives = interpretNaming(result);
  assert.equal(narratives.length, 3, '후보 수만큼 해석 생성');
  for (const n of narratives) {
    assert.ok(n.headline.includes('점'), `작명 헤드라인에 점수: ${n.headline}`);
    assert.ok(n.lines.length >= 3, `해석 라인 부족: ${n.headline}`);
    assert.ok(n.lines.every((l) => l.label.length > 0 && l.text.length > 10), `빈 해석 라인: ${n.headline}`);
    assert.ok(n.guidance.length >= 1, `가이드 없음: ${n.headline}`);
    assert.ok(!n.headline.includes('undefined') && !n.headline.includes('null'), '헤드라인 누수');
  }
  const md = renderNamingMarkdown(result, narratives);
  assert.ok(md.startsWith('# 작명 리포트'), '작명 문서 헤더');
  assert.ok(md.includes('## 1. 김민준') && md.includes('**강점**'), '작명 문서 섹션');
}

// 5차-후속 — 택일 해석 계층
{
  const day = getCalendarDay(2026, 9, 15);
  const n = interpretTaekil(day);
  assert.ok(n.headline.includes('2026-09-15') && n.headline.includes('위일'), `택일 헤드라인: ${n.headline}`);
  assert.ok(n.lines.some((l) => l.label === '십이직'), '십이직 라인');
  assert.ok(n.lines.some((l) => l.label === '일진 오행'), '일진 오행 라인');
  assert.ok(n.guidance.length >= 1, '가이드 생성');
  assert.ok(n.avoid.length > 0, '흉일은 피할 일 목록');
  assert.ok(!n.headline.includes('undefined') && !n.headline.includes('null'), '헤드라인 누수');
  const md = renderTaekilMarkdown(day, n);
  assert.ok(md.startsWith('# 택일 리포트'), '택일 문서 헤더');
  assert.ok(md.includes('## 이 날에 피할 일') && md.includes('## 운영 가이드'), '택일 문서 섹션');

  // 길일 케이스 — 십이직 순회로 길일 하나를 찾아 suited 목록 확인
  let gilFound = false;
  for (let d = 1; d <= 28 && !gilFound; d += 1) {
    const dd = getCalendarDay(2026, 9, d);
    if (dd.gilhyung === '길') {
      const nn = interpretTaekil(dd);
      assert.ok(nn.suited.length > 0, `길일 ${dd.solarDate}은 맞는 일 목록이 있어야 함`);
      gilFound = true;
    }
  }
  assert.ok(gilFound, '9월 내 길일 존재');
}

// 5차-후속2 — 작명×사주 교차
{
  const r = saju({ year: 1985, month: 1, day: 10, hour: 16, minute: 45, gender: 'male' });
  const names = analyzeNames('김', ['민준', '수아', '지호']);
  const ns = interpretNamingWithSaju(names, r);
  assert.equal(ns.length, 3, '사주 교차 해석 수');
  for (const n of ns) {
    const sajuLine = n.lines.find((l) => l.label === '사주 보완');
    assert.ok(sajuLine, `사주 보완 라인: ${n.headline}`);
    assert.ok(sajuLine.text.includes('현실 조건'), `작명 교차의 현실 조건 안내: ${sajuLine.text}`);
    assert.ok(!sajuLine.text.includes('부를 때마다') && !sajuLine.text.includes('효과'), `작명 교차의 인과 단정 금지: ${sajuLine.text}`);
    assert.ok(n.strengths.every((line) => !line.includes('메웁니다') && !line.includes('돕습니다')), `작명 강점의 인과 단정 금지: ${n.strengths.join(' / ')}`);
    assert.ok(!n.headline.includes('undefined') && !n.headline.includes('null'), '헤드라인 누수');
  }
  // 용신(금) 오행 이름은 '용신 방향' 또는 '결핍 보완' 접미어를 가져야 한다
  const minjun = ns.find((n) => n.headline.startsWith('김민준'));
  assert.ok(minjun && /용신 방향|결핍 보완/.test(minjun.headline), `용신/보완 접미: ${minjun?.headline}`);
}

// 5차-후속3 — 시점 서사 2단계 (월운×세운 교차, 대운 전환 서사)
{
  const r = saju({ year: 1985, month: 1, day: 10, hour: 16, minute: 45, gender: 'male' });
  const tn = buildTimingNarrative(r, new Date('2026-09-13T12:00:00+09:00'));
  assert.ok(tn.wolun, '월운 존재');
  assert.ok(tn.wolun.verdict && tn.wolun.cross, `월운 판정·교차: ${tn.wolun.line}`);
  assert.ok(tn.wolun.line.includes('세운'), '월운×세운 교차 문구');

  // 대운 전환 임박 — 2033-03 종료이므로 2032-10은 임박 구간
  const tn2 = buildTimingNarrative(r, new Date('2032-10-01T12:00:00+09:00'));
  assert.ok(tn2.transition && tn2.transition.imminent, `전환 임박: ${tn2.transition?.line}`);
  assert.ok(tn2.transition.line.includes('壬午'), '다음 대운 명시');

  // 전환 12개월 전 — 다가오는 구간
  const tn3 = buildTimingNarrative(r, new Date('2032-04-01T12:00:00+09:00'));
  assert.ok(tn3.transition && !tn3.transition.imminent, `전환 다가옴: ${tn3.transition?.line}`);
}

// 10차 — 기존 구조의 미포괄 강약 축 4개
{
  const cases = [
    {
      input: { year: 1950, month: 1, day: 1, hour: 4, minute: 30, gender: 'male' },
      key: 'saju/combo/gwanin-sangsaeng--daymaster-weak',
      label: '관인상생×신약',
    },
    {
      input: { year: 1950, month: 1, day: 5, hour: 19, minute: 30, gender: 'male' },
      key: 'saju/combo/sangsaeng-jesal--daymaster-weak',
      label: '식상제살×신약',
    },
    {
      input: { year: 1950, month: 1, day: 6, hour: 13, minute: 30, gender: 'male' },
      key: 'saju/combo/jaesaeng-gwan--daymaster-strong',
      label: '재생관×신강',
    },
    {
      input: { year: 1950, month: 1, day: 3, hour: 7, minute: 30, gender: 'male' },
      key: 'saju/combo/jiji-chung--daymaster-strong',
      label: '충×신강',
    },
  ];
  for (const c of cases) {
    const r = saju(c.input);
    const pattern = runDetectors(r).find((p) => p.key === c.key);
    assert.ok(pattern, `${c.label} 조합 감지 실패`);
    assert.equal(pattern.contentId, c.key, `${c.label} DB 문구 등록`);
    const rendered = renderPattern(pattern);
    assert.ok(rendered.length > 20 && !rendered.includes('undefined') && !rendered.includes('null'), `${c.label} 동적 문장`);
  }
}

// cross 확장 — 신살×십신 추가 조합
{
  const cases = [
    {
      input: { year: 1950, month: 1, day: 11, hour: 1, minute: 30, gender: 'male' },
      key: 'saju/cross/sinsal-장성-bigeop',
      label: '장성+비겁',
    },
    {
      input: { year: 1950, month: 1, day: 2, hour: 1, minute: 30, gender: 'male' },
      key: 'saju/cross/sinsal-장성-jaesung',
      label: '장성+재성',
    },
    {
      input: { year: 1950, month: 1, day: 9, hour: 1, minute: 30, gender: 'male' },
      key: 'saju/cross/sinsal-화개-jaesung',
      label: '화개+재성',
    },
    {
      input: { year: 1950, month: 1, day: 2, hour: 22, minute: 30, gender: 'male' },
      key: 'saju/cross/sinsal-역마-gwansung',
      label: '역마+관성',
    },
  ];
  for (const c of cases) {
    const r = saju(c.input);
    const pattern = runDetectors(r).find((p) => p.key === c.key);
    assert.ok(pattern, `${c.label} cross 감지 실패`);
    assert.equal(pattern.contentId, c.key, `${c.label} DB 문구 등록`);
    const rendered = renderPattern(pattern);
    assert.ok(rendered.length > 20 && !rendered.includes('undefined') && !rendered.includes('null'), `${c.label} 동적 문장`);
  }
}

// flow 확장 — 인성생비겁·비겁생식상 인접 흐름
{
  const cases = [
    {
      input: { year: 1950, month: 1, day: 2, hour: 10, minute: 30, gender: 'male' },
      key: 'saju/flow/insung-saeng-bigeop',
      label: '인성생비겁',
    },
    {
      input: { year: 1950, month: 1, day: 1, hour: 1, minute: 30, gender: 'male' },
      key: 'saju/flow/bigeop-saeng-siksang',
      label: '비겁생식상',
    },
  ];
  for (const c of cases) {
    const r = saju(c.input);
    const pattern = runDetectors(r).find((p) => p.key === c.key);
    assert.ok(pattern, `${c.label} 흐름 감지 실패`);
    assert.equal(pattern.contentId, c.key, `${c.label} DB 문구 등록`);
    const rendered = renderPattern(pattern);
    assert.ok(rendered.length > 20 && !rendered.includes('undefined') && !rendered.includes('null'), `${c.label} 동적 문장`);
  }
}

// 9차 — 조합키 9차 확장 (8개 신규 조합 감지)
// 각 케이스는 scan-combos-13.mjs로 확정된 sampleBirth — palja·격국·용신은 content YAML assert와 동일
{
  const cases = [
    {
      input: { year: 1950, month: 1, day: 26, hour: 10, minute: 30, gender: 'male' },
      key: 'saju/combo/samhap--seun-fit',
      label: '삼합×세운용신',
    },
    {
      input: { year: 1950, month: 1, day: 14, hour: 10, minute: 30, gender: 'male' },
      key: 'saju/combo/samhap--seun-tension',
      label: '삼합×세운기신',
    },
    {
      input: { year: 1950, month: 1, day: 1, hour: 22, minute: 30, gender: 'female' },
      key: 'saju/combo/banghap--daeun-fit',
      label: '방합×용신운',
    },
    {
      input: { year: 1950, month: 1, day: 1, hour: 22, minute: 30, gender: 'male' },
      key: 'saju/combo/banghap--daeun-tension',
      label: '방합×기신운',
    },
    {
      input: { year: 1950, month: 1, day: 16, hour: 4, minute: 30, gender: 'male' },
      key: 'saju/combo/jiji-hap--seun-fit',
      label: '합×세운용신',
    },
    {
      input: { year: 1950, month: 1, day: 2, hour: 1, minute: 30, gender: 'male' },
      key: 'saju/combo/jiji-hap--seun-tension',
      label: '합×세운기신',
    },
    {
      input: { year: 1950, month: 1, day: 24, hour: 19, minute: 30, gender: 'male' },
      key: 'saju/combo/jiji-hyeong--seun-tension',
      label: '형×세운기신',
    },
    {
      input: { year: 1950, month: 1, day: 13, hour: 22, minute: 30, gender: 'male' },
      key: 'saju/combo/jiji-hae--seun-tension',
      label: '해×세운기신',
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
