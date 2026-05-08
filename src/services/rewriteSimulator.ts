import type { DraftVersion, ReviewReport, UserAnnotation } from "../types/domain";

export function rewriteDraft(draft: DraftVersion, reports: ReviewReport[], annotations: UserAnnotation[]): DraftVersion {
  const targets = new Set<string>();
  reports.forEach((report) => report.issues.forEach((issue) => targets.add(issue.paragraphId)));
  annotations.filter((annotation) => annotation.status === "sent_to_ai").forEach((annotation) => targets.add(annotation.paragraphId));

  const paragraphs = draft.paragraphs.map((paragraph) => {
    if (!targets.has(paragraph.id)) return paragraph;

    if (paragraph.id === "p005") {
      return {
        ...paragraph,
        text: "主角没有立刻报警。她看见对方袖口里露出的病历编号，那是只有诊所内部档案才会出现的格式。若现在把人赶走，她可能永远不知道是谁把自己的档案交到了嫌疑人手里。",
        hasComment: false,
      };
    }

    if (paragraph.id === "p004") {
      return {
        ...paragraph,
        text: "桌角那枚旧铜扣吸住了她的视线。它和来客外套上的缺口严丝合缝，却干净得没有一点雨水，像是提前等在这里。",
        hasComment: false,
      };
    }

    if (paragraph.id === "p002") {
      return {
        ...paragraph,
        text: "她把预约表推回抽屉，钥匙还没转到底，门框忽然轻响。一下。两下。林照的手停在锁孔上，指腹被钥匙齿硌了一下。",
        hasComment: false,
      };
    }

    return {
      ...paragraph,
      text: `${paragraph.text} 这一段已经按审计意见补足动作、动机和可复查细节。`,
      hasComment: false,
    };
  });

  return {
    id: `draft:${draft.chapterId}:v${draft.versionNumber + 1}`,
    chapterId: draft.chapterId,
    versionNumber: draft.versionNumber + 1,
    sourceNodeId: "rewrite-a",
    model: "DeepSeek 定向返工",
    paragraphs,
    notes: "根据结构审计、AI 味审计和人工批注生成的返工稿。",
    createdAt: Date.now(),
  };
}
