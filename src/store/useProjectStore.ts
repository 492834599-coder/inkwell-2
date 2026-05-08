import { create } from "zustand";
import { persist } from "zustand/middleware";
import { annotations, candidates, workflow } from "../data/mock";
import { generateBible } from "../services/bibleGenerator";
import { generateCandidates } from "../services/candidateGenerator";
import { generateFirstChapterGoal } from "../services/chapterGoalGenerator";
import { generateInitialDraft } from "../services/draftGenerator";
import { generateMemoryPack } from "../services/memoryGenerator";
import {
  requestCandidates,
  requestDraft,
  requestFinalJudge,
  requestMemory,
  requestProjectBundle,
  requestRewrite,
  requestStructureAudit,
  requestStyleAudit,
} from "../services/orchestratorClient";
import { defaultPromptPresets } from "../services/promptPresets";
import { runFinalJudge, runStructureAudit, runStyleAudit } from "../services/reviewSimulator";
import { rewriteDraft } from "../services/rewriteSimulator";
import { checkZhuqueText, getZhuqueLoginQr, type ZhuqueCheckResponse } from "../services/zhuqueClient";
import {
  deleteProjectSnapshot as deleteRemoteProjectSnapshot,
  getProjectSnapshot,
  saveProjectSnapshot as saveRemoteProjectSnapshot,
} from "../services/projectStateClient";
import type {
  ChapterGoal,
  DraftVersion,
  DraftParagraph,
  MemoryPack,
  NovelProject,
  ProjectSnapshot,
  ProviderTrace,
  ProjectBible,
  ProjectMode,
  PromptPreset,
  ReviewReport,
  StoryCandidate,
  UserAnnotation,
  WorkflowNodeData,
  WorkflowStatus,
  ZhuqueReport,
} from "../types/domain";

interface ProjectState {
  mode: ProjectMode;
  genre: string;
  spark: string;
  isGeneratingCandidates: boolean;
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
  zhuqueLoginQrUrl: string;
  zhuqueLoginMessage: string;
  isLoadingZhuqueQr: boolean;
  isCheckingZhuque: boolean;
  isSavingProjectSnapshot: boolean;
  isLoadingProjectSnapshot: boolean;
  projectSnapshotMessage: string;
  projectSnapshotSavedAt: string | null;
  tutorialDismissed: boolean;
  setMode: (mode: ProjectMode) => void;
  setGenre: (genre: string) => void;
  setSpark: (spark: string) => void;
  generateStoryCandidates: () => void | Promise<void>;
  selectCandidate: (id: string) => void;
  createProjectFromCandidate: () => NovelProject | Promise<NovelProject>;
  ensureBible: () => void;
  ensureChapterGoal: () => void;
  resetProject: () => void;
  updateNodeStatus: (id: string, status: WorkflowStatus) => void;
  completeNode: (id: string) => void;
  runWorkflowNode: (id: string) => void | Promise<void>;
  addUserAnnotation: (paragraphId: string, text: string) => void;
  approveReaderDraft: () => void;
  createNextChapterFromMemory: () => void;
  sendAnnotationsToWorkflow: () => void;
  requestZhuqueLoginQr: () => Promise<void>;
  saveBackendSnapshot: () => Promise<void>;
  loadBackendSnapshot: () => Promise<boolean>;
  deleteBackendSnapshot: () => Promise<void>;
  dismissTutorial: () => void;
  restartTutorial: () => void;
}

