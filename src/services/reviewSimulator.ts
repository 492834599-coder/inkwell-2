import type { ChapterGoal, DraftVersion, ReviewReport } from "../types/domain";

export function runStructureAudit(draft: DraftVersion, goal: ChapterGoal): ReviewReport {
  const needsMotivation = draft.versionNumber === 1;
  const issues = needsMotivation
    ? [
        {
          id: `issue:${draft.id}:motivation`,
          paragraphId: "p005",
          category: "结构审计" as const,
          severity: "high" as const,
          problem: "主角选择继续追问的动机还不够硬，读者可能觉得她只是为了剧情留下。",
          suggestion: "补一个外部压力或职业判断，让她留下来有利益、风险或责任。",
          fixInstruction: "重写 p005，保留主角继续追问的结果，但加入她不能立刻离开的理由。",
        },
        {
          id: `issue:${draft.id}:clue`,
          paragraphId: "p004",
          category: "结构审计" as const,
          severity: "medium" as const,
          problem: "关键物件作为线索出现，但和本章目标的关联还可以更明确。",
          suggestion: "让物件与章节钩子形成可复查的因果关系。",
          fixInstruction: "微调 p004，让反常物件和结尾钩子互相咬合。",
        },
      ]
    : [];

  return {
    id: `review:${draft.chapterId}:structure:v${draft.versionNumber}`,
    chapterId: draft.chapterId,
    nodeId: "audit-b",
    model: "GPT/Codex",
    score: needsMotivation ? 72 : 90,
    passed: !needsMotivation,
    summary: needsMotivation ? "结构上可读，但主角动机和线索咬合需要返工。" : `结构审计通过：${goal.conflictGoal}`,
    issues,
    createdAt: Date.now(),
  };
}

export function runStyleAudit(draft: DraftVersion): ReviewReport {
  const hasAiRisk = draft.versionNumber < 2;
  const issues = hasAiRisk
    ? [
        {
          id: `issue:${draft.id}:style`,
          paragraphId: "p002",
          category: "AI味审计" as const,
          severity: "medium" as const,
          problem: "该段偏概括，动作和身体反应不足，读感略像剧情摘要。",
          suggestion: "加入具体动作、停顿或物件反应，降低总结腔。",
          fixInstruction: "改写 p002，用具体动作承载主角的迟疑。",
        },
      ]
    : [];

  return {
    id: `review:${draft.chapterId}:style:v${draft.versionNumber}`,
    chapterId: draft.chapterId,
    nodeId: "audit-c",
    model: "MiniMax",
    score: hasAiRisk ? 82 : 92,
    passed: !hasAiRisk || draft.versionNumber >= 2,
    summary: hasAiRisk ? "语言基本可用，但 p002 仍有轻微总结腔。" : "AI 味审计通过：句式、动作和对白节奏可接受。",
    issues,
    createdAt: Date.now(),
  };
}

export function runFinalJudge(draft: DraftVersion, reports: ReviewReport[]): ReviewReport {
  const blockingIssues = reports
    .filter((report) => report.chapterId === draft.chapterId)
    .flatMap((report) => report.issues)
    .filter((issue) => issue.severity === "critical" || issue.severity === "high");
  const passed = blockingIssues.length === 0 || draft.versionNumber >= 2;

  return {
    id: `review:${draft.chapterId}:judge:v${draft.versionNumber}`,
    chapterId: draft.chapterId,
    nodeId: "judge",
    model: "GPT/Codex",
    score: passed ? 91 : 76,
    passed,
    summary: passed ? "最终验收通过，可以交给用户读稿。" : "仍存在阻断项，需要回到 A 定向修改。",
    issues: passed ? [] : blockingIssues,
    createdAt: Date.now(),
  };
}
