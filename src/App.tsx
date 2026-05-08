import { useEffect, useState } from "react";
import { BookMarked, GitBranch, HelpCircle, Home, RefreshCw, Save, Settings, Trash2, Upload } from "lucide-react";
import { CreationPanel } from "./components/CreationPanel";
import { OnboardingTour } from "./components/OnboardingTour";
import { PromptPanel } from "./components/PromptPanel";
import { ReaderReview } from "./components/ReaderReview";
import { WorkflowCanvas } from "./components/WorkflowCanvas";
import { Workspace } from "./components/Workspace";
import { getRuntimeLabel } from "./lib/desktop";
import { useProjectStore } from "./store/useProjectStore";

type View = "create" | "workspace" | "workflow" | "reader" | "prompts";

export function App() {
  const [view, setView] = useState<View>("create");
  const [runtime, setRuntime] = useState("browser-preview");
  const {
    mode,
    setMode,
    genre,
    setGenre,
    spark,
    setSpark,
    selectedCandidateId,
    selectCandidate,
    candidates,
    candidateProviderTrace,
    candidateProviderFallback,
    candidateProviderSource,
    candidateProviderMessage,
    generateStoryCandidates,
    project,
    bible,
    chapterGoal,
    workflow,
    draftVersions,
    currentDraftId,
    draftParagraphs,
    reviewReports,
    annotations,
    memoryPacks,
    promptPresets,
    zhuqueReports,
    zhuqueLoginQrUrl,
    zhuqueLoginMessage,
    isLoadingZhuqueQr,
    isSavingProjectSnapshot,
    isLoadingProjectSnapshot,
    projectSnapshotMessage,
    tutorialDismissed,
    createProjectFromCandidate,
    resetProject,
    runWorkflowNode,
    addUserAnnotation,
    approveReaderDraft,
    createNextChapterFromMemory,
    sendAnnotationsToWorkflow,
    requestZhuqueLoginQr,
    saveBackendSnapshot,
    loadBackendSnapshot,
    deleteBackendSnapshot,
    ensureBible,
    ensureChapterGoal,
    dismissTutorial,
    restartTutorial,
  } = useProjectStore();

  useEffect(() => {
    getRuntimeLabel().then(setRuntime);
  }, []);

  useEffect(() => {
    ensureBible();
  }, [ensureBible]);

  useEffect(() => {
    ensureChapterGoal();
  }, [ensureChapterGoal]);

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="brand">
          <span>墨</span>
          <div>
            <strong>墨池 2.0</strong>
            <small>AI 小说生产线</small>
          </div>
        </div>
        <nav>
          <button className={view === "create" ? "active" : ""} onClick={() => setView("create")}>
            <Home size={18} />
            创作入口
          </button>
          <button className={view === "workspace" ? "active" : ""} onClick={() => setView("workspace")}>
            <BookMarked size={18} />
            作品驾驶舱
          </button>
          <button className={view === "workflow" ? "active" : ""} onClick={() => setView("workflow")}>
            <GitBranch size={18} />
            章节工作流
          </button>
          <button className={view === "prompts" ? "active" : ""} onClick={() => setView("prompts")}>
            <Settings size={18} />
            模型与提示词
          </button>
        </nav>
        <div className="sidebar-note">
          <span>默认分工</span>
          <strong>DeepSeek 写作 · MiniMax 去 AI 味 · GPT/Codex 审计验收</strong>
          <small>运行环境：{runtime}</small>
          <button className="sidebar-reset" onClick={resetProject}>
            <RefreshCw size={14} />
            重置原型
          </button>
          <button className="sidebar-reset" onClick={saveBackendSnapshot} disabled={isSavingProjectSnapshot}>
            <Save size={14} />
            保存快照
          </button>
          <button
            className="sidebar-reset"
            onClick={async () => {
              const restored = await loadBackendSnapshot();
              if (restored) setView("workspace");
            }}
            disabled={isLoadingProjectSnapshot}
          >
            <Upload size={14} />
            恢复快照
          </button>
          <button
            className="sidebar-reset"
            onClick={() => {
              if (window.confirm("删除后端项目快照？当前浏览器里的项目不会被清空。")) {
                deleteBackendSnapshot();
              }
            }}
            disabled={isSavingProjectSnapshot}
          >
            <Trash2 size={14} />
            删除快照
          </button>
          <button className="sidebar-reset" onClick={restartTutorial}>
            <HelpCircle size={14} />
            新手教学
          </button>
          {projectSnapshotMessage && <small>{projectSnapshotMessage}</small>}
        </div>
      </aside>

      <main className="app-main">
        {view === "create" && (
          <CreationPanel
            mode={mode}
            genre={genre}
            spark={spark}
            onModeChange={setMode}
            onGenreChange={setGenre}
            onSparkChange={setSpark}
            onGenerate={generateStoryCandidates}
            selectedId={selectedCandidateId}
            onSelect={selectCandidate}
            onStart={async () => {
              await createProjectFromCandidate();
              setView("workspace");
            }}
            candidates={candidates}
            providerTrace={candidateProviderTrace}
            providerFallback={candidateProviderFallback}
            providerSource={candidateProviderSource}
            providerMessage={candidateProviderMessage}
          />
        )}
        {view === "workspace" && project && (
          <Workspace
            project={project}
            bible={bible}
            workflow={workflow}
            memoryPacks={memoryPacks}
            onOpenWorkflow={() => setView("workflow")}
            onOpenReader={() => setView("reader")}
            onCreateNextChapter={createNextChapterFromMemory}
          />
        )}
        {view === "workspace" && !project && (
          <CreationPanel
            mode={mode}
            genre={genre}
            spark={spark}
            onModeChange={setMode}
            onGenreChange={setGenre}
            onSparkChange={setSpark}
            onGenerate={generateStoryCandidates}
            selectedId={selectedCandidateId}
            onSelect={selectCandidate}
            onStart={async () => {
              await createProjectFromCandidate();
              setView("workspace");
            }}
            candidates={candidates}
            providerTrace={candidateProviderTrace}
            providerFallback={candidateProviderFallback}
            providerSource={candidateProviderSource}
            providerMessage={candidateProviderMessage}
          />
        )}
        {view === "workflow" && (
          <WorkflowCanvas
            nodes={workflow}
            chapterGoal={chapterGoal}
            draftVersions={draftVersions}
            currentDraftId={currentDraftId}
            reviewReports={reviewReports}
            memoryPacks={memoryPacks}
            zhuqueReports={zhuqueReports}
            zhuqueLoginQrUrl={zhuqueLoginQrUrl}
            zhuqueLoginMessage={zhuqueLoginMessage}
            isLoadingZhuqueQr={isLoadingZhuqueQr}
            promptPresets={promptPresets}
            onOpenReader={() => setView("reader")}
            onRunNode={runWorkflowNode}
            onRequestZhuqueLoginQr={requestZhuqueLoginQr}
          />
        )}
        {view === "reader" && (
          <ReaderReview
            paragraphs={draftParagraphs}
            annotations={annotations}
            onBack={() => setView("workflow")}
            onAddAnnotation={addUserAnnotation}
            onApprove={() => {
              approveReaderDraft();
              setView("workflow");
            }}
            onSendAnnotations={() => {
              sendAnnotationsToWorkflow();
              setView("workflow");
            }}
          />
        )}
        {view === "prompts" && <PromptPanel presets={promptPresets} />}
      </main>
      {!tutorialDismissed && <OnboardingTour onClose={dismissTutorial} onNavigate={setView} />}
    </div>
  );
}
