import type { DraftParagraph, NovelProject, StoryCandidate, UserAnnotation, WorkflowNodeData } from "../types/domain";

export const candidates: StoryCandidate[] = [
  {
    id: "c1",
    title: "谎言诊所",
    genre: "都市悬疑",
    logline: "能听见谎言的心理咨询师，接待了一个从不说谎的杀人犯。",
    protagonist: "林照，失眠成瘾的心理咨询师，能听见别人谎言里的第二层声音。",
    coreConflict: "她靠识破谎言谋生，却遇到一个每句话都是真的嫌疑人。",
    openingHook: "午夜诊室里，男人说：我杀了她。但林照没有听见任何谎言声。",
    toneTags: ["冷感都市", "心理博弈", "强钩子", "低解释"],
  },
  {
    id: "c2",
    title: "第七次醒来",
    genre: "科幻悬疑",
    logline: "一个普通人每天醒来都会继承一段陌生记忆，直到他发现这些记忆来自未来的自己。",
    protagonist: "许临，失败的游戏关卡设计师，擅长拆解规则却不擅长面对现实。",
    coreConflict: "未来记忆不断救他，也不断把他推向一场还没发生的谋杀。",
    openingHook: "他醒来时，手机备忘录里多了一行字：今天不要相信你母亲。",
    toneTags: ["时间谜题", "克制紧张", "强规则", "反转"],
  },
  {
    id: "c3",
    title: "长明灯下",
    genre: "玄幻权谋",
    logline: "被废的守灯人发现，王朝气运不是天命，而是一套可以被篡改的账本。",
    protagonist: "沈砚，前守灯司少卿，记性极好，却故意装作遗忘一切。",
    coreConflict: "他必须在各方势力夺灯前，找出谁在偷换国运。",
    openingHook: "长明灯灭的那晚，满朝文武都多活了一天，只有皇帝少了一岁。",
    toneTags: ["东方奇诡", "权谋", "设定强", "慢热爆点"],
  },
];

export const project: NovelProject = {
  id: "novel-001",
  title: "谎言诊所",
  genre: "都市悬疑",
  logline: "能听见谎言的心理咨询师，接待了一个从不说谎的杀人犯。",
  bibleStatus: "drafted",
  currentChapterId: "chapter-001",
  createdAt: Date.now(),
};

export const workflow: WorkflowNodeData[] = [
  {
    id: "brief",
    label: "章节目标卡",
    role: "planner",
    model: "GPT/Codex",
    status: "done",
    summary: "确定本章钩子、人物误判和结尾悬念。",
    promptFocus: "把企划拆成可执行章节目标，不写正文。",
    output: "本章让林照第一次遇到无法识破的嫌疑人。",
  },
  {
    id: "draft",
    label: "A 写作",
    role: "writer",
    model: "DeepSeek",
    status: "passed",
    summary: "长上下文生成初稿，保留章节目标和人物状态。",
    promptFocus: "写具体动作、对白和冲突，禁止总结创作思路。",
    output: "初稿 3420 字，结尾保留强悬念。",
  },
  {
    id: "audit-b",
    label: "B 结构审计",
    role: "structureAuditor",
    model: "GPT/Codex",
    status: "needsFix",
    summary: "发现 2 个动机跳跃和 1 个信息出现过巧。",
    promptFocus: "只找剧情、人设、动机、信息、伏笔问题。",
    output: "需要补足女主继续接案的外部压力。",
  },
  {
    id: "rewrite-a",
    label: "A 定向修改",
    role: "rewriter",
    model: "DeepSeek",
    status: "running",
    summary: "按结构审计结果局部改写，不重写整章。",
    promptFocus: "只改指定段落，保留关键事实和钩子。",
  },
  {
    id: "audit-c",
    label: "C AI 味审计",
    role: "styleAuditor",
    model: "MiniMax",
    status: "idle",
    summary: "检查句式均匀、抽象情绪、模板连接和对白自然度。",
    promptFocus: "只审语言纹理，不评价剧情。",
  },
  {
    id: "judge",
    label: "最终验收",
    role: "finalJudge",
    model: "GPT/Codex",
    status: "blocked",
    summary: "等待结构修改和 AI 味审计完成。",
    promptFocus: "只输出 pass/fail 和阻断项。",
  },
  {
    id: "reader",
    label: "用户读稿",
    role: "planner",
    model: "Human",
    status: "idle",
    summary: "用户阅读成稿，圈段落批注；有批注则回流修改。",
    promptFocus: "人工裁决优先级最高。",
  },
  {
    id: "zhuque",
    label: "朱雀复测",
    role: "aiDetector",
    model: "Tencent Zhuque",
    status: "idle",
    summary: "发布前调用朱雀检测 AI 特征；风险过高则回流改写。",
    promptFocus: "读取最终正文，返回 AIGC 值、剩余额度和详细报告。",
  },
  {
    id: "memory",
    label: "记忆包",
    role: "memory",
    model: "GPT/Codex",
    status: "idle",
    summary: "定稿后生成下一章可继承的结构化记忆。",
    promptFocus: "总结事件、角色状态、伏笔、禁区和下一章承接。",
  },
];

export const draftParagraphs: DraftParagraph[] = [
  {
    id: "p001",
    text: "雨停在凌晨两点十七分。林照把诊室最后一盏灯关掉，玻璃门外的霓虹还亮着，像一条没闭上的伤口。",
  },
  {
    id: "p002",
    text: "她刚把预约表锁进抽屉，门铃响了。不是电子铃，是有人用指节敲在门框上，一下，两下，很轻，却没有商量的意思。",
    hasComment: true,
  },
  {
    id: "p003",
    text: "男人站在门外，西装肩线被雨水压塌。他说自己杀了人，声音平稳得像在报一个迟到的会议。",
  },
  {
    id: "p004",
    text: "林照没有听见谎言声。她看着他，手指慢慢离开报警按钮。",
    hasComment: true,
  },
];

export const annotations: UserAnnotation[] = [
  {
    id: "a1",
    paragraphId: "p002",
    text: "这个敲门动作很好，但可以更有压迫感一点，让女主不舒服。",
    status: "open",
  },
  {
    id: "a2",
    paragraphId: "p004",
    text: "她为什么松开报警按钮？这里需要一个短促的心理/职业判断。",
    status: "sent_to_ai",
  },
];
