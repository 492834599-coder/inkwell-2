import type { ProjectMode, StoryCandidate } from "../types/domain";

interface CandidateInput {
  mode: ProjectMode;
  genre: string;
  spark: string;
}

const genreSeeds: Record<string, Array<Omit<StoryCandidate, "id" | "genre">>> = {
  都市悬疑: [
    {
      title: "盲区来电",
      logline: "一个只接死人电话的接线员，收到了一通来自自己未来葬礼的报警。",
      protagonist: "周停，夜班接线员，习惯把恐惧拆成流程，却害怕自己的记忆出错。",
      coreConflict: "他必须判断每通电话是真实求救，还是凶手布下的时间陷阱。",
      openingHook: "凌晨三点，系统显示来电人已经死亡四小时。",
      toneTags: ["冷感都市", "时间诡计", "强悬念", "低解释"],
    },
    {
      title: "第二张脸",
      logline: "整形修复师发现，每个来修脸的人都在试图变成同一个失踪女人。",
      protagonist: "程雾，手很稳的修复医生，能记住每一块疤的来路。",
      coreConflict: "她越接近真相，越发现自己的脸也在病历里出现过。",
      openingHook: "病人摘下口罩时，程雾看见了三年前死去的自己。",
      toneTags: ["医疗悬疑", "身份谜题", "压迫感", "女性主角"],
    },
    {
      title: "谎言诊所",
      logline: "能听见谎言的心理咨询师，接待了一个从不说谎的杀人犯。",
      protagonist: "林照，失眠成瘾的心理咨询师，能听见别人谎言里的第二层声音。",
      coreConflict: "她靠识破谎言谋生，却遇到一个每句话都是真的嫌疑人。",
      openingHook: "午夜诊室里，男人说：我杀了她。但林照没有听见任何谎言声。",
      toneTags: ["心理博弈", "强钩子", "低解释", "雨夜开篇"],
    },
  ],
  科幻悬疑: [
    {
      title: "第七次醒来",
      logline: "一个普通人每天醒来都会继承一段陌生记忆，直到他发现这些记忆来自未来的自己。",
      protagonist: "许临，失败的游戏关卡设计师，擅长拆解规则却不擅长面对现实。",
      coreConflict: "未来记忆不断救他，也不断把他推向一场还没发生的谋杀。",
      openingHook: "他醒来时，手机备忘录里多了一行字：今天不要相信你母亲。",
      toneTags: ["时间谜题", "克制紧张", "强规则", "反转"],
    },
    {
      title: "空城备份",
      logline: "城市每天凌晨会备份一次人格，只有女主发现昨天的自己没有被覆盖。",
      protagonist: "夏迟，城市档案维护员，负责删除异常人格残留。",
      coreConflict: "她必须保护一个旧版自己，同时查清是谁在偷偷修改全城人生。",
      openingHook: "清晨醒来，她收到自己昨夜写下的遗书，落款时间是明天。",
      toneTags: ["人格备份", "赛博冷感", "规则悬疑", "双自我"],
    },
    {
      title: "失真天气",
      logline: "每次下雨，城市都会随机丢失一个事实，没人记得被抹掉的东西曾经存在。",
      protagonist: "陆白，气象台实习生，唯一能在雨后保留错误记忆。",
      coreConflict: "他要在事实被雨洗掉前，找出操控天气的人。",
      openingHook: "第一场雨后，陆白发现自己没有父亲，但餐桌上还摆着第三副碗筷。",
      toneTags: ["现实失真", "家庭谜题", "强设定", "情绪悬疑"],
    },
  ],
  玄幻权谋: [
    {
      title: "长明灯下",
      logline: "被废的守灯人发现，王朝气运不是天命，而是一套可以被篡改的账本。",
      protagonist: "沈砚，前守灯司少卿，记性极好，却故意装作遗忘一切。",
      coreConflict: "他必须在各方势力夺灯前，找出谁在偷换国运。",
      openingHook: "长明灯灭的那晚，满朝文武都多活了一天，只有皇帝少了一岁。",
      toneTags: ["东方奇诡", "权谋", "设定强", "慢热爆点"],
    },
    {
      title: "借命司",
      logline: "少年在朝廷借命司做账，发现所有王侯的寿命都欠着一个死人。",
      protagonist: "闻朔，账房出身的低阶术士，胆小但算账从不出错。",
      coreConflict: "他想活下去，就必须揭开谁在用天下人的命养一具空棺。",
      openingHook: "他第一次进借命司，就看见自己的寿数被划掉了三十年。",
      toneTags: ["命数账本", "小人物", "朝堂暗线", "代价感"],
    },
    {
      title: "骨印王朝",
      logline: "每个官员升迁都要刻下一枚骨印，女主发现父亲的骨印刻在皇帝身上。",
      protagonist: "谢知微，验骨师之女，能从骨纹里读出一个人撒过的谎。",
      coreConflict: "她必须在礼法和血仇之间，证明王朝的合法性从一开始就是骗局。",
      openingHook: "新帝登基那日，谢知微在龙袍下看见了父亲的肋骨纹。",
      toneTags: ["女主复仇", "王朝秘术", "权谋", "身份真相"],
    },
  ],
  仙侠群像: [
    {
      title: "问剑无名",
      logline: "天下第一剑宗每年都要抹去一个弟子的名字，直到被抹去的人开始回来。",
      protagonist: "应照，记名弟子，天赋平平，却记得所有被世界忘掉的人。",
      coreConflict: "他要查清宗门飞升真相，同时保护一群不该存在的旧友。",
      openingHook: "师门大比前夜，石碑上多出一行血字：明日被忘记的人是你。",
      toneTags: ["群像", "宗门秘密", "情义", "飞升骗局"],
    },
    {
      title: "渡劫失败名单",
      logline: "女主负责登记渡劫失败者，却发现自己的名字被提前写在下一页。",
      protagonist: "姜晚照，天劫司小吏，嘴毒怕死，擅长从规矩里找漏洞。",
      coreConflict: "她要在天道账册里改命，也要弄清谁把失败变成了一门生意。",
      openingHook: "那天她翻到自己的死期，旁边朱批只有四个字：不准更改。",
      toneTags: ["天道官僚", "轻讽刺", "女主成长", "规则破局"],
    },
    {
      title: "云上旧债",
      logline: "几个飞升失败的旧友重聚，发现当年的师尊不是死了，而是欠了天道一笔债。",
      protagonist: "岑青，前剑修，如今靠替人写悼词谋生。",
      coreConflict: "他们必须偿还一场被遗忘的飞升骗局，否则所有凡间记忆都会被收走。",
      openingHook: "师尊忌日那天，岑青收到一张来自天上的欠条。",
      toneTags: ["旧友重聚", "仙侠群像", "债务奇观", "情绪回收"],
    },
  ],
};