const nextNodeById: Record<string, string | undefined> = {
  brief: "draft",
  draft: "audit-b",
  "audit-b": "rewrite-a",
  "rewrite-a": "audit-c",
  "audit-c": "judge",
  judge: "reader",
  reader: "zhuque",
  zhuque: "memory",
};

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      mode: "genre",
      genre: "都市悬疑",
      spark: "一个能听见谎言的人，遇见了一个从不说谎的杀人犯。",
      isGeneratingCandidates: false,
      selectedCandidateId: candidates[0].id,
      candidates,
      candidateProviderTrace: null,
      candidateProviderFallback: [],
      project: null,
      bible: null,
      chapterGoal: null,
      workflow,
      draftVersions: [],
      currentDraftId: null,
      draftParagraphs: [],
      reviewReports: [],
      annotations,
      memoryPacks: [],
      promptPresets: defaultPromptPresets,
      zhuqueReports: [],
      zhuqueLoginQrUrl: "",
      zhuqueLoginMessage: "",
      isLoadingZhuqueQr: false,
      isCheckingZhuque: false,
      isSavingProjectSnapshot: false,
      isLoadingProjectSnapshot: false,
      projectSnapshotMessage: "",
      projectSnapshotSavedAt: null,
      tutorialDismissed: false,

      setMode: (mode) => set({ mode }),
      setGenre: (genre) => set({ genre }),
      setSpark: (spark) => set({ spark }),
      selectCandidate: (id) => set({ selectedCandidateId: id }),

      generateStoryCandidates: async () => {
        const state = get();
        const input = {
          mode: state.mode,
          genre: state.genre,
          spark: state.spark,
        };
        set({ isGeneratingCandidates: true });
        const result = await requestCandidates(input).catch(() => ({
          candidates: generateCandidates(input),
          providerTrace: undefined,
          providerFallback: ["local deterministic candidate fallback"],
        }));
        const generated = result.candidates;
        set({
          candidates: generated,
          candidateProviderTrace: result.providerTrace || null,
          candidateProviderFallback: result.providerFallback || [],
          selectedCandidateId: generated[0]?.id || "",
          isGeneratingCandidates: false,
        });
      },

      createProjectFromCandidate: async () => {
        const selected = get().candidates.find((candidate) => candidate.id === get().selectedCandidateId) || candidates[0];
        const fallbackProject: NovelProject = {
            id: `novel:${selected.id}`,
            title: selected.title,
            genre: selected.genre,
            logline: selected.logline,
            bibleStatus: "drafted",
            currentChapterId: "chapter-001",
            createdAt: Date.now(),
          };
        const fallbackBible = generateBible(fallbackProject, selected);
        const fallbackChapterGoal = generateFirstChapterGoal(fallbackProject, fallbackBible);
        const {
          project,
          bible,
          chapterGoal,
        } = await requestProjectBundle(selected).catch(() => ({
          project: fallbackProject,
          bible: fallbackBible,
          chapterGoal: fallbackChapterGoal,
        }));
        set({
          project,
          bible,
          chapterGoal,
          workflow: workflowWithGoal(chapterGoal),
          draftVersions: [],
          currentDraftId: null,
          draftParagraphs: [],
          reviewReports: [],
          annotations,
          memoryPacks: [],
          zhuqueReports: [],
          zhuqueLoginQrUrl: "",
          zhuqueLoginMessage: "",
          isLoadingZhuqueQr: false,
          isCheckingZhuque: false,
          candidateProviderTrace: null,
          candidateProviderFallback: [],
        });
        return project;
      },

      ensureBible: () => {
        const state = get();
        if (state.bible || !state.project) return;
        const selected = state.candidates.find((candidate) => candidate.id === state.selectedCandidateId) || candidates[0];
        const bible = generateBible(state.project, selected);
        const chapterGoal = state.chapterGoal || generateFirstChapterGoal(state.project, bible);
        set({ bible, chapterGoal, workflow: workflowWithGoal(chapterGoal) });
      },

      ensureChapterGoal: () => {
        const state = get();
        if (state.chapterGoal || !state.project || !state.bible) return;
        const chapterGoal = generateFirstChapterGoal(state.project, state.bible);
        set({ chapterGoal, workflow: workflowWithGoal(chapterGoal) });
      },

      resetProject: () =>
        set({
          project: null,
          bible: null,
          chapterGoal: null,
          workflow: cloneWorkflow(),
          draftVersions: [],
          currentDraftId: null,
          draftParagraphs: [],
          reviewReports: [],
          annotations,
          memoryPacks: [],
          zhuqueReports: [],
          zhuqueLoginQrUrl: "",
          zhuqueLoginMessage: "",
          isLoadingZhuqueQr: false,
          isCheckingZhuque: false,
          candidateProviderTrace: null,
          candidateProviderFallback: [],
        }),

      updateNodeStatus: (id, status) =>
        set((state) => ({
          workflow: state.workflow.map((node) => (node.id === id ? { ...node, status } : node)),
        })),

      completeNode: (id) =>
        set((state) => {
          const nextId = nextNodeById[id];
          return {
            workflow: state.workflow.map((node) => {
              if (node.id === id) return { ...node, status: "passed" };
              if (nextId && node.id === nextId && node.status === "idle") return { ...node, status: "running" };
              if (nextId && node.id === nextId && node.status === "blocked") return { ...node, status: "running" };
              return node;
            }),
          };
        }),

      runWorkflowNode: async (id) => {
        const state = get();
        if (id === "brief") {
          state.ensureChapterGoal();
          set((current) => ({ workflow: setNodeStatus(current.workflow, "brief", "done") }));
          return;
        }

        if (id === "draft" && state.project && state.bible && state.chapterGoal) {
          const draft = await requestDraft({ bible: state.bible, goal: state.chapterGoal, versionNumber: 1 }).catch(() =>
            generateInitialDraft(state.bible!, state.chapterGoal!, 1)
          );
          set((current) => ({
            draftVersions: [...current.draftVersions, draft],
            currentDraftId: draft.id,
            draftParagraphs: draft.paragraphs,
            workflow: updateManyNodes(current.workflow, {
              draft: {
                status: "passed",
                summary: draft.notes,
                output: `V${draft.versionNumber} · ${draft.paragraphs.length} 段`,
                model: draft.model,
                providerTrace: draft.providerTrace,
                providerFallback: draft.providerFallback,
              },
              "audit-b": { status: "running" },
            }),
          }));
          return;
        }

        if (id === "audit-b" && state.chapterGoal) {
          const draft = getCurrentDraft(state);
          if (!draft) return;
          const report = await requestStructureAudit(draft, state.chapterGoal).catch(() => runStructureAudit(draft, state.chapterGoal!));
          set((current) => ({
            reviewReports: upsertById(current.reviewReports, report),
            workflow: updateManyNodes(current.workflow, {
              "audit-b": {
                status: report.passed ? "passed" : "needsFix",
                summary: report.summary,
                output: `${report.score} 分 · ${report.issues.length} 个问题`,
                model: report.model,
                providerTrace: report.providerTrace,
                providerFallback: report.providerFallback,
              },
              "rewrite-a": { status: report.passed ? "idle" : "running" },
              "audit-c": { status: report.passed ? "running" : "idle" },
            }),
          }));
          return;
        }

        if (id === "rewrite-a") {
          const draft = getCurrentDraft(state);
          if (!draft) return;
          const rewriteReports = [...state.reviewReports, ...zhuqueReportsForDraft(state.zhuqueReports, draft)];
          const rewritten = await requestRewrite(draft, rewriteReports, state.annotations).catch(() =>
            rewriteDraft(draft, rewriteReports, state.annotations)
          );
          set((current) => ({
            draftVersions: [...current.draftVersions, rewritten],
            currentDraftId: rewritten.id,
            draftParagraphs: rewritten.paragraphs,
            annotations: current.annotations.map((annotation) =>
              annotation.status === "sent_to_ai" ? { ...annotation, status: "resolved" } : annotation
            ),
            workflow: updateManyNodes(current.workflow, {
              "rewrite-a": {
                status: "passed",
                summary: rewritten.notes,
                output: `生成 V${rewritten.versionNumber}`,
                model: rewritten.model,
                providerTrace: rewritten.providerTrace,
                providerFallback: rewritten.providerFallback,
              },
              "audit-c": { status: "running" },
            }),
          }));
          return;
        }

        if (id === "audit-c") {
          const draft = getCurrentDraft(state);
          if (!draft) return;
          const report = await requestStyleAudit(draft).catch(() => runStyleAudit(draft));
          set((current) => ({
            reviewReports: upsertById(current.reviewReports, report),
            workflow: updateManyNodes(current.workflow, {
              "audit-c": {
                status: report.passed ? "passed" : "needsFix",
                summary: report.summary,
                output: `${report.score} 分 · ${report.issues.length} 个 AI 味问题`,
                model: report.model,
                providerTrace: report.providerTrace,
                providerFallback: report.providerFallback,
              },
              "rewrite-a": {
                status: report.passed ? "idle" : "running",
                summary: report.passed ? "结构返工已完成，等待后续需要时再运行。" : "AI 味审计未通过，回流定向返工。",
              },
              judge: { status: report.passed ? "running" : "idle" },
            }),
          }));
          return;
        }

        if (id === "judge") {
          const draft = getCurrentDraft(state);
          if (!draft) return;
          const report = await requestFinalJudge(draft, state.reviewReports).catch(() => runFinalJudge(draft, state.reviewReports));
          set((current) => ({
            reviewReports: upsertById(current.reviewReports, report),
            workflow: updateManyNodes(current.workflow, {
              judge: {
                status: report.passed ? "passed" : "needsFix",
                summary: report.summary,
                output: `${report.score} 分 · ${report.passed ? "通过" : "需返工"}`,
                model: report.model,
                providerTrace: report.providerTrace,
                providerFallback: report.providerFallback,
              },
              "rewrite-a": {
                status: report.passed ? "idle" : "running",
                summary: report.passed ? "最终验收通过，无需返工。" : "最终验收未通过，回流定向返工。",
              },
              reader: { status: report.passed ? "running" : "idle" },
            }),
          }));
          return;
        }

        if (id === "reader") {
          get().approveReaderDraft();
          return;
        }

        if (id === "zhuque") {
          const draft = getCurrentDraft(state);
          if (!draft) return;
          if (state.isCheckingZhuque) return;

          set((current) => ({
            isCheckingZhuque: true,
            zhuqueLoginMessage: "",
            workflow: updateManyNodes(current.workflow, {
              zhuque: {
                status: "running",
                summary: "正在调用本地 Playwright 后端提交朱雀复测。",
                output: "检测中：等待朱雀返回 AIGC 值和详细报告。",
              },
            }),
          }));

          try {
            const result = await checkZhuqueText({
              title: `${state.project?.title || "未命名作品"}-${draft.chapterId}`,
              chapterId: draft.chapterId,
              draftId: draft.id,
              text: draft.paragraphs.map((paragraph) => paragraph.text).join("\n\n"),
            });
            const report = normalizeZhuqueReport(draft, result);
            set((current) => ({
              zhuqueReports: upsertById(current.zhuqueReports, report),
              workflow: updateManyNodes(current.workflow, zhuqueWorkflowPatch(report)),
            }));
          } catch (error) {
            const report = createFailedZhuqueReport(draft, error);
            set((current) => ({
              zhuqueReports: upsertById(current.zhuqueReports, report),
              workflow: updateManyNodes(current.workflow, {
                zhuque: {
                  status: "blocked",
                  summary: "朱雀本地后端暂不可用，请先启动 zhuque:server 后重试。",
                  output: report.summary,
                },
              }),
            }));
          } finally {
            set({ isCheckingZhuque: false });
          }
          return;
        }

        if (id === "memory" && state.project && state.bible && state.chapterGoal) {
          const draft = getCurrentDraft(state);
          if (!draft) return;
          const memory = await requestMemory({
            project: state.project,
            bible: state.bible,
            goal: state.chapterGoal,
            draft,
          }).catch(() => generateMemoryPack(state.project!, state.bible!, state.chapterGoal!, draft));
          set((current) => ({
            memoryPacks: upsertById(current.memoryPacks, memory),
            workflow: updateManyNodes(current.workflow, {
              memory: {
                status: "done",
                summary: memory.nextChapterBrief,
                output: memory.summary,
                model: memory.model || current.workflow.find((node) => node.id === "memory")?.model,
                providerTrace: memory.providerTrace,
                providerFallback: memory.providerFallback,
              },
            }),
          }));
        }
      },

      addUserAnnotation: (paragraphId, text) =>
        set((state) => ({
          annotations: [
            ...state.annotations,
            {
              id: `ann:${paragraphId}:${Date.now()}`,
              paragraphId,
              text,
              status: "open",
            },
          ],
          draftParagraphs: state.draftParagraphs.map((paragraph) =>
            paragraph.id === paragraphId ? { ...paragraph, hasComment: true } : paragraph
          ),
        })),

      approveReaderDraft: () =>
        set((state) => {
          const openCount = state.annotations.filter((annotation) => annotation.status === "open").length;
          if (openCount > 0) {
            return {
              workflow: updateManyNodes(state.workflow, {
                reader: { status: "blocked", summary: `还有 ${openCount} 条人工批注待处理。` },
                "rewrite-a": { status: "running" },
              }),
            };
          }
          return {
            workflow: updateManyNodes(state.workflow, {
              reader: { status: "passed", summary: "用户读稿通过，进入朱雀复测。" },
              zhuque: { status: "running", summary: "等待提交朱雀检测，确认发布前 AI 风险。" },
            }),
          };
        }),

      createNextChapterFromMemory: () => {
        const state = get();
        if (!state.project || !state.bible || state.memoryPacks.length === 0) return;
        const nextNumber = state.memoryPacks.length + 1;
        const nextProject = {
          ...state.project,
          currentChapterId: `chapter-${String(nextNumber).padStart(3, "0")}`,
        };
        const nextGoal = {
          ...generateFirstChapterGoal(nextProject, state.bible),
          id: `goal:${nextProject.currentChapterId}`,
          chapterId: nextProject.currentChapterId,
          title: `第${nextNumber}章：线索回响`,
          plotGoal: state.memoryPacks[state.memoryPacks.length - 1].nextChapterBrief,
        };
        set({
          project: nextProject,
          chapterGoal: nextGoal,
          workflow: workflowWithGoal(nextGoal),
          draftVersions: [],
          currentDraftId: null,
          draftParagraphs: [],
          reviewReports: [],
          annotations: [],
          zhuqueReports: [],
          zhuqueLoginQrUrl: "",
          zhuqueLoginMessage: "",
          isLoadingZhuqueQr: false,
          isCheckingZhuque: false,
        });
      },

      sendAnnotationsToWorkflow: () =>
        set((state) => ({
          annotations: state.annotations.map((annotation) =>
            annotation.status === "open" ? { ...annotation, status: "sent_to_ai" } : annotation
          ),
          workflow: updateManyNodes(state.workflow, {
            "rewrite-a": { status: "running", summary: "正在处理用户读稿批注，人工意见优先。" },
            zhuque: { status: "idle", summary: "等待返工稿重新完成后再复测。" },
          }),
        })),

      requestZhuqueLoginQr: async () => {
        if (get().isLoadingZhuqueQr || get().isCheckingZhuque) return;
        set({ isLoadingZhuqueQr: true, zhuqueLoginMessage: "正在向朱雀获取微信登录二维码..." });
        try {
          const result = await getZhuqueLoginQr();
          set({
            zhuqueLoginQrUrl: result.qrImageUrl || "",
            zhuqueLoginMessage:
              result.status === "qr_ready" ? "请用微信扫码登录朱雀，成功后重新运行朱雀复测节点。" : result.message || "没有获取到二维码。",
            isLoadingZhuqueQr: false,
          });
        } catch (error) {
          set({
            zhuqueLoginQrUrl: "",
            zhuqueLoginMessage: error instanceof Error ? error.message : "朱雀二维码获取失败。",
            isLoadingZhuqueQr: false,
          });
        }
      },

      saveBackendSnapshot: async () => {
        if (get().isSavingProjectSnapshot) return;
        set({ isSavingProjectSnapshot: true, projectSnapshotMessage: "正在保存项目快照..." });
        try {
          const result = await saveRemoteProjectSnapshot(createProjectSnapshot(get()));
          set({
            isSavingProjectSnapshot: false,
            projectSnapshotSavedAt: result.savedAt,
            projectSnapshotMessage: result.savedAt ? `已保存快照：${formatSnapshotTime(result.savedAt)}` : "已保存快照",
          });
        } catch (error) {
          set({
            isSavingProjectSnapshot: false,
            projectSnapshotMessage: error instanceof Error ? error.message : "项目快照保存失败",
          });
        }
      },

      loadBackendSnapshot: async () => {
        if (get().isLoadingProjectSnapshot) return false;
        set({ isLoadingProjectSnapshot: true, projectSnapshotMessage: "正在读取项目快照..." });
        try {
          const result = await getProjectSnapshot();
          if (!result.snapshot) {
            set({
              isLoadingProjectSnapshot: false,
              projectSnapshotSavedAt: null,
              projectSnapshotMessage: "后端暂无项目快照",
            });
            return false;
          }
          set((current) => ({
            ...applyProjectSnapshot(result.snapshot!, current),
            isLoadingProjectSnapshot: false,
            projectSnapshotSavedAt: result.savedAt,
            projectSnapshotMessage: result.savedAt ? `已恢复快照：${formatSnapshotTime(result.savedAt)}` : "已恢复快照",
          }));
          return true;
        } catch (error) {
          set({
            isLoadingProjectSnapshot: false,
            projectSnapshotMessage: error instanceof Error ? error.message : "项目快照读取失败",
          });
          return false;
        }
      },

      deleteBackendSnapshot: async () => {
        set({ isSavingProjectSnapshot: true, projectSnapshotMessage: "正在删除后端快照..." });
        try {
          await deleteRemoteProjectSnapshot();
          set({
            isSavingProjectSnapshot: false,
            projectSnapshotSavedAt: null,
            projectSnapshotMessage: "后端快照已删除",
          });
        } catch (error) {
          set({
            isSavingProjectSnapshot: false,
            projectSnapshotMessage: error instanceof Error ? error.message : "后端快照删除失败",
          });
        }
      },

      dismissTutorial: () => set({ tutorialDismissed: true }),
      restartTutorial: () => set({ tutorialDismissed: false }),
    }),
    {
      name: "inkwell-2-project-state",
      version: 4,
      partialize: (state) => createPersistedBrowserState(state),
      migrate: (persisted) => {
        const state = persisted as Partial<ProjectState>;
        return {
          ...state,
          workflow: normalizeWorkflow(state.workflow),
          promptPresets: mergePromptPresets(state.promptPresets),
          zhuqueReports: state.zhuqueReports || [],
          zhuqueLoginQrUrl: state.zhuqueLoginQrUrl || "",
          zhuqueLoginMessage: state.zhuqueLoginMessage || "",
          isLoadingZhuqueQr: false,
          isCheckingZhuque: false,
          isSavingProjectSnapshot: false,
          isLoadingProjectSnapshot: false,
          projectSnapshotMessage: state.projectSnapshotMessage || "",
          projectSnapshotSavedAt: state.projectSnapshotSavedAt || null,
          tutorialDismissed: state.tutorialDismissed ?? false,
          candidateProviderTrace: state.candidateProviderTrace || null,
          candidateProviderFallback: state.candidateProviderFallback || [],
        };
      },
    }
  )
);

