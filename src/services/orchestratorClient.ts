import type {
  CandidateGenerationResult,
  ChapterGoal,
  DraftVersion,
  MemoryPack,
  NovelProject,
  ProviderDiagnostics,
  ProviderTrace,
  ProjectBible,
  ProjectMode,
  ReviewReport,
  StoryCandidate,
  UserAnnotation,
} from "../types/domain";

const API_BASE = import.meta.env.VITE_INKWELL_API_BASE || import.meta.env.VITE_ZHUQUE_API_BASE || "http://127.0.0.1:8788";

export async function requestCandidates(payload: {
  mode: ProjectMode;
  genre: string;
  spark: string;
}): Promise<CandidateGenerationResult> {
  return postJson<WithProviderTrace<{ candidates: StoryCandidate[] }>>("/api/orchestrator/candidates", payload);
}

export async function requestProjectBundle(candidate: StoryCandidate): Promise<{
  project: NovelProject;
  bible: ProjectBible;
  chapterGoal: ChapterGoal;
}> {
  return postJson("/api/orchestrator/project", { candidate });
}

export async function requestDraft(payload: {
  bible: ProjectBible;
  goal: ChapterGoal;
  versionNumber?: number;
}): Promise<DraftVersion> {
  const result = await postJson<WithProviderTrace<{ draft: DraftVersion }>>("/api/orchestrator/draft", payload);
  return attachProviderTrace(result.draft, result);
}

export async function requestStructureAudit(draft: DraftVersion, goal: ChapterGoal): Promise<ReviewReport> {
  const result = await postJson<WithProviderTrace<{ report: ReviewReport }>>("/api/orchestrator/audit/structure", { draft, goal });
  return attachProviderTrace(result.report, result);
}

export async function requestStyleAudit(draft: DraftVersion): Promise<ReviewReport> {
  const result = await postJson<WithProviderTrace<{ report: ReviewReport }>>("/api/orchestrator/audit/style", { draft });
  return attachProviderTrace(result.report, result);
}

export async function requestFinalJudge(draft: DraftVersion, reports: ReviewReport[]): Promise<ReviewReport> {
  const result = await postJson<WithProviderTrace<{ report: ReviewReport }>>("/api/orchestrator/judge", { draft, reports });
  return attachProviderTrace(result.report, result);
}

export async function requestRewrite(
  draft: DraftVersion,
  reports: ReviewReport[],
  annotations: UserAnnotation[]
): Promise<DraftVersion> {
  const result = await postJson<WithProviderTrace<{ draft: DraftVersion }>>("/api/orchestrator/rewrite", { draft, reports, annotations });
  return attachProviderTrace(result.draft, result);
}

export async function requestMemory(payload: {
  project: NovelProject;
  bible: ProjectBible;
  goal: ChapterGoal;
  draft: DraftVersion;
}): Promise<MemoryPack> {
  const result = await postJson<WithProviderTrace<{ memory: MemoryPack }>>("/api/orchestrator/memory", payload);
  return attachProviderTrace(result.memory, result);
}

export async function requestProviderDiagnostics(limit = 30): Promise<ProviderDiagnostics> {
  return getJson(`/api/orchestrator/logs?limit=${encodeURIComponent(String(limit))}`);
}

type WithProviderTrace<T> = T & {
  providerTrace?: ProviderTrace;
  providerFallback?: string[];
};

function attachProviderTrace<T extends { providerTrace?: ProviderTrace; providerFallback?: string[] }>(
  artifact: T,
  result: WithProviderTrace<unknown>
): T {
  return {
    ...artifact,
    providerTrace: artifact.providerTrace ?? result.providerTrace,
    providerFallback: artifact.providerFallback ?? result.providerFallback,
  };
}

async function postJson<T>(pathname: string, payload: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${pathname}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `Orchestrator 服务异常：${response.status}`));
  }

  return response.json();
}

async function getJson<T>(pathname: string): Promise<T> {
  const response = await fetch(`${API_BASE}${pathname}`);

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `Orchestrator 鏈嶅姟寮傚父锛?{response.status}`));
  }

  return response.json();
}

async function readErrorMessage(response: Response, fallback: string) {
  const text = await response.text();
  if (!text) return fallback;
  try {
    const parsed = JSON.parse(text) as { error?: string };
    return parsed.error || text;
  } catch {
    return text;
  }
}
