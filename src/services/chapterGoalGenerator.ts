import type { ChapterGoal, NovelProject, ProjectBible } from "../types/domain";

export function generateFirstChapterGoal(project: NovelProject, bible: ProjectBible): ChapterGoal {
  return {
    id: `goal:${project.currentChapterId}`,
    projectId: project.id,
    chapterId: project.currentChapterId,
    title: titleFromHook(bible.openingHook),
    plotGoal: `用一个具体异常事件验证全书前提：${bible.premise}`,
    emotionalGoal: "让读者先相信主角的日常秩序，再在结尾打破这套秩序。",
    conflictGoal: `让主角第一次正面撞上核心冲突：${bible.coreConflict}`,
    openingImage: bible.openingHook,
    endingHook: "结尾必须留下一个可复查的反常细节，推动读者进入下一章。",
    mustInclude: [
      bible.protagonist,
      bible.openingHook,
      "至少一个能被后续章节回收的细节证据。",
      "主角做出一个带风险的选择，而不是被动等待剧情推进。",
    ],
    mustAvoid: [
      ...bible.mustAvoid.slice(0, 2),
      "不要在第一章解释完整世界规则，只展示规则失效或代价。",
    ],
    auditFocus: [
      "主角行为是否有足够动机。",
      "异常事件是否具体可感，而不是抽象气氛。",
      "结尾钩子是否是事件/证据，而不是泛泛悬念句。",
      "是否出现 AI 味高风险的总结腔和均匀句式。",
    ],
    createdAt: Date.now(),
  };
}

function titleFromHook(hook: string) {
  if (hook.includes("诊室") || hook.includes("诊所")) return "第一章：午夜诊所";
  if (hook.includes("醒来") || hook.includes("备忘录")) return "第一章：醒来之后";
  if (hook.includes("灯")) return "第一章：长明灯灭";
  if (hook.includes("天道") || hook.includes("渡劫")) return "第一章：名单上的名字";
  return "第一章：异常开始";
}
