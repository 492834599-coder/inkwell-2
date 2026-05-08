import type { ChapterGoal, DraftVersion, MemoryPack, NovelProject, ProjectBible } from "../types/domain";

export function generateMemoryPack(project: NovelProject, bible: ProjectBible, goal: ChapterGoal, draft: DraftVersion): MemoryPack {
  return {
    id: `memory:${goal.chapterId}`,
    chapterId: goal.chapterId,
    summary: `${project.title} 当前章完成：${goal.plotGoal} 定稿版本为 V${draft.versionNumber}，核心钩子已经落到具体反常细节。`,
    keyEvents: [
      "主角的日常秩序被异常事件打断。",
      "主角发现一个能在后续复查的具体线索。",
      "主角主动做出带风险的选择，进入主线冲突。",
    ],
    characterChanges: [
      `${bible.protagonist} 从旁观判断者转为主动试探者。`,
      "主角开始意识到自己的能力或经验并不可靠。",
    ],
    foreshadowingUpdates: [
      "反常物件的位置和来源需要在后续章节回收。",
      "主角档案或身份信息被外部势力掌握。",
    ],
    nextChapterBrief: "下一章应让主角追查线索来源，同时引入第二个能挑战主角判断的人。",
    createdAt: Date.now(),
  };
}