function cloneWorkflow() {
  return workflow.map((node) => ({ ...node }));
}

function normalizeWorkflow(savedNodes?: WorkflowNodeData[]) {
  if (!savedNodes?.length) return cloneWorkflow();
  const savedById = new Map(savedNodes.map((node) => [node.id, node]));
  return workflow.map((node) => ({ ...node, ...savedById.get(node.id) }));
}

function mergePromptPresets(savedPresets?: PromptPreset[]) {
  if (!savedPresets?.length) return defaultPromptPresets;
  const savedById = new Map(savedPresets.map((preset) => [preset.id, preset]));
  return defaultPromptPresets.map((preset) => ({ ...preset, ...savedById.get(preset.id) }));
}

function createPersistedBrowserState(state: ProjectState): Partial<ProjectState> {
  return {
    mode: state.mode,
    genre: state.genre,
    spark: state.spark,
    selectedCandidateId: state.selectedCandidateId,
    candidates: state.candidates,
    candidateProviderTrace: state.candidateProviderTrace,
    candidateProviderFallback: state.candidateProviderFallback,
    project: state.project,
    bible: state.bible,
    chapterGoal: state.chapterGoal,
    workflow: state.workflow,
    draftVersions: state.draftVersions,
    currentDraftId: state.currentDraftId,
    draftParagraphs: state.draftParagraphs,
    reviewReports: state.reviewReports,
    annotations: state.annotations,
    memoryPacks: state.memoryPacks,
    promptPresets: state.promptPresets,
    zhuqueReports: state.zhuqueReports,
    tutorialDismissed: state.tutorialDismissed,
    projectSnapshotSavedAt: state.projectSnapshotSavedAt,
  };
}

