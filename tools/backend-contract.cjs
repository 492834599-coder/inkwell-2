const API_BASE = process.env.INKWELL_API_BASE || process.env.VITE_INKWELL_API_BASE || 'http://127.0.0.1:8788';

async function post(pathname, payload) {
  const response = await fetchWithContext(pathname, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`${pathname} failed: ${response.status} ${await response.text()}`);
  }
  return response.json();
}

async function get(pathname) {
  const response = await fetchWithContext(pathname);
  if (!response.ok) {
    throw new Error(`${pathname} failed: ${response.status} ${await response.text()}`);
  }
  return response.json();
}

async function del(pathname) {
  const response = await fetchWithContext(pathname, { method: 'DELETE' });
  if (!response.ok) {
    throw new Error(`${pathname} failed: ${response.status} ${await response.text()}`);
  }
  return response.json();
}

async function expectStatus(pathname, payload, status, label) {
  const response = await fetchWithContext(pathname, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  assert(response.status === status, `${label} should return ${status}, got ${response.status}`);
}

async function fetchWithContext(pathname, init) {
  try {
    return await fetch(`${API_BASE}${pathname}`, init);
  } catch (error) {
    throw new Error(`${pathname} fetch failed: ${error.message || error}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function verifyProjectStateContract({ candidates, bundle, draft, structure, style, judge, rewritten, memory }) {
  const previous = await get('/api/project-state');
  if (previous.saved && process.env.INKWELL_CONTRACT_PROJECT_STATE !== 'true') {
    return 'skipped-existing-snapshot';
  }
  const snapshot = {
    schemaVersion: 1,
    savedFrom: 'frontend',
    mode: 'genre',
    genre: '都市悬疑',
    spark: '',
    selectedCandidateId: candidates.candidates[0].id,
    candidates: candidates.candidates,
    candidateProviderTrace: candidates.providerTrace || null,
    candidateProviderFallback: candidates.providerFallback || [],
    candidateProviderSource: candidates.providerSource || 'backend-deterministic',
    candidateProviderMessage: candidates.providerMessage || '',
    project: bundle.project,
    bible: bundle.bible,
    chapterGoal: bundle.chapterGoal,
    workflow: [
      { id: 'draft', label: 'draft', role: 'writer', model: draft.draft.model, status: 'passed', summary: draft.draft.notes, promptFocus: 'contract' },
    ],
    draftVersions: [draft.draft, rewritten.draft],
    currentDraftId: rewritten.draft.id,
    draftParagraphs: rewritten.draft.paragraphs,
    reviewReports: [structure.report, style.report, judge.report],
    annotations: [],
    memoryPacks: [memory.memory],
    promptPresets: [],
    zhuqueReports: [],
  };

  try {
    const saved = await post('/api/project-state', { snapshot });
    assert(saved.ok === true && saved.saved === true && saved.savedAt, 'project-state save should succeed');

    const loaded = await get('/api/project-state');
    assert(loaded.saved === true && loaded.snapshot?.currentDraftId === rewritten.draft.id, 'project-state load should return saved snapshot');

    await expectStatus('/api/project-state', { snapshot: { ...snapshot, schemaVersion: 99 } }, 400, 'invalid project-state schema');
    await expectStatus('/api/project-state', { snapshot: { ...snapshot, workflow: [{ id: 'bad', status: 'unknown' }] } }, 400, 'invalid workflow status');

    const wrongType = await fetch(`${API_BASE}/api/project-state`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: 'not json',
    });
    assert(wrongType.status === 415, `project-state text/plain should return 415, got ${wrongType.status}`);

    const tooLarge = await fetch(`${API_BASE}/api/project-state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ snapshot: { ...snapshot, spark: 'x'.repeat(9 * 1024 * 1024) } }),
    });
    assert(tooLarge.status === 413, `oversized project-state should return 413, got ${tooLarge.status}`);

    const deleted = await del('/api/project-state');
    assert(deleted.saved === false, 'project-state delete should clear snapshot');
    const afterDelete = await get('/api/project-state');
    assert(afterDelete.saved === false && afterDelete.snapshot === null, 'project-state should be empty after delete');
    return 'checked';
  } finally {
    if (previous.snapshot) {
      await post('/api/project-state', { snapshot: previous.snapshot });
    } else {
      await del('/api/project-state');
    }
  }
}

