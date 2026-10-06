import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlatform, createInMemoryStore } from '../../packages/myeong-platform/dist/index.js';
import { runNamingCalculation, runTojeongCalculation, generateTopicDrafts } from './engine-adapter.mjs';
import { clientDetailPage } from './views.mjs';

function setup() {
  const platform = createPlatform(createInMemoryStore());
  const { workspace } = platform.createWorkspace({ name: '로컬 검증', owner: { displayName: '검증', brand: { name: '검증' } } });
  const client = platform.createClient(workspace.id, { displayName: '<script>test</script>',
    birth: { year: 1990, month: 5, day: 15, hour: 14, minute: 30, gender: 'male', isLunar: false, birthPlace: null },
    timeAccuracy: 'exact', consent: { purpose: '로컬 검증' } });
  return { platform, workspace, client };
}

test('personal service snapshots use their actual client, persist conditions, and reject erased clients', async () => {
  const { platform, workspace, client } = setup();
  const first = await runTojeongCalculation(platform, workspace.id, client.id, { targetYear: 2026 });
  const second = await runNamingCalculation(platform, workspace.id, client.id, { mode: 'recommend', surname: '김', surnameHanja: '金' });
  assert.equal(first.snapshot.clientId, client.id);
  assert.deepEqual(second.envelope.input.birth, client.birth);
  assert.equal(platform.listSnapshots(workspace.id, client.id).length, 2);
  await assert.rejects(runNamingCalculation(platform, workspace.id, client.id, { mode: 'recommend', surname: '김', surnameHanja: '朴' }));
  assert.equal(platform.listSnapshots(workspace.id, client.id).length, 2);
  platform.requestClientDeletion(workspace.id, client.id, { requestedBy: 'client', reason: '로컬 검증' });
  platform.processClientErasure(workspace.id, client.id);
  await assert.rejects(runTojeongCalculation(platform, workspace.id, client.id, { targetYear: 2026 }), /삭제/);
  await assert.rejects(runNamingCalculation(platform, workspace.id, client.id, { mode: 'recommend', surname: '김', surnameHanja: '金' }), /삭제/);
});

test('old naming results are withheld for recalculation and user text is escaped', () => {
  const { platform, workspace, client } = setup();
  const snapshot = { id: 'old', envelope: { moduleId: 'naming', result: { candidates: [{ name: 'OLD-INVALID-RESULT' }] }, warnings: [], engineVersion: '0.3.0', calculatedAt: '2026-01-01T00:00:00Z' } };
  const html = clientDetailPage({ client, snapshots: [snapshot], staleMap: new Map([['old', true]]), sessions: [], timeline: platform.getClientTimeline(workspace.id, client.id) });
  assert.ok(html.includes('새 기준으로 다시 계산'));
  assert.ok(!html.includes('OLD-INVALID-RESULT'));
  assert.ok(!html.includes('<script>test</script>'));
  assert.ok(html.includes('&lt;script&gt;test&lt;/script&gt;'));
});


test('personal interpretations bind their own snapshots, need no saju snapshot, and require review for reports', async () => {
  const { platform, workspace, client } = setup();
  const session = platform.createSession(workspace.id, { clientId: client.id });
  const tojeong = await runTojeongCalculation(platform, workspace.id, client.id, { targetYear: 2026 });
  // Missing naming must not leave a partial Tojeong draft.
  await assert.rejects(generateTopicDrafts(platform, workspace.id, session.id, ['tojeong', 'naming']), /작명 계산 결과/);
  assert.equal(platform.listDrafts(workspace.id, session.id).length, 0);
  const naming = await runNamingCalculation(platform, workspace.id, client.id, { mode: 'recommend', surname: '김', surnameHanja: '金' });
  const { created } = await generateTopicDrafts(platform, workspace.id, session.id, ['tojeong', 'naming', 'naming']);
  assert.equal(created.length, 2);
  assert.equal(created[0].snapshotId, tojeong.snapshot.id);
  assert.equal(created[1].snapshotId, naming.snapshot.id);
  assert.match(created[0].auto.text, /미검증/);
  assert.match(created[1].auto.text, /추천 기준/);
  assert.ok(created.every(d => d.state === 'auto' && d.auto.basisRefs.length > 0));
  assert.equal(platform.buildReportVersion(workspace.id, { sessionId: session.id }).renderInput.sections.length, 0);
  for (const d of created) platform.approveDraft(workspace.id, d.id, { id: 'reviewer', role: 'counselor' });
  assert.deepEqual(platform.buildReportVersion(workspace.id, { sessionId: session.id }).renderInput.sections.map(s => s.topic), ['토정비결', '작명']);
  platform.updateClient(workspace.id, client.id, { birth: { ...client.birth, day: 16 } });
  await assert.rejects(generateTopicDrafts(platform, workspace.id, session.id, ['tojeong', 'naming']), /다시 계산/);
  assert.equal(platform.listDrafts(workspace.id, session.id).length, 2);
});

test('draft generation does not borrow another client results or allow empty/unknown topics', async () => {
  const { platform, workspace, client } = setup();
  await runTojeongCalculation(platform, workspace.id, client.id, { targetYear: 2026 });
  const other = platform.createClient(workspace.id, { displayName: '다른 고객', birth: client.birth, timeAccuracy: 'exact', consent: { purpose: '검증' } });
  const session = platform.createSession(workspace.id, { clientId: other.id });
  await assert.rejects(generateTopicDrafts(platform, workspace.id, session.id, ['tojeong']), /계산 결과가 없습니다/);
  await assert.rejects(generateTopicDrafts(platform, workspace.id, session.id, []), /주제/);
  await assert.rejects(generateTopicDrafts(platform, workspace.id, session.id, ['invalid']), /주제/);
});