function createProjectSnapshot(state: ProjectState): ProjectSnapshot {
  return {
    schemaVersion: 1,
    savedFrom: "frontend",
    mode: state.mode,
    genre: state.genre,
    spark: state.spark,
    selectedCandidateId: state.selectedCandidateId,
    candidates: state.candidates,
    candidateProviderTrace: state.candidateProviderTrace,
    candidateProviderFallback: state.candidateProviderFallback,
    project: state.project,
    bible: state.bible,
    chapterGoal: state.chapterGoal,
    workflow: state.workflow,
    draftVersions: state.draftVersions,
    currentDraftId: state.currentDraftId,
    draftParagraphs: state.draftParagraphs,
    reviewReports: state.reviewReports,
    annotations: state.annotations,
    memoryPacks: state.memoryPacks,
    promptPresets: state.promptPresets,
    zhuqueReports: state.zhuqueReports,
  };
}

function applyProjectSnapshot(snapshot: ProjectSnapshot, current: ProjectState): Partial<ProjectState> {
  const nextCandidates = snapshot.candidates?.length ? snapshot.candidates : current.candidates;
  const currentDraftId =
    snapshot.currentDraftId && snapshot.draftVersions?.some((draft) => draft.id === snapshot.currentDraftId)
      ? snapshot.currentDraftId
      : snapshot.draftVersions?.at(-1)?.id || null;
  const draftParagraphs =
    snapshot.draftParagraphs?.length || !currentDraftId
      ? snapshot.draftParagraphs || []
      : snapshot.draftVersions.find((draft) => draft.id === currentDraftId)?.paragraphs || [];
  return {
    mode: snapshot.mode || current.mode,
    genre: snapshot.genre || current.genre,
    spark: snapshot.spark || current.spark,
    selectedCandidateId: snapshot.selectedCandidateId || nextCandidates[0]?.id || "",
    candidates: nextCandidates,
    candidateProviderTrace: snapshot.candidateProviderTrace || null,
    candidateProviderFallback: snapshot.candidateProviderFallback || [],
    project: snapshot.project || null,
    bible: snapshot.bible || null,
    chapterGoal: snapshot.chapterGoal || null,
    workflow: normalizeWorkflow(snapshot.workflow),
    draftVersions: snapshot.draftVersions || [],
    currentDraftId,
    draftParagraphs,
    reviewReports: snapshot.reviewReports || [],
    annotations: snapshot.annotations || [],
    memoryPacks: snapshot.memoryPacks || [],
    promptPresets: mergePromptPresets(snapshot.promptPresets),
    zhuqueReports: snapshot.zhuqueReports || [],
    zhuqueLoginQrUrl: "",
    zhuqueLoginMessage: "",
    isLoadingZhuqueQr: false,
    isCheckingZhuque: false,
  };
}

function formatSnapshotTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function workflowWithGoal(goal: ChapterGoal): WorkflowNodeData[] {
  return cloneWorkflow().map((node) => ({
    ...node,
    status: node.id === "brief" ? ("done" as WorkflowStatus) : node.id === "draft" ? ("running" as WorkflowStatus) : ("idle" as WorkflowStatus),
    summary: node.id === "brief" ? goal.plotGoal : node.summary,
    output: node.id === "brief" ? `${goal.title}｜${goal.conflictGoal}` : undefined,
  }));
}

function getCurrentDraft(state: ProjectState) {
  return state.draftVersions.find((draft) => draft.id === state.currentDraftId) || state.draftVersions.at(-1) || null;
}

function setNodeStatus(nodes: WorkflowNodeData[], id: string, status: WorkflowStatus) {
  return nodes.map((node) => (node.id === id ? { ...node, status } : node));
}

function updateManyNodes(
  nodes: WorkflowNodeData[],
  patches: Record<
    string,
    Partial<Pick<WorkflowNodeData, "status" | "summary" | "output" | "model" | "providerTrace" | "providerFallback">>
  >
) {
  return nodes.map((node) => (patches[node.id] ? { ...node, ...patches[node.id] } : node));
}

function upsertById<T extends { id: string }>(items: T[], item: T) {
  const exists = items.some((existing) => existing.id === item.id);
  return exists ? items.map((existing) => (existing.id === item.id ? item : existing)) : [...items, item];
}

