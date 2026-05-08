import type { ChapterGoal, DraftParagraph, DraftVersion, ProjectBible } from "../types/domain";

export function generateInitialDraft(bible: ProjectBible, goal: ChapterGoal, versionNumber = 1): DraftVersion {
  const paragraphs: DraftParagraph[] = [
    {
      id: "p001",
      text: goal.openingImage,
    },
    {
      id: "p002",
      text: `主角的日常秩序被打断。${bible.protagonist}。这一次，熟悉的判断方法没有给出答案，反而让主角意识到事情比表面更危险。`,
    },
    {
      id: "p003",
      text: `对方抛出一个看似普通的请求，却正好踩中核心矛盾：${bible.coreConflict}主角没有立刻答应，而是先观察对方留下的细节。`,
    },
    {
      id: "p004",
      text: "房间里的一个小物件暴露了异常。它不够显眼，却和主角刚才听到的话互相矛盾，像一枚被故意放在灯下的钉子。",
    },
    {
      id: "p005",
      text: "主角做出第一个带风险的选择：暂时不揭穿、不报警、不逃走，而是顺着对方的话继续问下去。这个选择让局面从委托变成了试探。",
    },
    {
      id: "p006",
      text: `${goal.endingHook}临近结尾时，主角发现那件小物件的位置变了。不是被人移动过，而是它从一开始就不该存在。`,
    },
  ];

  return {
    id: `draft:${goal.chapterId}:v${versionNumber}`,
    chapterId: goal.chapterId,
    versionNumber,
    sourceNodeId: versionNumber === 1 ? "draft" : "rewrite-a",
    model: versionNumber === 1 ? "DeepSeek" : "DeepSeek 定向返工",
    paragraphs,
    notes: versionNumber === 1 ? "根据作品圣经和章节目标卡生成的初稿。" : "根据审计报告和人工批注生成的返工稿。",
    createdAt: Date.now(),
  };
}
