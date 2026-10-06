// 엔진 ↔ 플랫폼 연결 어댑터.
// executeEngineModule 결과를 calculation_snapshot으로 보존하고,
// assembleReport/시점 서사 결과를 주제별 interpretation_draft 자동 초안으로 변환한다.
// (product-plan §4.2 경계: 플랫폼은 envelope를 불투명 보존, 해석 초안은 상담사 검수 전 고객에게 나가지 않는다)
import {
  executeEngineModule,
  assembleReport,
  interpretSaju,
  interpretTojeong,
  interpretNaming,
} from '../../packages/myeong-engine/dist/index.js';

// UI 주제 → assembleReport 축 매핑 (PRD §3.2 질문 목록 기준)
export const TOPICS = [
  { id: 'career', label: '직업·적성', axis: 'career' },
  { id: 'business', label: '사업', axis: 'career' },
  { id: 'wealth', label: '재물', axis: 'wealth' },
  { id: 'love', label: '연애', axis: 'love' },
  { id: 'marriage', label: '결혼', axis: 'love' },
  { id: 'health', label: '건강', axis: 'health' },
  { id: 'family', label: '육친·가족', axis: 'family' },
  { id: 'year', label: '올해 운', axis: 'timing' },
  { id: 'overview', label: '전체 구조', axis: 'overview' },
  { id: 'tojeong', label: '토정비결', module: 'tojeong' },
  { id: 'naming', label: '작명', module: 'naming' },
];

export function topicLabel(topicId) {
  return TOPICS.find((t) => t.id === topicId)?.label ?? topicId;
}

// 고객 출생정보로 사주 명식을 실행하고 스냅샷으로 보존한다.
export async function runSajuCalculation(platform, workspaceId, clientId, opts = {}) {
  const client = platform.getClient(workspaceId, clientId);
  if (!client.birth) {
    const err = new Error('삭제 처리된 고객은 계산할 수 없습니다.');
    err.code = 'INVALID_INPUT';
    throw err;
  }
  const sessionId = opts.sessionId ?? null;
  const envelope = await executeEngineModule('saju', {
    birth: client.birth,
    now: new Date().toISOString(),
    subSchool: opts.subSchool,
  });
  const snapshot = await platform.recordCalculation(
    workspaceId,
    { clientId, sessionId: sessionId ?? undefined, envelope },
    opts.actor,
  );
  return { snapshot, envelope };
}

// 세션의 최신 사주 스냅샷을 찾는다.
export function latestSajuSnapshot(platform, workspaceId, sessionId) {
  const session = platform.getSession(workspaceId, sessionId);
  const snapshots = platform
    .listSnapshots(workspaceId, session.clientId)
    .filter((s) => s.envelope.moduleId === 'saju')
    .sort((a, b) => b.envelope.calculatedAt.localeCompare(a.envelope.calculatedAt));
  return snapshots[0] ?? null;
}

function topicDraftText(report, interpretation, topicId) {
  if (topicId === 'overview') {
    return [report.headline, ...interpretation.summary.structureLines, ...interpretation.summary.cautionLines].join('\n');
  }
  if (topicId === 'year') {
    const t = report.timing;
    const lines = [];
    if (t.sewoon) lines.push(`올해(${t.sewoon.ganJi}${t.sewoon.sipsin ? `, ${t.sewoon.sipsin}` : ''}): ${t.sewoon.line}`);
    if (t.daeun) lines.push(`현재 대운(${t.daeun.ganJi}): ${t.daeun.line}`);
    if (t.next) lines.push(`다음 대운(${t.next.ganJi}, ${t.next.age}세~): ${t.next.line}`);
    if (t.wolun) lines.push(`이번 달(${t.wolun.ganJi}): ${t.wolun.line}${t.wolun.cross ? ` — 세운과 ${t.wolun.cross}` : ''}`);
    return lines.join('\n');
  }
  const axis = TOPICS.find((t) => t.id === topicId)?.axis;
  const section = axis ? report.sections[axis] : null;
  if (!section) return '';
  return [section.headline, ...section.lines].join('\n');
}

function topicBasisRefs(report, interpretation, topicId) {
  if (topicId === 'overview') {
    return interpretation.patterns.slice(0, 8).map((p) => p.contentId ?? p.key);
  }
  if (topicId === 'year') {
    return report.patterns?.filter((p) => p.category === 'timing').map((p) => p.contentId ?? p.key) ?? [];
  }
  const axis = TOPICS.find((t) => t.id === topicId)?.axis;
  const section = axis ? report.sections[axis] : null;
  return section ? section.patterns.map((p) => p.contentId ?? p.key) : [];
}

