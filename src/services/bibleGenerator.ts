import type { NovelProject, ProjectBible, StoryCandidate } from "../types/domain";

export function generateBible(project: NovelProject, candidate: StoryCandidate): ProjectBible {
  return {
    id: `bible:${project.id}`,
    projectId: project.id,
    premise: candidate.logline,
    protagonist: candidate.protagonist,
    coreConflict: candidate.coreConflict,
    openingHook: candidate.openingHook,
    worldRules: buildWorldRules(candidate),
    styleRules: buildStyleRules(candidate),
    mustAvoid: [
      "不要用旁白直接解释设定，优先通过行动、对话和误判暴露信息。",
      "不要让角色为了剧情突然变聪明或突然配合。",
      "不要把章节结尾写成空泛总结，必须留下可追问的具体钩子。",
    ],
    longArcSeeds: [
      "主角的能力或身份必须有代价，代价要逐章加重。",
      "第一章抛出的异常不能立刻解释清楚，只允许给出可复查线索。",
      "每三章至少回收一次旧线索，同时抛出一个更深层问题。",
    ],
    createdAt: Date.now(),
  };
}

function buildWorldRules(candidate: StoryCandidate) {
  if (candidate.genre.includes("科幻")) {
    return [
      "核心异常必须有清晰规则，规则可以被误解，但不能随意变动。",
      "每次使用异常能力都要产生现实层面的副作用。",
      "科技设定服务悬疑推进，不展开百科式解释。",
    ];
  }

  if (candidate.genre.includes("玄幻")) {
    return [
      "术法和权力绑定代价，不能无成本解决冲突。",
      "王朝秩序表面稳定，底层规则必须能被主角逐步验证。",
      "奇诡设定要落到人物利益，不只做氛围装饰。",
    ];
  }

  if (candidate.genre.includes("仙侠")) {
    return [
      "修行规则必须影响人物选择，而不是只作为战力等级。",
      "宗门、天道、飞升等概念要有具体制度和漏洞。",
      "群像角色各自有欲望，不能只围着主角转。",
    ];
  }

  return [
    "异常能力必须在现实生活中留下痕迹，不能只作为破案外挂。",
    "每个委托都要推动主线，而不是孤立单元案件。",
    "都市空间保持冷静、具体、可触摸，避免抽象氛围词堆叠。",
  ];
}

function buildStyleRules(candidate: StoryCandidate) {
  const base = [
    "多写具体动作、停顿、物件和身体反应，少写抽象情绪判断。",
    "对白要有角色立场和试探，不要像作者解释设定。",
    "段落长短要有变化，关键转折前后允许短句制造断裂。",
  ];

  if (candidate.toneTags.some((tag) => tag.includes("权谋") || tag.includes("博弈"))) {
    return [...base, "冲突优先写信息差和利益交换，少写正面宣言。"];
  }

  if (candidate.toneTags.some((tag) => tag.includes("群像"))) {
    return [...base, "群像章节要让每个重要角色带着自己的目标进入场景。"];
  }

  return [...base, "悬疑感来自具体反常细节，不来自泛泛的压抑、冰冷、复杂。"];
}