async function main() {
  const blockedOrigin = await fetchWithContext('/api/health', { headers: { Origin: 'https://example.com' } });
  assert(blockedOrigin.status === 403, `non-local origin should be rejected, got ${blockedOrigin.status}`);

  const health = await get('/api/health');
  assert(health.ok === true, 'health.ok should be true');
  assert(Array.isArray(health.capabilities) && health.capabilities.includes('orchestrator'), 'health should advertise orchestrator');
  assert(health.capabilities.includes('project-state'), 'health should advertise project-state');

  const status = await get('/api/orchestrator/status');
  assert(status.ok === true && status.providerMode, 'orchestrator status should expose provider mode');
  assert(status.providerStatus && Array.isArray(status.providerStatus.providers), 'orchestrator status should expose provider status');

  const logs = await get('/api/orchestrator/logs?limit=10');
  assert(logs.ok === true && Array.isArray(logs.calls), 'orchestrator logs should expose recent calls');

  const candidates = await post('/api/orchestrator/candidates', {
    mode: 'genre',
    genre: '都市悬疑',
    spark: '',
  });
  assert(Array.isArray(candidates.candidates) && candidates.candidates.length >= 1, 'candidates should be non-empty');

  const bundle = await post('/api/orchestrator/project', { candidate: candidates.candidates[0] });
  assert(bundle.project?.id && bundle.bible?.id && bundle.chapterGoal?.id, 'project bundle should contain project, bible, and chapterGoal');

  const draft = await post('/api/orchestrator/draft', {
    bible: bundle.bible,
    goal: bundle.chapterGoal,
    versionNumber: 1,
  });
  assert(Array.isArray(draft.draft?.paragraphs) && draft.draft.paragraphs.length >= 1, 'draft should contain paragraphs');

  const structure = await post('/api/orchestrator/audit/structure', {
    draft: draft.draft,
    goal: bundle.chapterGoal,
  });
  assert(structure.report?.nodeId === 'audit-b', 'structure audit should return audit-b report');

  const style = await post('/api/orchestrator/audit/style', { draft: draft.draft });
  assert(style.report?.nodeId === 'audit-c', 'style audit should return audit-c report');

  const judge = await post('/api/orchestrator/judge', {
    draft: draft.draft,
    reports: [structure.report, style.report],
  });
  assert(judge.report?.nodeId === 'judge', 'judge should return judge report');

  const rewritten = await post('/api/orchestrator/rewrite', {
    draft: draft.draft,
    reports: [structure.report, style.report],
    annotations: [],
  });
  assert(rewritten.draft?.versionNumber === draft.draft.versionNumber + 1, 'rewrite should increment draft version');

  const memory = await post('/api/orchestrator/memory', {
    project: bundle.project,
    bible: bundle.bible,
    goal: bundle.chapterGoal,
    draft: rewritten.draft,
  });
  assert(memory.memory?.chapterId === bundle.chapterGoal.chapterId, 'memory should match chapter');

  const projectStateContract = await verifyProjectStateContract({ candidates, bundle, draft, structure, style, judge, rewritten, memory });

  const badProject = await fetch(`${API_BASE}/api/orchestrator/project`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ candidate: { id: 'broken' } }),
  });
  assert(badProject.status === 400, 'invalid project payload should return 400');
  await expectStatus('/api/orchestrator/draft', { bible: bundle.bible }, 400, 'invalid draft payload');
  await expectStatus('/api/orchestrator/audit/structure', { draft: draft.draft }, 400, 'invalid structure audit payload');
  await expectStatus('/api/orchestrator/audit/style', { draft: { id: 'broken' } }, 400, 'invalid style audit payload');
  await expectStatus('/api/orchestrator/rewrite', { draft: draft.draft, reports: 'bad', annotations: [] }, 400, 'invalid rewrite payload');
  await expectStatus('/api/orchestrator/memory', { project: bundle.project, bible: bundle.bible, goal: bundle.chapterGoal }, 400, 'invalid memory payload');

  console.log(
    JSON.stringify(
      {
        ok: true,
        apiBase: API_BASE,
        candidates: candidates.candidates.length,
        providerMode: status.providerMode,
        projectState: projectStateContract,
        project: bundle.project.title,
        draftParagraphs: draft.draft.paragraphs.length,
        rewriteVersion: rewritten.draft.versionNumber,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