function normalizeZhuqueReport(draft: DraftVersion, result: ZhuqueCheckResponse): ZhuqueReport {
  return {
    id: `zhuque:${draft.id}`,
    chapterId: draft.chapterId,
    draftId: draft.id,
    status: result.status,
    aigcScore: result.aigcScore,
    aiPercent: result.aiPercent,
    verdict: result.verdict,
    summary: result.summary,
    remainingDaily: result.remainingDaily,
    reportScreenshotUrl: result.reportScreenshotUrl,
    reportHtmlUrl: result.reportHtmlUrl,
    reportScreenshotPath: result.reportScreenshotPath,
    reportHtmlPath: result.reportHtmlPath,
    reportText: result.reportText,
    checkedAt: Date.now(),
  };
}

function createFailedZhuqueReport(draft: DraftVersion, error: unknown): ZhuqueReport {
  const message = error instanceof Error ? error.message : "未知错误";
  return {
    id: `zhuque:${draft.id}`,
    chapterId: draft.chapterId,
    draftId: draft.id,
    status: "failed",
    aigcScore: null,
    aiPercent: null,
    verdict: "朱雀检测失败",
    summary: message,
    remainingDaily: null,
    checkedAt: Date.now(),
  };
}

function zhuqueReportsForDraft(reports: ZhuqueReport[], draft: DraftVersion): ReviewReport[] {
  return reports
    .filter((report) => report.draftId === draft.id && report.status === "ai_risk")
    .map((report) => zhuqueReportToReviewReport(report, draft));
}

