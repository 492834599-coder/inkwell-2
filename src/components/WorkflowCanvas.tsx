import { Background, Controls, Handle, MarkerType, Position, ReactFlow, type Edge, type Node } from "@xyflow/react";
import { AlertTriangle, CheckCircle2, Circle, Clock, PenLine, Play, QrCode, RotateCcw, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { ProviderDebugPanel } from "./ProviderDebugPanel";
import type {
  ChapterGoal,
  DraftVersion,
  MemoryPack,
  ProviderTrace,
  PromptPreset,
  ReviewReport,
  WorkflowNodeData,
  WorkflowStatus,
  ZhuqueReport,
} from "../types/domain";

interface WorkflowCanvasProps {
  nodes: WorkflowNodeData[];
  chapterGoal: ChapterGoal | null;
  draftVersions: DraftVersion[];
  currentDraftId: string | null;
  reviewReports: ReviewReport[];
  memoryPacks: MemoryPack[];
  zhuqueReports: ZhuqueReport[];
  zhuqueLoginQrUrl: string;
  zhuqueLoginMessage: string;
  isLoadingZhuqueQr: boolean;
  promptPresets: PromptPreset[];
  onOpenReader: () => void;
  onRunNode: (id: string) => void;
  onRequestZhuqueLoginQr: () => void;
}

const statusIcons: Record<WorkflowStatus, React.ReactNode> = {
  idle: <Circle size={15} />,
  running: <Clock size={15} />,
  needsFix: <AlertTriangle size={15} />,
  passed: <CheckCircle2 size={15} />,
  blocked: <AlertTriangle size={15} />,
  done: <CheckCircle2 size={15} />,
};

type FlowNodeData = WorkflowNodeData & Record<string, unknown>;

function WorkNode({ data }: { data: FlowNodeData }) {
  const trace = data.providerTrace;
  return (
    <article className={`work-node status-${data.status}`}>
      <Handle type="target" position={Position.Left} />
      <div className="work-node-top">
        <span>{statusIcons[data.status]}</span>
        <strong>{data.label}</strong>
      </div>
      <p>{data.summary}</p>
      <div className="node-meta">
        <span>{formatModelLabel(data.model, trace)}</span>
        {trace && <span>{formatLatency(trace.latencyMs)}</span>}
        {hasProviderFallback(data.providerFallback, trace) && <span>fallback</span>}
        <span>{data.status}</span>
      </div>
      <Handle type="source" position={Position.Right} />
    </article>
  );
}

const nodeTypes = { workNode: WorkNode };

export function WorkflowCanvas({
  nodes,
  chapterGoal,
  draftVersions,
  currentDraftId,
  reviewReports,
  memoryPacks,
  zhuqueReports,
  zhuqueLoginQrUrl,
  zhuqueLoginMessage,
  isLoadingZhuqueQr,
  promptPresets,
  onOpenReader,
  onRunNode,
  onRequestZhuqueLoginQr,
}: WorkflowCanvasProps) {
  const [selectedNodeId, setSelectedNodeId] = useState(nodes[0]?.id || "");
  const selectedNode = nodes.find((node) => node.id === selectedNodeId) || nodes[0];
  const currentDraft = draftVersions.find((draft) => draft.id === currentDraftId) || draftVersions.at(-1) || null;
  const selectedReports = reviewReports.filter((report) => report.nodeId === selectedNode?.id);
  const selectedPrompt = promptPresets.find((preset) => preset.nodeId === selectedNode?.id);
  const latestMemory = memoryPacks.at(-1) || null;
  const providerRefreshKey = nodes
    .map((node) => `${node.id}:${node.providerTrace?.latencyMs || 0}:${node.providerTrace?.fallback ? "fallback" : "live"}`)
    .join("|");
  const currentChapterId = currentDraft?.chapterId || chapterGoal?.chapterId || null;
  const currentZhuqueReport =
    (currentDraft ? zhuqueReports.find((report) => report.draftId === currentDraft.id) : null) ||
    (!currentDraft && currentChapterId
      ? zhuqueReports.filter((report) => report.chapterId === currentChapterId).at(-1) || null
      : null);
  const workflowStats = [
    { label: "运行中", value: nodes.filter((node) => node.status === "running").length },
    { label: "需处理", value: nodes.filter((node) => node.status === "needsFix" || node.status === "blocked").length },
    { label: "已通过", value: nodes.filter((node) => node.status === "passed" || node.status === "done").length },
    { label: "当前稿", value: currentDraft ? `V${currentDraft.versionNumber}` : "未生成" },
  ];
  const flowNodes: Node<FlowNodeData>[] = useMemo(
    () =>
      nodes.map((node, index) => ({
        id: node.id,
        type: "workNode",
        position: { x: (index % 4) * 330, y: Math.floor(index / 4) * 230 },
        data: { ...node },
        selected: node.id === selectedNodeId,
      })),
    [nodes, selectedNodeId]
  );

  const edges: Edge[] = [
    edge("brief", "draft"),
    edge("draft", "audit-b"),
    edge("audit-b", "rewrite-a", true),
    edge("rewrite-a", "audit-c"),
    edge("audit-c", "judge", true),
    edge("judge", "reader"),
    edge("reader", "rewrite-a", true, "用户批注回流"),
    edge("reader", "zhuque"),
    edge("zhuque", "rewrite-a", true, "AI 率偏高回流"),
    edge("zhuque", "memory"),
  ];

  return (
    <section className="workflow-page">
      <header className="section-header">
        <div>
          <span className="eyebrow">章节工作流</span>
          <h1>第一章：午夜诊所</h1>
          <p>A 写作、B 结构审计、C AI 味审计、用户读稿和朱雀复测形成闭环，直到用户满意且 AI 风险可控。</p>
        </div>
        <div className="header-actions">
          <button className="secondary-action">
            <RotateCcw size={17} />
            重跑当前节点
          </button>
          <button className="primary-action" onClick={onOpenReader}>
            <PenLine size={17} />
            进入读稿
          </button>
        </div>
      </header>
      <div className="workflow-overview" aria-label="工作流概览">
        {workflowStats.map((item) => (
          <div className="workflow-stat" key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
      <div className="flow-shell">
        <ReactFlow
          nodes={flowNodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          onNodeClick={(_, node) => setSelectedNodeId(node.id)}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#d7d2c5" gap={28} size={1} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
      <ProviderDebugPanel refreshKey={providerRefreshKey} />
      {selectedNode && (
        <aside className="node-detail-panel">
          <span className="eyebrow">节点详情</span>
          <h2>{selectedNode.label}</h2>
          <div className="detail-grid">
            <span>模型</span>
            <strong>{selectedNode.model}</strong>
            {selectedNode.providerTrace && (
              <>
                <span>Provider</span>
                <strong>{formatProviderLabel(selectedNode.providerTrace)}</strong>
                <span>Latency</span>
                <strong>{formatLatency(selectedNode.providerTrace.latencyMs)}</strong>
                <span>Fallback</span>
                <strong>{hasProviderFallback(selectedNode.providerFallback, selectedNode.providerTrace) ? "yes" : "no"}</strong>
              </>
            )}
            <span>状态</span>
            <strong>{selectedNode.status}</strong>
            <span>角色</span>
            <strong>{selectedNode.role}</strong>
          </div>
          <div className="detail-block">
            <strong>Prompt 重点</strong>
            <p>{selectedNode.promptFocus}</p>
          </div>
          <div className="detail-block">
            <strong>最近输出</strong>
            <p>{selectedNode.output || selectedNode.summary}</p>
          </div>
          {selectedNode.providerTrace && <ProviderTraceBlock trace={selectedNode.providerTrace} fallback={selectedNode.providerFallback} />}
          {selectedNode.id === "brief" && chapterGoal && <ChapterGoalDetail goal={chapterGoal} />}
          {selectedNode.id === "draft" && currentDraft && <DraftArtifact draft={currentDraft} />}
          {selectedReports.length > 0 && <ReviewArtifact reports={selectedReports} />}
          {selectedNode.id === "zhuque" && (
            <ZhuqueArtifact
              report={currentZhuqueReport}
              hasDraft={Boolean(currentDraft)}
              loginQrUrl={zhuqueLoginQrUrl}
              loginMessage={zhuqueLoginMessage}
              isLoadingLoginQr={isLoadingZhuqueQr}
              onRequestLoginQr={onRequestZhuqueLoginQr}
              onRetry={() => onRunNode("zhuque")}
            />
          )}
          {selectedNode.id === "memory" && latestMemory && <MemoryArtifact memory={latestMemory} />}
          {selectedPrompt && (
            <div className="detail-block">
              <strong>Prompt 模板</strong>
              <p>{selectedPrompt.template}</p>
            </div>
          )}
          <button className="primary-action wide" onClick={() => onRunNode(selectedNode.id)}>
            <Play size={17} />
            运行此节点
          </button>
        </aside>
      )}
    </section>
  );
}

function DraftArtifact({ draft }: { draft: DraftVersion }) {
  return (
    <div className="detail-mini-list">
      <strong>当前正文版本</strong>
      <span>V{draft.versionNumber} · {draft.model}</span>
      {draft.providerTrace && <span>{formatProviderLabel(draft.providerTrace)} · {formatLatency(draft.providerTrace.latencyMs)}</span>}
      <span>{draft.notes}</span>
      <span>{draft.paragraphs.length} 个段落已生成，可进入读稿页查看。</span>
    </div>
  );
}

function ReviewArtifact({ reports }: { reports: ReviewReport[] }) {
  const latest = reports.at(-1);
  if (!latest) return null;
  return (
    <div className="detail-mini-list">
      <strong>审计报告</strong>
      <span>{latest.model}</span>
      {latest.providerTrace && <span>{formatProviderLabel(latest.providerTrace)} · {formatLatency(latest.providerTrace.latencyMs)}</span>}
      <span>{latest.score} 分 · {latest.passed ? "通过" : "需返工"}</span>
      <span>{latest.summary}</span>
      {latest.issues.map((issue) => (
        <span key={issue.id}>{issue.paragraphId}｜{issue.problem}</span>
      ))}
    </div>
  );
}

function ZhuqueArtifact({
  report,
  hasDraft,
  loginQrUrl,
  loginMessage,
  isLoadingLoginQr,
  onRequestLoginQr,
  onRetry,
}: {
  report: ZhuqueReport | null;
  hasDraft: boolean;
  loginQrUrl: string;
  loginMessage: string;
  isLoadingLoginQr: boolean;
  onRequestLoginQr: () => void;
  onRetry: () => void;
}) {
  const score = report?.aiPercent === null || !report ? "未取得" : `${report.aiPercent.toFixed(2)}%`;
  const canRequestLogin = report?.status === "needs_login" || report?.status === "quota_exhausted" || report?.status === "failed";

  return (
    <div className="zhuque-artifact">
      <div className="zhuque-score">
        <span>
          <ShieldCheck size={18} />
          朱雀 AIGC 值
        </span>
        <strong>{score}</strong>
      </div>
      {report ? (
        <div className="detail-mini-list">
          <span>{report.verdict}</span>
          <span>{report.summary}</span>
          {report.remainingDaily !== null && <span>今日剩余额度：{report.remainingDaily} 次</span>}
        </div>
      ) : (
        <div className="detail-mini-list">
          <span>{hasDraft ? "当前稿件还没有朱雀复测报告。" : "请先生成当前章节稿件，再运行朱雀复测。"}</span>
        </div>
      )}
      {report && (report.reportScreenshotUrl || report.reportHtmlUrl) && (
        <div className="artifact-links">
          {report.reportScreenshotUrl && (
            <a href={report.reportScreenshotUrl} target="_blank" rel="noreferrer">
              打开报告截图
            </a>
          )}
          {report.reportHtmlUrl && (
            <a href={report.reportHtmlUrl} target="_blank" rel="noreferrer">
              打开报告 HTML
            </a>
          )}
        </div>
      )}
      <div className="zhuque-actions">
        <button className="secondary-action" onClick={onRetry} disabled={!hasDraft}>
          <RotateCcw size={16} />
          重试复测
        </button>
        <button className="secondary-action" onClick={onRequestLoginQr} disabled={isLoadingLoginQr || !canRequestLogin}>
          <QrCode size={16} />
          {isLoadingLoginQr ? "获取中" : "登录二维码"}
        </button>
      </div>
      {(loginMessage || loginQrUrl) && (
        <div className="zhuque-login-card">
          {loginMessage && <span>{loginMessage}</span>}
          {loginQrUrl && <img src={loginQrUrl} alt="朱雀登录二维码" />}
        </div>
      )}
    </div>
  );
}

function MemoryArtifact({ memory }: { memory: MemoryPack }) {
  return (
    <div className="detail-mini-list">
      <strong>最新记忆包</strong>
      {memory.model && <span>{memory.model}</span>}
      {memory.providerTrace && <span>{formatProviderLabel(memory.providerTrace)} · {formatLatency(memory.providerTrace.latencyMs)}</span>}
      <span>{memory.summary}</span>
      <span>下一章：{memory.nextChapterBrief}</span>
    </div>
  );
}

function ChapterGoalDetail({ goal }: { goal: ChapterGoal }) {
  return (
    <div className="chapter-goal-detail">
      <div className="detail-block">
        <strong>章节标题</strong>
        <p>{goal.title}</p>
      </div>
      <div className="detail-block">
        <strong>情绪目标</strong>
        <p>{goal.emotionalGoal}</p>
      </div>
      <div className="detail-block">
        <strong>冲突目标</strong>
        <p>{goal.conflictGoal}</p>
      </div>
      <div className="detail-mini-list">
        <strong>必须出现</strong>
        {goal.mustInclude.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
      <div className="detail-mini-list">
        <strong>审计重点</strong>
        {goal.auditFocus.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
    </div>
  );
}

function ProviderTraceBlock({ trace, fallback }: { trace: ProviderTrace; fallback?: string[] }) {
  const errors = trace.errors.length ? trace.errors : fallback || [];
  return (
    <div className="detail-mini-list">
      <strong>Provider trace</strong>
      <span>{formatProviderLabel(trace)} · {formatLatency(trace.latencyMs)}</span>
      {trace.attempts.slice(0, 3).map((attempt) => (
        <span key={`${attempt.at}-${attempt.providerId}`}>
          {attempt.providerId} · {attempt.status} · {formatLatency(attempt.latencyMs)}
        </span>
      ))}
      {errors.slice(0, 2).map((error) => (
        <span key={error}>{error}</span>
      ))}
    </div>
  );
}

function edge(source: string, target: string, animated = false, label?: string): Edge {
  return {
    id: `${source}-${target}`,
    source,
    target,
    animated,
    label,
    markerEnd: { type: MarkerType.ArrowClosed },
    style: { strokeWidth: 2, stroke: animated ? "#a84c2d" : "#71675d" },
  };
}

function formatModelLabel(model: string, trace?: ProviderTrace) {
  if (!trace?.provider || !trace.model) return model;
  return `${trace.provider}/${trace.model}`;
}

function formatProviderLabel(trace: ProviderTrace) {
  if (!trace.provider && !trace.model) return "local";
  if (!trace.provider) return trace.model || "unknown";
  if (!trace.model) return trace.provider;
  return `${trace.provider}/${trace.model}`;
}

function formatLatency(latencyMs: number) {
  if (!Number.isFinite(latencyMs) || latencyMs <= 0) return "0ms";
  if (latencyMs < 1000) return `${Math.round(latencyMs)}ms`;
  return `${(latencyMs / 1000).toFixed(1)}s`;
}

function hasProviderFallback(fallback: string[] | undefined, trace?: ProviderTrace) {
  return Boolean(trace?.fallback || fallback?.length);
}
