import type { PromptPreset } from "../types/domain";

export const defaultPromptPresets: PromptPreset[] = [
  {
    id: "prompt:brief:v1",
    nodeId: "brief",
    title: "章节目标卡生成",
    model: "GPT/Codex",
    version: 1,
    template: "根据作品圣经生成本章 plotGoal、conflictGoal、mustInclude、mustAvoid 和 auditFocus。不要写正文。",
  },
  {
    id: "prompt:draft:v1",
    nodeId: "draft",
    title: "A 模型写作",
    model: "DeepSeek",
    version: 1,
    template: "读取作品圣经和章节目标卡，写具体动作、对白、误判和钩子。禁止解释创作思路。",
  },
  {
    id: "prompt:audit-b:v1",
    nodeId: "audit-b",
    title: "B 结构审计",
    model: "GPT/Codex",
    version: 1,
    template: "只找剧情逻辑、人物动机、信息合理性、伏笔连续性问题。输出 JSON 阻断项。",
  },
  {
    id: "prompt:audit-c:v1",
    nodeId: "audit-c",
    title: "C AI 味审计",
    model: "MiniMax",
    version: 1,
    template: "只检查中文自然度、句式均匀、抽象情绪、总结腔和对白生硬，不评价剧情好坏。",
  },
  {
    id: "prompt:memory:v1",
    nodeId: "memory",
    title: "章节记忆包",
    model: "GPT/Codex",
    version: 1,
    template: "定稿后生成 summary、keyEvents、characterChanges、foreshadowingUpdates 和 nextChapterBrief。",
  },
  {
    id: "prompt:zhuque:v1",
    nodeId: "zhuque",
    title: "朱雀复测",
    model: "Tencent Zhuque",
    version: 1,
    template: "将用户确认后的正文提交朱雀检测，解析 AIGC 值和片段报告。若 AI 特征偏高，回流给 A 模型做降痕改写。",
  },
];