function zhuqueReportToReviewReport(report: ZhuqueReport, draft: DraftVersion): ReviewReport {
  const targetParagraphId = draft.paragraphs[0]?.id || "p001";
  const scoreLabel = report.aiPercent === null ? "未取得 AIGC 百分比" : `${report.aiPercent.toFixed(2)}%`;
  const reportDetail = [report.summary, report.verdict, report.reportText].filter(Boolean).join("\n").slice(0, 1200);
  return {
    id: `review:zhuque:${report.id}`,
    chapterId: draft.chapterId,
    nodeId: "zhuque",
    model: "朱雀复测",
    score: report.aiPercent === null ? 0 : Math.max(0, Math.min(100, 100 - report.aiPercent)),
    passed: false,
    summary: `朱雀复测显示 AI 特征偏高：${scoreLabel}。`,
    issues: [
      {
        id: `issue:zhuque:${report.id}`,
        paragraphId: targetParagraphId,
        category: "AI味审计",
        severity: "high",
        problem: `朱雀复测 AI 风险偏高：${scoreLabel}。${reportDetail}`,
        suggestion: "按朱雀报告做降痕改写，优先增加具体动作、物件细节、人物犹豫和不均匀句式。",
        fixInstruction: `根据朱雀复测结果降低 AI 味。保留章节事实，重写高风险表达，避免总结腔和均匀句式。朱雀报告：${reportDetail}`,
      },
    ],
    createdAt: report.checkedAt,
  };
}

