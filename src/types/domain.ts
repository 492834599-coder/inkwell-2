export type ModelRole =
  | "planner"
  | "writer"
  | "structureAuditor"
  | "styleAuditor"
  | "rewriter"
  | "finalJudge"
  | "aiDetector"
  | "memory";

export type WorkflowStatus = "idle" | "running" | "needsFix" | "passed" | "blocked" | "done";

export type ProjectMode = "genre" | "spark";

export interface ProviderAttempt {
  at: string;
  providerId: string;
  provider: string;
  model: string;
  api: string;
  status: "success" | "failed" | "skipped";
  latencyMs: number;
  error: string | null;
  cooldownUntil: string | null;
}

export interface ProviderTrace {
  ok: boolean;
  fallback: boolean;
  providerId: string | null;
  provider: string | null;
  model: string | null;
  latencyMs: number;
  attempts: ProviderAttempt[];
  errors: string[];
}

export interface CandidateGenerationResult {
  candidates: StoryCandidate[];
  providerTrace?: ProviderTrace;
  providerFallback?: string[];
}

export interface ProviderHealth {
  status: "idle" | "running" | "healthy" | "degraded" | "cooldown";
  successCount: number;
  failureCount: number;
  consecutiveFailures: number;
  lastUsedAt: string | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  cooldownUntil: string | null;
  lastError: string | null;
}

export interface ProviderStatusEntry {
  id: string;
  provider: string;
  model: string;
  api: string;
  configured: boolean;
  health: ProviderHealth;
}

export interface ProviderStatus {
  roles: Record<string, string[]>;
  providers: ProviderStatusEntry[];
  missing: string[];
}

export interface ProviderLogEntry extends ProviderAttempt {
  id: string;
  role: string;
}

export interface ProviderDiagnostics {
  ok: boolean;
  calls: ProviderLogEntry[];
  providerStatus: ProviderStatus;
}

export interface StoryCandidate {
  id: string;
  title: string;
  genre: string;
  logline: string;
  protagonist: string;
  coreConflict: string;
  openingHook: string;
  toneTags: string[];
}

export interface NovelProject {
  id: string;
  title: string;
  genre: string;
  logline: string;
  bibleStatus: "drafted" | "needs_review" | "locked";
  currentChapterId: string;
  createdAt: number;
}

export interface ProjectBible {
  id: string;
  projectId: string;
  premise: string;
  protagonist: string;
  coreConflict: string;
  openingHook: string;
  worldRules: string[];
  styleRules: string[];
  mustAvoid: string[];
  longArcSeeds: string[];
  createdAt: number;
}

export interface ChapterGoal {
  id: string;
  projectId: string;
  chapterId: string;
  title: string;
  plotGoal: string;
  emotionalGoal: string;
  conflictGoal: string;
  openingImage: string;
  endingHook: string;
  mustInclude: string[];
  mustAvoid: string[];
  auditFocus: string[];
  createdAt: number;
}

export interface WorkflowNodeData {
  id: string;
  label: string;
  role: ModelRole;
  model: string;
  status: WorkflowStatus;
  summary: string;
  promptFocus: string;
  output?: string;
  providerTrace?: ProviderTrace;
  providerFallback?: string[];
}

export interface DraftParagraph {
  id: string;
  text: string;
  hasComment?: boolean;
}

export interface DraftVersion {
  id: string;
  chapterId: string;
  versionNumber: number;
  sourceNodeId: string;
  model: string;
  paragraphs: DraftParagraph[];
  notes: string;
  createdAt: number;
  providerTrace?: ProviderTrace;
  providerFallback?: string[];
}

export interface ReviewIssue {
  id: string;
  paragraphId: string;
  category: "结构审计" | "AI味审计" | "最终验收";
  severity: "critical" | "high" | "medium" | "low";
  problem: string;
  suggestion: string;
  fixInstruction: string;
}

export interface ReviewReport {
  id: string;
  chapterId: string;
  nodeId: string;
  model: string;
  score: number;
  passed: boolean;
  summary: string;
  issues: ReviewIssue[];
  createdAt: number;
  providerTrace?: ProviderTrace;
  providerFallback?: string[];
}

export type ZhuqueCheckStatus =
  | "untested"
  | "checking"
  | "passed"
  | "ai_risk"
  | "quota_exhausted"
  | "needs_login"
  | "failed";

export interface ZhuqueReport {
  id: string;
  chapterId: string;
  draftId: string;
  status: ZhuqueCheckStatus;
  aigcScore: number | null;
  aiPercent: number | null;
  verdict: string;
  summary: string;
  remainingDaily: number | null;
  reportScreenshotUrl?: string;
  reportHtmlUrl?: string;
  reportScreenshotPath?: string;
  reportHtmlPath?: string;
  reportText?: string;
  checkedAt: number;
}

export interface UserAnnotation {
  id: string;
  paragraphId: string;
  text: string;
  status: "open" | "sent_to_ai" | "resolved";
}

export interface MemoryPack {
  id: string;
  chapterId: string;
  summary: string;
  keyEvents: string[];
  characterChanges: string[];
  foreshadowingUpdates: string[];
  nextChapterBrief: string;
  createdAt: number;
  model?: string;
  providerTrace?: ProviderTrace;
  providerFallback?: string[];
}

export interface PromptPreset {
  id: string;
  nodeId: string;
  title: string;
  model: string;
  version: number;
  template: string;
}

export interface ProjectSnapshot {
  schemaVersion: number;
  savedFrom: "frontend";
  mode: ProjectMode;
  genre: string;
  spark: string;
  selectedCandidateId: string;
  candidates: StoryCandidate[];
  candidateProviderTrace: ProviderTrace | null;
  candidateProviderFallback: string[];
  project: NovelProject | null;
  bible: ProjectBible | null;
  chapterGoal: ChapterGoal | null;
  workflow: WorkflowNodeData[];
  draftVersions: DraftVersion[];
  currentDraftId: string | null;
  draftParagraphs: DraftParagraph[];
  reviewReports: ReviewReport[];
  annotations: UserAnnotation[];
  memoryPacks: MemoryPack[];
  promptPresets: PromptPreset[];
  zhuqueReports: ZhuqueReport[];
}

export interface ProjectStateStatus {
  ok: boolean;
  saved: boolean;
  savedAt: string | null;
  version: number;
  sizeBytes: number;
}

export interface ProjectStateLoadResult extends ProjectStateStatus {
  snapshot: ProjectSnapshot | null;
}
