// 엔진 ↔ 플랫폼 연결 어댑터.
// executeEngineModule 결과를 calculation_snapshot으로 보존하고,
// assembleReport/시점 서사 결과를 주제별 interpretation_draft 자동 초안으로 변환한다.
// (product-plan §4.2 경계: 플랫폼은 envelope를 불투명 보존, 해석 초안은 상담사 검수 전 고객에게 나가지 않는다)
import {
  executeEngineModule,
  assembleReport,
  interpretSaju,
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

// 선택한 주제들의 자동 초안을 만든다. 세션에 명식 스냅샷이 필요하다.
export function generateTopicDrafts(platform, workspaceId, sessionId, topicIds, actor) {
  const snapshot = latestSajuSnapshot(platform, workspaceId, sessionId);
  if (!snapshot) {
    const err = new Error('세션에 연결할 사주 명식 스냅샷이 없습니다. 먼저 명식을 계산하세요.');
    err.code = 'NOT_FOUND';
    throw err;
  }
  const result = snapshot.envelope.result;
  const report = assembleReport(result);
  const interpretation = interpretSaju(result);
  const created = [];
  for (const topicId of topicIds) {
    const text = topicDraftText(report, interpretation, topicId);
    if (!text) continue;
    created.push(
      platform.createDraft(
        workspaceId,
        {
          sessionId,
          snapshotId: snapshot.id,
          topic: topicLabel(topicId),
          text,
          basisRefs: topicBasisRefs(report, interpretation, topicId),
          engineVersion: snapshot.envelope.engineVersion,
          contentVersion: snapshot.envelope.dataVersion,
        },
        actor,
      ),
    );
  }
  return { snapshot, created };
}