function zhuqueWorkflowPatch(
  report: ZhuqueReport
): Record<string, Partial<Pick<WorkflowNodeData, "status" | "summary" | "output">>> {
  const scoreLabel = report.aiPercent === null ? "未取得分数" : `${report.aiPercent.toFixed(2)}%`;

  if (report.status === "passed") {
    return {
      zhuque: {
        status: "passed" as WorkflowStatus,
        summary: `朱雀复测通过，AI 特征 ${scoreLabel}。`,
        output: report.verdict,
      },
      memory: { status: "running" as WorkflowStatus },
    };
  }

  if (report.status === "ai_risk") {
    return {
      zhuque: {
        status: "needsFix" as WorkflowStatus,
        summary: `朱雀复测显示 AI 特征偏高：${scoreLabel}。`,
        output: "回流 A 模型做降痕改写，再重新审计。",
      },
      "rewrite-a": {
        status: "running" as WorkflowStatus,
        summary: "根据朱雀片段报告进行降 AI 味返工。",
      },
    };
  }

  if (report.status === "quota_exhausted" || report.status === "needs_login") {
    return {
      zhuque: {
        status: "blocked" as WorkflowStatus,
        summary: "匿名额度不足，需要扫码登录朱雀后继续检测。",
        output: report.summary,
      },
    };
  }

  return {
    zhuque: {
      status: "blocked" as WorkflowStatus,
      summary: "朱雀检测失败，请检查本地后端或稍后重试。",
      output: report.summary,
    },
  };
}
