import { BookOpen, BrainCircuit, CheckCircle2, GitBranch, ListChecks } from "lucide-react";
import type { MemoryPack, NovelProject, ProjectBible, WorkflowNodeData } from "../types/domain";

interface WorkspaceProps {
  project: NovelProject;
  bible: ProjectBible | null;
  workflow: WorkflowNodeData[];
  memoryPacks: MemoryPack[];
  onOpenWorkflow: () => void;
  onOpenReader: () => void;
  onCreateNextChapter: () => void;
}

export function Workspace({ project, bible, workflow, memoryPacks, onOpenWorkflow, onOpenReader, onCreateNextChapter }: WorkspaceProps) {
  const needsFix = workflow.filter((node) => node.status === "needsFix").length;
  const running = workflow.find((node) => node.status === "running");
  const latestMemory = memoryPacks.at(-1);

  return (
    <section className="workspace">
      <div className="workspace-hero">
        <div className="novel-mark">
          <span>墨</span>
        </div>
        <div>
          <span className="eyebrow">作品驾驶舱</span>
          <h1>{project.title}</h1>
          <p>{project.logline}</p>
        </div>
        <div className="hero-actions">
          <button className="secondary-action" onClick={onOpenReader}>
            <BookOpen size={17} />
            读稿批注
          </button>
          <button className="primary-action" onClick={onOpenWorkflow}>
            <GitBranch size={17} />
            查看工作流
          </button>
        </div>
      </div>

      <div className="metric-strip">
        <Metric icon={<BrainCircuit size={18} />} label="当前执行" value={running?.label || "等待用户读稿"} />
        <Metric icon={<ListChecks size={18} />} label="待修阻断" value={`${needsFix} 项`} />
        <Metric icon={<CheckCircle2 size={18} />} label="作品圣经" value={project.bibleStatus === "drafted" ? "已生成草稿" : "待生成"} />
      </div>

      <div className="next-step-panel">
        <div>
          <span className="eyebrow">下一步</span>
          <h2>先完成 A 定向修改，再交给 MiniMax 做 AI 味审计。</h2>
          <p>这里之后会接真实 Orchestrator。前端层面先把节点状态、循环路径和用户读稿回流表达清楚。</p>
          {latestMemory && <p className="memory-brief">最近交接：{latestMemory.nextChapterBrief}</p>}
        </div>
        <button className="primary-action" onClick={latestMemory ? onCreateNextChapter : onOpenWorkflow}>
          {latestMemory ? "用记忆包开下一章" : "打开章节工作流"}
          <GitBranch size={18} />
        </button>
      </div>

      {bible && (
        <div className="bible-panel">
          <div className="bible-main">
            <span className="eyebrow">AI 作品圣经草稿</span>
            <h2>{bible.premise}</h2>
            <dl>
              <dt>主角</dt>
              <dd>{bible.protagonist}</dd>
              <dt>核心冲突</dt>
              <dd>{bible.coreConflict}</dd>
              <dt>开篇钩子</dt>
              <dd>{bible.openingHook}</dd>
            </dl>
          </div>
          <BibleList title="世界规则" items={bible.worldRules} />
          <BibleList title="文风规则" items={bible.styleRules} />
          <BibleList title="必须避免" items={bible.mustAvoid} />
          <BibleList title="长线种子" items={bible.longArcSeeds} />
        </div>
      )}
    </section>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="metric-card">
      <div className="metric-icon">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function BibleList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="bible-list">
      <strong>{title}</strong>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
