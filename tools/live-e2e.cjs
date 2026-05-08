const API_BASE = process.env.INKWELL_API_BASE || process.env.VITE_INKWELL_API_BASE || 'http://127.0.0.1:8788';
const ALLOW_FALLBACK = process.env.INKWELL_E2E_ALLOW_FALLBACK === 'true';

async function post(pathname, payload) {
  const response = await fetch(`${API_BASE}${pathname}`, {
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
  const response = await fetch(`${API_BASE}${pathname}`);
  if (!response.ok) {
    throw new Error(`${pathname} failed: ${response.status} ${await response.text()}`);
  }
  return response.json();
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertTrace(label, trace) {
  assert(trace && typeof trace === 'object', `${label} should include providerTrace`);
  assert(Array.isArray(trace.attempts), `${label} providerTrace.attempts should be an array`);
  if (!ALLOW_FALLBACK) {
    assert(trace.ok === true, `${label} providerTrace.ok should be true`);
    assert(trace.fallback === false, `${label} should not fallback in strict live E2E`);
    return;
  }
  assert(trace.ok === true || trace.fallback === true, `${label} should either succeed live or declare fallback`);
  if (trace.fallback === true) {
    assert(trace.attempts.length > 0 || (Array.isArray(trace.errors) && trace.errors.length > 0), `${label} fallback should preserve provider diagnostics`);
  }
}

function compactTrace(trace) {
  return {
    provider: trace?.provider || null,
    model: trace?.model || null,
    latencyMs: trace?.latencyMs || 0,
    fallback: Boolean(trace?.fallback),
    attempts: Array.isArray(trace?.attempts)
      ? trace.attempts.map((attempt) => ({
          providerId: attempt.providerId,
          status: attempt.status,
          latencyMs: attempt.latencyMs,
          error: attempt.error,
        }))
      : [],
  };
}

async function main() {
  const status = await get('/api/orchestrator/status');
  assert(status.ok === true, 'status.ok should be true');
  assert(status.live === true, 'live E2E requires INKWELL_PROVIDER_MODE=live backend');

  const candidates = await post('/api/orchestrator/candidates', {
    mode: 'spark',
    genre: '都市悬疑',
    spark: '一个能听见谎言的人接到真实凶手的委托，第一章必须从一次深夜问诊开始。',
  });
  assert(Array.isArray(candidates.candidates) && candidates.candidates.length >= 1, 'candidates should be non-empty');
  assertTrace('candidates', candidates.providerTrace);

  const bundle = await post('/api/orchestrator/project', { candidate: candidates.candidates[0] });
  assert(bundle.project?.id && bundle.bible?.id && bundle.chapterGoal?.id, 'project bundle should be complete');

  const draft = await post('/api/orchestrator/draft', {
    bible: bundle.bible,
    goal: bundle.chapterGoal,
    versionNumber: 1,
  });
  assert(Array.isArray(draft.draft?.paragraphs) && draft.draft.paragraphs.length >= 3, 'draft should contain paragraphs');
  assertTrace('draft', draft.providerTrace);

  const structure = await post('/api/orchestrator/audit/structure', {
    draft: draft.draft,
    goal: bundle.chapterGoal,
  });
  assert(structure.report?.nodeId === 'audit-b', 'structure audit should return audit-b');
  assertTrace('structure audit', structure.report.providerTrace);

  const style = await post('/api/orchestrator/audit/style', { draft: draft.draft });
  assert(style.report?.nodeId === 'audit-c', 'style audit should return audit-c');
  assertTrace('style audit', style.report.providerTrace);

  const judge = await post('/api/orchestrator/judge', {
    draft: draft.draft,
    reports: [structure.report, style.report],
  });
  assert(judge.report?.nodeId === 'judge', 'judge should return judge report');
  assertTrace('judge', judge.report.providerTrace);

  const rewrite = await post('/api/orchestrator/rewrite', {
    draft: draft.draft,
    reports: [structure.report, style.report, judge.report],
    annotations: [],
  });
  assert(rewrite.draft?.versionNumber === draft.draft.versionNumber + 1, 'rewrite should increment version');
  assertTrace('rewrite', rewrite.providerTrace);

  const memory = await post('/api/orchestrator/memory', {
    project: bundle.project,
    bible: bundle.bible,
    goal: bundle.chapterGoal,
    draft: rewrite.draft,
  });
  assert(memory.memory?.chapterId === bundle.chapterGoal.chapterId, 'memory should match chapter');
  assertTrace('memory', memory.providerTrace);

  const logs = await get('/api/orchestrator/logs?limit=20');
  assert(Array.isArray(logs.calls) && logs.calls.length >= 6, 'logs should include live provider calls');

  console.log(
    JSON.stringify(
      {
        ok: true,
        apiBase: API_BASE,
        strictFallback: !ALLOW_FALLBACK,
        project: bundle.project.title,
        draftParagraphs: draft.draft.paragraphs.length,
        rewriteVersion: rewrite.draft.versionNumber,
        traces: {
          candidates: compactTrace(candidates.providerTrace),
          draft: compactTrace(draft.providerTrace),
          structure: compactTrace(structure.report.providerTrace),
          style: compactTrace(style.report.providerTrace),
          judge: compactTrace(judge.report.providerTrace),
          rewrite: compactTrace(rewrite.providerTrace),
          memory: compactTrace(memory.providerTrace),
        },
        logCount: logs.calls.length,
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