// 모든 주제의 계산을 먼저 확인한다. 누락/오래된 결과가 있으면 초안을 일부만 저장하지 않는다.
export async function generateTopicDrafts(platform, workspaceId, sessionId, topicIds, actor) {
  const session = platform.getSession(workspaceId, sessionId);
  const client = platform.getClient(workspaceId, session.clientId);
  if (!client.birth) throw Object.assign(new Error('삭제 처리된 고객은 풀이를 생성할 수 없습니다.'), { code: 'INVALID_INPUT' });
  const topics = [...new Set(topicIds)];
  if (!topics.length || topics.some(id => !TOPICS.some(t => t.id === id))) {
    throw Object.assign(new Error('풀이 주제를 선택하세요.'), { code: 'INVALID_INPUT' });
  }
  const snapshots = platform.listSnapshots(workspaceId, session.clientId)
    .sort((a, b) => b.envelope.calculatedAt.localeCompare(a.envelope.calculatedAt));
  const selected = new Map();
  for (const id of topics) {
    const moduleId = TOPICS.find(t => t.id === id).module ?? 'saju';
    if (selected.has(moduleId)) continue;
    const snapshot = snapshots.find(s => s.envelope.moduleId === moduleId);
    if (!snapshot) throw Object.assign(new Error(`${topicLabel(id)} 계산 결과가 없습니다. 고객 화면에서 먼저 계산하세요.`), { code: 'NOT_FOUND' });
    const result = snapshot.envelope.result;
    const oldPolicy = moduleId === 'tojeong' ? result.calculation?.policyId !== 'tojeong-8x6x3-regular-clamp-v2'
      : moduleId === 'naming' ? result.policy?.id !== 'wonhyeong-real-strokes-v2' : false;
    if (oldPolicy || await platform.isSnapshotStale(workspaceId, snapshot.id)) {
      throw Object.assign(new Error(`${topicLabel(id)} 결과의 입력 또는 계산 기준이 변경되었습니다. 고객 화면에서 다시 계산하세요.`), { code: 'INVALID_INPUT' });
    }
    selected.set(moduleId, snapshot);
  }
  const saju = selected.get('saju');
  const report = saju ? assembleReport(saju.envelope.result) : null;
  const interpretation = saju ? interpretSaju(saju.envelope.result) : null;
  const prepared = topics.map(topicId => {
    const moduleId = TOPICS.find(t => t.id === topicId).module ?? 'saju';
    const snapshot = selected.get(moduleId);
    if (moduleId === 'saju') return { topicId, snapshot, text: topicDraftText(report, interpretation, topicId), basisRefs: topicBasisRefs(report, interpretation, topicId) };
    const result = snapshot.envelope.result;
    const narratives = moduleId === 'tojeong' ? [interpretTojeong(result)] : interpretNaming(result);
    if (!narratives.length) throw Object.assign(new Error('풀이할 작명 후보가 없습니다. 조건을 조정해 다시 계산하세요.'), { code: 'INVALID_INPUT' });
    const text = narratives.map(n => [n.headline, ...n.lines.map(l => `${l.label}: ${l.text}`),
      ...(n.strengths ?? []).map(t => `강점: ${t}`), ...n.cautions.map(t => `확인: ${t}`), ...n.guidance.map(t => `안내: ${t}`)].join('\n')).join('\n\n');
    return { topicId, snapshot, text, basisRefs: [...new Set(narratives.flatMap(n => n.basisRefs))] };
  });
  const created = prepared.map(({ topicId, snapshot, text, basisRefs }) => platform.createDraft(workspaceId, {
    sessionId, snapshotId: snapshot.id, topic: topicLabel(topicId), text, basisRefs,
    engineVersion: snapshot.envelope.engineVersion, contentVersion: snapshot.envelope.dataVersion,
  }, actor));
  return { snapshot: saju ?? prepared[0].snapshot, created };
}

// 개인별 입력은 항상 저장된 고객에서 가져온다. 대표 생년/띠 입력으로 대체하지 않는다.
export async function runTojeongCalculation(platform, workspaceId, clientId, opts = {}) {
  const client = platform.getClient(workspaceId, clientId);
  if (!client.birth) throw Object.assign(new Error('삭제 처리된 고객은 계산할 수 없습니다.'), { code: 'INVALID_INPUT' });
  const b = client.birth;
  const envelope = await executeEngineModule('tojeong', {
    birthYear: b.year, birthMonth: b.month, birthDay: b.day,
    calendarType: b.isLunar ? 'lunar' : 'solar', isLeapMonth: b.isLunar && Boolean(b.isLeapMonth),
    targetYear: opts.targetYear, leapMonthPolicy: opts.leapMonthPolicy ?? 'regular-month',
  });
  const snapshot = await platform.recordCalculation(workspaceId, { clientId, envelope }, opts.actor);
  return { envelope, snapshot };
}

export async function runNamingCalculation(platform, workspaceId, clientId, opts = {}) {
  const client = platform.getClient(workspaceId, clientId);
  if (!client.birth) throw Object.assign(new Error('삭제 처리된 고객은 계산할 수 없습니다.'), { code: 'INVALID_INPUT' });
  if (!['recommend', 'analyze'].includes(opts.mode)) throw Object.assign(new Error('작명 실행 방식을 선택하세요.'), { code: 'INVALID_INPUT' });
  const input = opts.mode === 'recommend' ? {
    mode: 'recommend', surname: opts.surname, surnameHanja: opts.surnameHanja,
    birth: client.birth, school: opts.school, yongsinSchool: opts.yongsinSchool,
    ...(opts.givenName ? { givenName: opts.givenName } : {}), limit: 6,
  } : {
    mode: 'analyze', surname: opts.surname, school: opts.school,
    candidates: [{ givenName: opts.givenName, hanjaChars: [...(opts.surnameHanja ?? ''), ...(opts.givenHanja ?? '')] }],
  };
  const envelope = await executeEngineModule('naming', input);
  const snapshot = await platform.recordCalculation(workspaceId, { clientId, envelope }, opts.actor);
  return { envelope, snapshot };
}