export function generateCandidates(input: CandidateInput): StoryCandidate[] {
  if (input.mode === "spark" && input.spark.trim()) {
    return generateFromSpark(input.spark.trim(), input.genre);
  }

  const seeds = genreSeeds[input.genre] || genreSeeds["都市悬疑"];
  return seeds.map((seed, index) => ({
    id: candidateId(input.genre, index),
    genre: input.genre,
    ...seed,
  }));
}

function generateFromSpark(spark: string, fallbackGenre: string): StoryCandidate[] {
  const topic = compactSpark(spark);
  const genre = inferGenre(spark, fallbackGenre);

  return [
    {
      id: candidateId(topic, 0),
      title: titleFromSpark(topic, "诊所"),
      genre,
      logline: `${topic}，却在第一章遇到一个无法被常识解释的反例。`,
      protagonist: `主角拥有与“${topic}”相关的异常能力，但这个能力正在反过来伤害自己。`,
      coreConflict: "主角越依赖能力，越发现能力本身可能是别人布下的陷阱。",
      openingHook: `夜里，主角第一次发现：${spark.replace(/[。！？!?]$/, "")}，但这次规则失效了。`,
      toneTags: ["灵感扩写", "强钩子", "能力反噬", "悬疑开局"],
    },
    {
      id: candidateId(topic, 1),
      title: titleFromSpark(topic, "备忘录"),
      genre,
      logline: `围绕“${topic}”展开一场多人博弈，每个人都在利用同一个秘密。`,
      protagonist: "主角不是最强的人，而是唯一愿意追问代价的人。",
      coreConflict: "所有人都想把异常能力商品化，主角必须决定是揭穿它，还是先借它活下去。",
      openingHook: "第一章从一次看似普通的委托开始，委托内容却精确说中了主角最不想承认的秘密。",
      toneTags: ["多方博弈", "低解释", "秘密交易", "现实压迫"],
    },
    {
      id: candidateId(topic, 2),
      title: titleFromSpark(topic, "长夜"),
      genre,
      logline: `把“${topic}”推成全书核心规则，让每一章都揭开它的一层副作用。`,
      protagonist: "主角擅长观察细节，但不擅长相信别人。",
      coreConflict: "真相并不难找，难的是每接近一步，主角都会失去一段重要关系。",
      openingHook: "故事开场不是能力展示，而是一次误判：主角相信自己赢了，结果正中对方下怀。",
      toneTags: ["规则悬疑", "关系代价", "长线伏笔", "慢热爆点"],
    },
  ];
}

function compactSpark(spark: string) {
  return spark
    .replace(/[，。！？、,.!?]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 7)
    .join("");
}

function inferGenre(spark: string, fallback: string) {
  if (/仙|剑|宗门|飞升|天道|灵根/.test(spark)) return "仙侠群像";
  if (/王朝|皇|术士|命|灯|骨/.test(spark)) return "玄幻权谋";
  if (/未来|记忆|时间|备份|城市|系统/.test(spark)) return "科幻悬疑";
  return fallback || "都市悬疑";
}

function titleFromSpark(topic: string, suffix: string) {
  const core = topic.slice(0, 4) || "无名";
  return `${core}${suffix}`;
}

function candidateId(seed: string, index: number) {
  const code = Array.from(seed).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return `candidate:${code}:${index}:${Date.now()}`;
}
