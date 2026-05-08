const DEFAULT_GENRE = '都市悬疑';
const PROVIDER_MODE = process.env.INKWELL_PROVIDER_MODE || 'deterministic';
const { getProviderLogs, getProviderStatus, runJsonRole } = require('./providers.cjs');

const genreSeeds = {
  '都市悬疑': [
    {
      title: '谎言诊所',
      logline: '能听见谎言的心理咨询师，接待了一个从不说谎的杀人犯。',
      protagonist: '林照，失眠成瘾的心理咨询师，能听见别人谎言里的第二层声音。',
      coreConflict: '她靠识破谎言谋生，却遇到一个每句话都是真的嫌疑人。',
      openingHook: '午夜诊室里，男人说：我杀了她。但林照没有听见任何谎言声。',
      toneTags: ['心理博弈', '强钩子', '低解释', '雨夜开篇'],
    },
    {
      title: '盲区来电',
      logline: '一个只接死人电话的接线员，收到了一通来自自己未来葬礼的报警。',
      protagonist: '周停，夜班接线员，习惯把恐惧拆成流程，却害怕自己的记忆出错。',
      coreConflict: '他必须判断每通电话是真实求救，还是凶手布下的时间陷阱。',
      openingHook: '凌晨三点，系统显示来电人已经死亡四小时。',
      toneTags: ['冷感都市', '时间诡计', '强悬念', '低解释'],
    },
    {
      title: '第二张脸',
      logline: '整形修复师发现，每个来修脸的人都在试图变成同一个失踪女人。',
      protagonist: '程雾，手很稳的修复医生，能记住每一块疤的来路。',
      coreConflict: '她越接近真相，越发现自己的脸也在病历里出现过。',
      openingHook: '病人摘下口罩时，程雾看见了三年前死去的自己。',
      toneTags: ['医疗悬疑', '身份谜题', '压迫感', '女性主角'],
    },
  ],
  '科幻悬疑': [
    {
      title: '第七次醒来',
      logline: '一个普通人每天醒来都会继承一段陌生记忆，直到他发现这些记忆来自未来的自己。',
      protagonist: '许临，失败的游戏关卡设计师，擅长拆解规则却不擅长面对现实。',
      coreConflict: '未来记忆不断救他，也不断把他推向一场还没发生的谋杀。',
      openingHook: '他醒来时，手机备忘录里多了一行字：今天不要相信你母亲。',
      toneTags: ['时间谜题', '克制紧张', '强规则', '反转'],
    },
    {
      title: '空城备份',
      logline: '城市每天凌晨会备份一次人格，只有女主发现昨天的自己没有被覆盖。',
      protagonist: '夏迟，城市档案维护员，负责删除异常人格残留。',
      coreConflict: '她必须保护一个旧版自己，同时查清是谁在偷偷修改全城人生。',
      openingHook: '清晨醒来，她收到自己昨夜写下的遗书，落款时间是明天。',
      toneTags: ['人格备份', '赛博冷感', '规则悬疑', '双自我'],
    },
    {
      title: '失真天气',
      logline: '每次下雨，城市都会随机丢失一个事实，没人记得被抹掉的东西曾经存在。',
      protagonist: '陆白，气象台实习生，唯一能在雨后保留错误记忆。',
      coreConflict: '他要在事实被雨洗掉前，找出操控天气的人。',
      openingHook: '第一场雨后，陆白发现自己没有父亲，但餐桌上还摆着第三副碗筷。',
      toneTags: ['现实失真', '家庭谜题', '强设定', '情绪悬疑'],
    },
  ],
  '玄幻权谋': [
    {
      title: '长明灯下',
      logline: '被废的守灯人发现，王朝气运不是天命，而是一套可以被篡改的账本。',
      protagonist: '沈砚，前守灯司少卿，记性极好，却故意装作遗忘一切。',
      coreConflict: '他必须在各方势力夺灯前，找出谁在偷换国运。',
      openingHook: '长明灯灭的那晚，满朝文武都多活了一天，只有皇帝少了一岁。',
      toneTags: ['东方奇诡', '权谋', '设定强', '慢热爆点'],
    },
    {
      title: '借命司',
      logline: '少年在朝廷借命司做账，发现所有王侯的寿命都欠着一个死人。',
      protagonist: '闻朔，账房出身的低阶术士，胆小但算账从不出错。',
      coreConflict: '他想活下去，就必须揭开谁在用天下人的命养一具空棺。',
      openingHook: '他第一次进借命司，就看见自己的寿数被划掉了三十年。',
      toneTags: ['命数账本', '小人物', '朝堂暗线', '代价感'],
    },
  ],
  '仙侠群像': [
    {
      title: '问剑无名',
      logline: '天下第一剑宗每年都要抹去一个弟子的名字，直到被抹去的人开始回来。',
      protagonist: '应照，记名弟子，天资平平，却记得所有被世界忘掉的人。',
      coreConflict: '他要查清宗门飞升真相，同时保护一群不该存在的旧友。',
      openingHook: '师门大比前夜，石碑上多出一行血字：明日被忘记的人是你。',
      toneTags: ['群像', '宗门秘密', '情义', '飞升骗局'],
    },
    {
      title: '渡劫失败名单',
      logline: '女主负责登记渡劫失败者，却发现自己的名字被提前写在下一页。',
      protagonist: '姜晚照，天劫司小吏，嘴毒怕死，擅长从规矩里找漏洞。',
      coreConflict: '她要在天道账册里改命，也要弄清谁把失败变成了一门生意。',
      openingHook: '那天她翻到自己的死期，旁边朱批只有四个字：不准更改。',
      toneTags: ['天道官僚', '轻讽刺', '女主成长', '规则破局'],
    },
  ],
};

function now() {
  return Date.now();
}

function candidateId(seed, index) {
  const code = Array.from(seed).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return `candidate:${code}:${index}:${now()}`;
}

function generateCandidates(input = {}) {
  if (input.mode === 'spark' && String(input.spark || '').trim()) {
    return generateFromSpark(String(input.spark).trim(), input.genre || DEFAULT_GENRE);
  }
  const genre = input.genre || DEFAULT_GENRE;
  const seeds = genreSeeds[genre] || genreSeeds[DEFAULT_GENRE];
  return seeds.map((seed, index) => ({ id: candidateId(genre, index), genre, ...seed }));
}

function generateFromSpark(spark, fallbackGenre) {
  const genre = inferGenre(spark, fallbackGenre);
  const topic = spark.replace(/[，。！？,.!?]/g, ' ').split(/\s+/).filter(Boolean).slice(0, 7).join('').slice(0, 8) || '无名';
  return [
    {
      id: candidateId(topic, 0),
      title: `${topic.slice(0, 4)}诊所`,
      genre,
      logline: `${topic}，却在第一章遇到一个无法被常识解释的反例。`,
      protagonist: `主角拥有与“${topic}”相关的异常能力，但这个能力正在反过来伤害自己。`,
      coreConflict: '主角越依赖能力，越发现能力本身可能是别人布下的陷阱。',
      openingHook: `夜里，主角第一次发现：${spark.replace(/[。！？.!?]$/, '')}，但这次规则失效了。`,
      toneTags: ['灵感扩写', '强钩子', '能力反噬', '悬疑开局'],
    },
    {
      id: candidateId(topic, 1),
      title: `${topic.slice(0, 4)}备忘录`,
      genre,
      logline: `围绕“${topic}”展开一场多人博弈，每个人都在利用同一个秘密。`,
      protagonist: '主角不是最强的人，而是唯一愿意追问代价的人。',
      coreConflict: '所有人都想把异常能力商品化，主角必须决定是揭穿它，还是先借它活下去。',
      openingHook: '第一章从一次看似普通的委托开始，委托内容却精准说中了主角最不想承认的秘密。',
      toneTags: ['多方博弈', '低解释', '秘密交易', '现实压迫'],
    },
    {
      id: candidateId(topic, 2),
      title: `${topic.slice(0, 4)}长夜`,
      genre,
      logline: `把“${topic}”推成全书核心规则，让每一章都揭开它的一层副作用。`,
      protagonist: '主角擅长观察细节，但不擅长相信别人。',
      coreConflict: '真相并不难找，难的是每接近一步，主角都会失去一段重要关系。',
      openingHook: '故事开场不是能力展示，而是一次误判：主角相信自己赢了，结果正中对方下怀。',
      toneTags: ['规则悬疑', '关系代价', '长线伏笔', '慢热爆点'],
    },
  ];
}

function inferGenre(spark, fallback) {
  if (/仙|剑|宗门|飞升|天道|灵根/.test(spark)) return '仙侠群像';
  if (/王朝|皇|术士|命|灯|骨/.test(spark)) return '玄幻权谋';
  if (/未来|记忆|时间|备份|城市|系统/.test(spark)) return '科幻悬疑';
  return fallback || DEFAULT_GENRE;
}

function createProjectBundle(candidate) {
  assertObject(candidate, 'candidate');
  assertString(candidate.id, 'candidate.id');
  assertString(candidate.title, 'candidate.title');
  assertString(candidate.genre, 'candidate.genre');
  assertString(candidate.logline, 'candidate.logline');
  assertString(candidate.protagonist, 'candidate.protagonist');
  assertString(candidate.coreConflict, 'candidate.coreConflict');
  assertString(candidate.openingHook, 'candidate.openingHook');
  if (!candidate) throw new Error('Missing candidate.');
  const project = {
    id: `novel:${candidate.id}`,
    title: candidate.title,
    genre: candidate.genre,
    logline: candidate.logline,
    bibleStatus: 'drafted',
    currentChapterId: 'chapter-001',
    createdAt: now(),
  };
  const bible = generateBible(project, candidate);
  const chapterGoal = generateChapterGoal(project, bible);
  return { project, bible, chapterGoal };
}

function generateBible(project, candidate) {
  return {
    id: `bible:${project.id}`,
    projectId: project.id,
    premise: candidate.logline,
    protagonist: candidate.protagonist,
    coreConflict: candidate.coreConflict,
    openingHook: candidate.openingHook,
    worldRules: [
      '核心异常必须有清晰规则，规则可以被误解，但不能随意变动。',
      '每次使用能力或制度漏洞都要产生现实层面的副作用。',
      '设定服务悬疑推进，不展开百科式解释。',
    ],
    styleRules: [
      '多写具体动作、停顿、物件和身体反应，少写抽象情绪判断。',
      '对白要有角色立场和试探，不要像作者解释设定。',
      '段落长短要有变化，关键转折前后允许短句制造断裂。',
    ],
    mustAvoid: [
      '不要用旁白直接解释设定，优先通过行动、对话和误判暴露信息。',
      '不要让角色为了剧情突然变聪明或突然配合。',
      '不要把章节结尾写成空泛总结，必须留下可追问的具体钩子。',
    ],
    longArcSeeds: [
      '主角的能力或身份必须有代价，代价要逐章加重。',
      '第一章抛出的异常不能立刻解释清楚，只允许给出可复查线索。',
      '每三章至少回收一次旧线索，同时抛出一个更深层问题。',
    ],
    createdAt: now(),
  };
}

function generateChapterGoal(project, bible) {
  return {
    id: `goal:${project.currentChapterId}`,
    projectId: project.id,
    chapterId: project.currentChapterId,
    title: titleFromHook(bible.openingHook),
    plotGoal: `用一个具体异常事件验证全书前提：${bible.premise}`,
    emotionalGoal: '让读者先相信主角的日常秩序，再在结尾打破这套秩序。',
    conflictGoal: `让主角第一次正面撞上核心冲突：${bible.coreConflict}`,
    openingImage: bible.openingHook,
    endingHook: '结尾必须留下一个可复查的反常细节，推动读者进入下一章。',
    mustInclude: [
      bible.protagonist,
      bible.openingHook,
      '至少一个能被后续章节回收的细节证据。',
      '主角做出一个带风险的选择，而不是被动等待剧情推进。',
    ],
    mustAvoid: [...bible.mustAvoid.slice(0, 2), '不要在第一章解释完整世界规则，只展示规则失效或代价。'],
    auditFocus: [
      '主角行为是否有足够动机。',
      '异常事件是否具体可感，而不是抽象气氛。',
      '结尾钩子是否是事件/证据，而不是泛泛悬念句。',
      '是否出现 AI 味高风险的总结腔和均匀句式。',
    ],
    createdAt: now(),
  };
}

function titleFromHook(hook = '') {
  if (hook.includes('诊')) return '第一章：午夜诊所';
  if (hook.includes('醒') || hook.includes('备忘')) return '第一章：醒来之后';
  if (hook.includes('灯')) return '第一章：长明灯灭';
  if (hook.includes('天道') || hook.includes('名单')) return '第一章：名单上的名字';
  return '第一章：异常开始';
}

function generateDraft({ bible, goal, versionNumber = 1 }) {
  assertObject(bible, 'bible');
  assertObject(goal, 'goal');
  assertString(goal.chapterId, 'goal.chapterId');
  assertString(goal.openingImage, 'goal.openingImage');
  assertString(goal.endingHook, 'goal.endingHook');
  assertString(bible.protagonist, 'bible.protagonist');
  assertString(bible.coreConflict, 'bible.coreConflict');
  if (!bible || !goal) throw new Error('Missing bible or chapter goal.');
  const paragraphs = [
    { id: 'p001', text: goal.openingImage },
    {
      id: 'p002',
      text: `主角的日常秩序被打断。${bible.protagonist}。这一次，熟悉的判断方法没有给出答案，反而让主角意识到事情比表面更危险。`,
    },
    {
      id: 'p003',
      text: `对方抛出一个看似普通的请求，却正好踩中核心矛盾：${bible.coreConflict}主角没有立刻答应，而是先观察对方留下的细节。`,
    },
    {
      id: 'p004',
      text: '房间里的一个小物件暴露了异常。它不够显眼，却和主角刚才听到的话互相矛盾，像一枚被故意放在灯下的钉子。',
    },
    {
      id: 'p005',
      text: '主角做出第一个带风险的选择：暂时不揭穿、不报警、不逃走，而是顺着对方的话继续问下去。这个选择让局面从委托变成了试探。',
    },
    {
      id: 'p006',
      text: `${goal.endingHook}临近结尾时，主角发现那件小物件的位置变了。不是被人移动过，而是它从一开始就不该存在。`,
    },
  ];
  return {
    id: `draft:${goal.chapterId}:v${versionNumber}`,
    chapterId: goal.chapterId,
    versionNumber,
    sourceNodeId: versionNumber === 1 ? 'draft' : 'rewrite-a',
    model: versionNumber === 1 ? 'DeepSeek' : 'DeepSeek 定向返工',
    paragraphs,
    notes: versionNumber === 1 ? '根据作品圣经和章节目标卡生成的初稿。' : '根据审计报告和人工批注生成的返工稿。',
    createdAt: now(),
  };
}

function runStructureAudit({ draft, goal }) {
  assertDraft(draft);
  assertObject(goal, 'goal');
  assertString(goal.conflictGoal, 'goal.conflictGoal');
  if (!draft || !goal) throw new Error('Missing draft or chapter goal.');
  const needsMotivation = draft.versionNumber === 1;
  const issues = needsMotivation
    ? [
        {
          id: `issue:${draft.id}:motivation`,
          paragraphId: 'p005',
          category: '结构审计',
          severity: 'high',
          problem: '主角选择继续追问的动机还不够硬，读者可能觉得只是为了剧情留下。',
          suggestion: '补一个外部压力或职业判断，让她留下来有利益、风险或责任。',
          fixInstruction: '重写 p005，保留主角继续追问的结果，但加入她不能立刻离开的理由。',
        },
        {
          id: `issue:${draft.id}:clue`,
          paragraphId: 'p004',
          category: '结构审计',
          severity: 'medium',
          problem: '关键物件作为线索出现，但和本章目标的关联还可以更明确。',
          suggestion: '让物件与章节钩子形成可复查的因果关系。',
          fixInstruction: '微调 p004，让反常物件和结尾钩子互相咬合。',
        },
      ]
    : [];
  return {
    id: `review:${draft.chapterId}:structure:v${draft.versionNumber}`,
    chapterId: draft.chapterId,
    nodeId: 'audit-b',
    model: 'GPT/Codex',
    score: needsMotivation ? 72 : 90,
    passed: !needsMotivation,
    summary: needsMotivation ? '结构上可读，但主角动机和线索咬合需要返工。' : `结构审计通过：${goal.conflictGoal}`,
    issues,
    createdAt: now(),
  };
}

function runStyleAudit({ draft }) {
  assertDraft(draft);
  if (!draft) throw new Error('Missing draft.');
  const hasAiRisk = draft.versionNumber < 2;
  const issues = hasAiRisk
    ? [
        {
          id: `issue:${draft.id}:style`,
          paragraphId: 'p002',
          category: 'AI味审计',
          severity: 'medium',
          problem: '该段偏概括，动作和身体反应不足，读感略像剧情摘要。',
          suggestion: '加入具体动作、停顿或物件反应，降低总结腔。',
          fixInstruction: '改写 p002，用具体动作承载主角的迟疑。',
        },
      ]
    : [];
  return {
    id: `review:${draft.chapterId}:style:v${draft.versionNumber}`,
    chapterId: draft.chapterId,
    nodeId: 'audit-c',
    model: 'MiniMax',
    score: hasAiRisk ? 82 : 92,
    passed: !hasAiRisk || draft.versionNumber >= 2,
    summary: hasAiRisk ? '语言基本可用，但 p002 仍有轻微总结腔。' : 'AI 味审计通过：句式、动作和对白节奏可接受。',
    issues,
    createdAt: now(),
  };
}

function runFinalJudge({ draft, reports = [] }) {
  assertDraft(draft);
  assertArray(reports, 'reports');
  if (!draft) throw new Error('Missing draft.');
  const blockingIssues = reports
    .filter((report) => report.chapterId === draft.chapterId)
    .flatMap((report) => report.issues || [])
    .filter((issue) => issue.severity === 'critical' || issue.severity === 'high');
  const passed = blockingIssues.length === 0 || draft.versionNumber >= 2;
  return {
    id: `review:${draft.chapterId}:judge:v${draft.versionNumber}`,
    chapterId: draft.chapterId,
    nodeId: 'judge',
    model: 'GPT/Codex',
    score: passed ? 91 : 76,
    passed,
    summary: passed ? '最终验收通过，可以交给用户读稿。' : '仍存在阻断项，需要回到 A 定向修改。',
    issues: passed ? [] : blockingIssues,
    createdAt: now(),
  };
}

function rewriteDraft({ draft, reports = [], annotations = [] }) {
  assertDraft(draft);
  assertArray(reports, 'reports');
  assertArray(annotations, 'annotations');
  if (!draft) throw new Error('Missing draft.');
  const targets = new Set();
  reports.forEach((report) => (report.issues || []).forEach((issue) => targets.add(issue.paragraphId)));
  annotations.filter((annotation) => annotation.status === 'sent_to_ai').forEach((annotation) => targets.add(annotation.paragraphId));
  const paragraphs = draft.paragraphs.map((paragraph) => {
    if (!targets.has(paragraph.id)) return paragraph;
    if (paragraph.id === 'p005') {
      return {
        ...paragraph,
        text: '主角没有立刻报警。她看见对方袖口里露出的病历编号，那是只有诊所内部档案才会出现的格式。若现在把人赶走，她可能永远不知道是谁把自己的档案交到了嫌疑人手里。',
        hasComment: false,
      };
    }
    if (paragraph.id === 'p004') {
      return {
        ...paragraph,
        text: '桌角那枚旧铜扣吸住了她的视线。它和来客外套上的缺口严丝合缝，却干净得没有一点雨水，像是提前等在这里。',
        hasComment: false,
      };
    }
    if (paragraph.id === 'p002') {
      return {
        ...paragraph,
        text: '她把预约表推回抽屉，钥匙还没转到底，门框忽然轻响。一下。两下。林照的手停在锁孔上，指腹被钥匙齿硌了一下。',
        hasComment: false,
      };
    }
    return { ...paragraph, text: `${paragraph.text} 这一段已经按审计意见补足动作、动机和可复查细节。`, hasComment: false };
  });
  return {
    id: `draft:${draft.chapterId}:v${draft.versionNumber + 1}`,
    chapterId: draft.chapterId,
    versionNumber: draft.versionNumber + 1,
    sourceNodeId: 'rewrite-a',
    model: 'DeepSeek 定向返工',
    paragraphs,
    notes: '根据结构审计、AI 味审计和人工批注生成的返工稿。',
    createdAt: now(),
  };
}

function generateMemory({ project, bible, goal, draft }) {
  assertObject(project, 'project');
  assertObject(bible, 'bible');
  assertObject(goal, 'goal');
  assertDraft(draft);
  assertString(project.title, 'project.title');
  assertString(goal.chapterId, 'goal.chapterId');
  assertString(goal.plotGoal, 'goal.plotGoal');
  assertString(bible.protagonist, 'bible.protagonist');
  if (!project || !bible || !goal || !draft) throw new Error('Missing project, bible, goal, or draft.');
  return {
    id: `memory:${goal.chapterId}`,
    chapterId: goal.chapterId,
    summary: `${project.title} 当前章完成：${goal.plotGoal} 定稿版本为 V${draft.versionNumber}，核心钩子已经落到具体反常细节。`,
    keyEvents: ['主角的日常秩序被异常事件打断。', '主角发现一个能在后续复查的具体线索。', '主角主动做出带风险的选择，进入主线冲突。'],
    characterChanges: [`${bible.protagonist} 从旁观判断者转为主动试探者。`, '主角开始意识到自己的能力或经验并不可靠。'],
    foreshadowingUpdates: ['反常物件的位置和来源需要在后续章节回收。', '主角档案或身份信息被外部势力掌握。'],
    nextChapterBrief: '下一章应让主角追查线索来源，同时引入第二个能挑战主角判断的人。',
    createdAt: now(),
  };
}

async function routeOrchestrator(pathname, payload) {
  if (pathname === '/api/orchestrator/status') return { ok: true, providerMode: PROVIDER_MODE, live: isLiveMode(), providerStatus: getProviderStatus() };
  if (pathname === '/api/orchestrator/logs') return { ok: true, calls: getProviderLogs(payload?.limit), providerStatus: getProviderStatus() };
  if (pathname === '/api/orchestrator/candidates') {
    return isLiveMode()
      ? liveCandidates(payload)
      : {
          candidates: generateCandidates(payload),
          providerSource: 'backend-deterministic',
          providerMode: PROVIDER_MODE,
          providerMessage: 'Local deterministic backend generated candidates without calling a model API.',
        };
  }
  if (pathname === '/api/orchestrator/project') return createProjectBundle(payload.candidate);
  if (pathname === '/api/orchestrator/draft') return isLiveMode() ? liveDraft(payload) : { draft: generateDraft(payload) };
  if (pathname === '/api/orchestrator/audit/structure') return isLiveMode() ? liveStructureAudit(payload) : { report: runStructureAudit(payload) };
  if (pathname === '/api/orchestrator/audit/style') return isLiveMode() ? liveStyleAudit(payload) : { report: runStyleAudit(payload) };
  if (pathname === '/api/orchestrator/judge') return isLiveMode() ? liveJudge(payload) : { report: runFinalJudge(payload) };
  if (pathname === '/api/orchestrator/rewrite') return isLiveMode() ? liveRewrite(payload) : { draft: rewriteDraft(payload) };
  if (pathname === '/api/orchestrator/memory') return isLiveMode() ? liveMemory(payload) : { memory: generateMemory(payload) };
  return null;
}

function isLiveMode() {
  return PROVIDER_MODE === 'live';
}

async function liveCandidates(payload) {
  const fallback = generateCandidates(payload);
  const result = await runJsonRole(
    'candidates',
    jsonMessages({
      persona: '你是网文项目策划模型，擅长把灵感扩成可连载的高概念小说方案。',
      task: '生成 3 个差异明显的小说候选。每个候选要有强钩子、可持续冲突、清晰主角压力，不要写成设定百科。',
      payload: { input: payload },
      schema: { candidates: fallback.map(({ id, ...candidate }) => candidate) },
      qualityRules: [
        'title 要短而有记忆点。',
        'logline 用一句话说明主角、异常规则和核心困境。',
        'openingHook 必须是第一章可以直接开场的具体场景。',
        'toneTags 返回 3-5 个短标签。',
      ],
    }),
    { maxTokens: 2200, validate: validateCandidatesValue }
  );
  if (!result.ok || !Array.isArray(result.value?.candidates)) {
    return {
      candidates: fallback,
      providerFallback: result.errors || [],
      providerTrace: traceFromResult(result, true),
      providerSource: 'backend-deterministic-fallback',
      providerMessage: 'Live candidate generation failed; backend returned deterministic fallback.',
    };
  }
  const candidates = result.value.candidates
    .slice(0, 5)
    .map((candidate, index) => normalizeCandidate(candidate, payload?.genre || DEFAULT_GENRE, index))
    .filter(Boolean);
  return candidates.length
    ? {
        candidates,
        provider: result.provider,
        model: result.model,
        providerTrace: traceFromResult(result, false),
        providerSource: 'live-model',
        providerMessage: `Generated by ${result.provider}/${result.model}.`,
      }
    : {
        candidates: fallback,
        providerFallback: ['No valid candidates returned.'],
        providerTrace: traceFromResult(result, true),
        providerSource: 'backend-deterministic-fallback',
        providerMessage: 'Live model returned no valid candidates; backend returned deterministic fallback.',
      };
}

async function liveDraft(payload) {
  const fallback = generateDraft(payload);
  const result = await runJsonRole(
    'draft',
    jsonMessages({
      persona: '你是中文小说正文写作模型，负责写可读的章节初稿。',
      task: '写本章正文初稿，返回 6-10 个自然段。必须像正文，不要像提纲、总结或设定说明。',
      payload: { bible: payload.bible, goal: payload.goal, versionNumber: payload.versionNumber || 1 },
      schema: { paragraphs: [{ id: 'p001', text: '段落正文' }], notes: '本次生成说明' },
      qualityRules: [
        '每段推进一个具体动作、发现、误判或选择。',
        '用物件、动作、停顿、对话承载信息，减少抽象解释。',
        '第一段直接承接 openingImage，最后一段落到 endingHook。',
        '保持主角主动性，让风险选择有可理解动机。',
      ],
    }),
    { maxTokens: 5000, validate: validateDraftValue }
  );
  const paragraphs = normalizeParagraphs(result.value?.paragraphs);
  if (!result.ok || !paragraphs.length) return { draft: fallback, providerFallback: result.errors || [], providerTrace: traceFromResult(result, true) };
  return {
    draft: {
      ...fallback,
      model: `${result.provider}/${result.model}`,
      paragraphs,
      notes: String(result.value.notes || fallback.notes),
    },
    providerTrace: traceFromResult(result, false),
  };
}

async function liveStructureAudit(payload) {
  const fallback = runStructureAudit(payload);
  const result = await runJsonRole(
    'structureAudit',
    jsonMessages({
      persona: '你是中文小说结构审稿模型，专门检查章节目标、动机、冲突和线索因果。',
      task: '审查本章结构。只指出会影响读者理解、推进或后续返工的问题；不要泛泛夸奖。',
      payload: { draft: payload.draft, goal: payload.goal },
      schema: reviewSchema('结构审计'),
      qualityRules: [
        'issue 必须绑定到 paragraphId。',
        'problem 描述当前文本的问题，不要只说建议。',
        'fixInstruction 要能直接交给返工模型执行。',
        'passed=true 时 issues 必须为空。',
      ],
    }),
    { maxTokens: 2600, validate: validateReviewValue }
  );
  return { report: mergeReviewReport(fallback, result, 'audit-b') };
}

async function liveStyleAudit(payload) {
  const fallback = runStyleAudit(payload);
  const result = await runJsonRole(
    'styleAudit',
    jsonMessages({
      persona: '你是中文小说语言审稿模型，专门降低 AI 味和总结腔。',
      task: '审查语言是否像 AI 摘要、句式是否过于均匀、动作细节是否不足、对话是否替作者解释设定。',
      payload: { draft: payload.draft },
      schema: reviewSchema('AI味审计'),
      qualityRules: [
        '优先检查抽象判断、概念堆叠、均匀长句和缺少身体动作。',
        'suggestion 要给出具体改法，例如加动作、换物件、拆句、改对话潜台词。',
        '不要因为题材设定复杂就误判为 AI 味。',
      ],
    }),
    { maxTokens: 2600, validate: validateReviewValue }
  );
  return { report: mergeReviewReport(fallback, result, 'audit-c') };
}

async function liveJudge(payload) {
  const fallback = runFinalJudge(payload);
  const result = await runJsonRole(
    'judge',
    jsonMessages({
      persona: '你是最终验收模型，负责判断章节是否可以交给用户读稿。',
      task: '综合草稿和审计报告，只保留阻断交付的问题。非阻断问题不要反复拦截。',
      payload: { draft: payload.draft, reports: payload.reports },
      schema: reviewSchema('最终验收'),
      qualityRules: [
        '如果没有 high/critical 级阻断问题，passed 应为 true。',
        'summary 要明确下一步：可读稿、需返工、或只需人工确认。',
        '不要新增与报告无关的空泛问题。',
      ],
    }),
    { maxTokens: 2200, validate: validateReviewValue }
  );
  return { report: mergeReviewReport(fallback, result, 'judge') };
}

async function liveRewrite(payload) {
  const fallback = rewriteDraft(payload);
  const result = await runJsonRole(
    'rewrite',
    jsonMessages({
      persona: '你是中文小说定向返工模型，负责按审计和人工批注改段落。',
      task: '只重写需要处理的段落，保留 paragraph id。可以补动作、动机、线索因果和对话潜台词，但不要改变章节核心事件。后端会按 paragraph id 合并回原章，不要改 id。',
      payload: { draft: payload.draft, reports: payload.reports, annotations: payload.annotations },
      schema: { paragraphs: [{ id: 'p001', text: '改写后的段落正文' }], notes: '返工说明' },
      qualityRules: [
        '人工批注优先级高于模型审计。',
        '若某段无问题，可以原样返回或省略；但返回的段落必须是完整正文。',
        '去掉总结腔，增加具体行为和可复查线索。',
      ],
    }),
    { maxTokens: 5000, validate: (value) => validateRewriteValue(value, payload.draft) }
  );
  const paragraphs = normalizeParagraphs(result.value?.paragraphs);
  if (!result.ok || !paragraphs.length) return { draft: fallback, providerFallback: result.errors || [], providerTrace: traceFromResult(result, true) };
  const mergedParagraphs = mergeParagraphPatch(fallback.paragraphs, paragraphs);
  return {
    draft: {
      ...fallback,
      model: `${result.provider}/${result.model}`,
      paragraphs: mergedParagraphs,
      notes: String(result.value.notes || fallback.notes),
    },
    providerTrace: traceFromResult(result, false),
  };
}

async function liveMemory(payload) {
  const fallback = generateMemory(payload);
  const result = await runJsonRole(
    'memory',
    jsonMessages({
      persona: '你是长篇小说记忆整理模型，负责把定稿章节整理成后续可检索资料。',
      task: '生成章节记忆包，保留事实、人物变化、伏笔和下一章衔接，不要写评论。',
      payload: { project: payload.project, bible: payload.bible, goal: payload.goal, draft: payload.draft },
      schema: {
        summary: '章节摘要',
        keyEvents: ['关键事件'],
        characterChanges: ['人物变化'],
        foreshadowingUpdates: ['伏笔更新'],
        nextChapterBrief: '下一章建议',
      },
      qualityRules: [
        'keyEvents 必须是本章真实发生的事件。',
        'foreshadowingUpdates 要能被后续章节回收。',
        'nextChapterBrief 要给出下一章可执行的冲突方向。',
      ],
    }),
    { maxTokens: 2600, validate: validateMemoryValue }
  );
  if (!result.ok || !result.value || typeof result.value.summary !== 'string') return { memory: fallback, providerFallback: result.errors || [], providerTrace: traceFromResult(result, true) };
  return {
    memory: {
      ...fallback,
      summary: result.value.summary || fallback.summary,
      keyEvents: normalizeStringArray(result.value.keyEvents, fallback.keyEvents),
      characterChanges: normalizeStringArray(result.value.characterChanges, fallback.characterChanges),
      foreshadowingUpdates: normalizeStringArray(result.value.foreshadowingUpdates, fallback.foreshadowingUpdates),
      nextChapterBrief: result.value.nextChapterBrief || fallback.nextChapterBrief,
      model: `${result.provider}/${result.model}`,
    },
    providerTrace: traceFromResult(result, false),
  };
}

function mergeReviewReport(fallback, result, nodeId) {
  if (!result.ok || !result.value) return { ...fallback, providerFallback: result.errors || [], providerTrace: traceFromResult(result, true) };
  const passed = typeof result.value.passed === 'boolean' ? result.value.passed : fallback.passed;
  const normalizedIssues = Array.isArray(result.value.issues)
    ? result.value.issues.map((issue, index) => normalizeIssue(issue, fallback, index)).filter(Boolean)
    : fallback.issues;
  const issues = passed ? [] : normalizedIssues;
  return {
    ...fallback,
    nodeId,
    model: `${result.provider}/${result.model}`,
    score: Number.isFinite(Number(result.value.score)) ? clamp(Number(result.value.score), 0, 100) : fallback.score,
    passed,
    summary: typeof result.value.summary === 'string' && result.value.summary.trim() ? result.value.summary.trim() : fallback.summary,
    issues,
    providerTrace: traceFromResult(result, false),
  };
}

function normalizeCandidate(candidate, fallbackGenre, index) {
  if (!candidate || typeof candidate !== 'object') return null;
  const title = String(candidate.title || '').trim();
  const logline = String(candidate.logline || '').trim();
  const protagonist = String(candidate.protagonist || '').trim();
  const coreConflict = String(candidate.coreConflict || '').trim();
  const openingHook = String(candidate.openingHook || '').trim();
  if (!title || !logline || !protagonist || !coreConflict || !openingHook) return null;
  return {
    id: candidateId(title, index),
    title,
    genre: String(candidate.genre || fallbackGenre || DEFAULT_GENRE),
    logline,
    protagonist,
    coreConflict,
    openingHook,
    toneTags: normalizeStringArray(candidate.toneTags, ['AI generated', 'to review']),
  };
}

function normalizeParagraphs(paragraphs) {
  if (!Array.isArray(paragraphs)) return [];
  return paragraphs
    .map((paragraph, index) => {
      const text = typeof paragraph === 'string' ? paragraph : paragraph?.text;
      if (typeof text !== 'string' || !text.trim()) return null;
      return {
        id: typeof paragraph?.id === 'string' && paragraph.id.trim() ? paragraph.id.trim() : `p${String(index + 1).padStart(3, '0')}`,
        text: text.trim(),
      };
    })
    .filter(Boolean);
}

function mergeParagraphPatch(baseParagraphs, patchParagraphs) {
  const patchById = new Map(patchParagraphs.map((paragraph) => [paragraph.id, paragraph]));
  return baseParagraphs.map((paragraph) => {
    const patched = patchById.get(paragraph.id);
    if (!patched) return paragraph;
    return {
      ...paragraph,
      text: patched.text,
      hasComment: false,
    };
  });
}

function normalizeIssue(issue, fallback, index) {
  if (!issue || typeof issue !== 'object') return null;
  const problem = String(issue.problem || '').trim();
  if (!problem) return null;
  return {
    id: String(issue.id || `issue:${fallback.id}:live:${index + 1}`),
    paragraphId: String(issue.paragraphId || 'p001'),
    category: String(issue.category || 'review'),
    severity: ['critical', 'high', 'medium', 'low'].includes(issue.severity) ? issue.severity : 'medium',
    problem,
    suggestion: String(issue.suggestion || ''),
    fixInstruction: String(issue.fixInstruction || issue.suggestion || problem),
  };
}

function normalizeStringArray(value, fallback) {
  if (!Array.isArray(value)) return fallback;
  const next = value.map((item) => String(item || '').trim()).filter(Boolean);
  return next.length ? next : fallback;
}

function validateCandidatesValue(value) {
  if (!value || typeof value !== 'object' || !Array.isArray(value.candidates)) return 'candidates must be an array';
  if (!value.candidates.length) return 'candidates must not be empty';
  const invalid = value.candidates.find((candidate) => !candidate || typeof candidate !== 'object' || !String(candidate.title || '').trim() || !String(candidate.logline || '').trim());
  return invalid ? 'each candidate needs title and logline' : '';
}

function validateDraftValue(value) {
  if (!value || typeof value !== 'object' || !Array.isArray(value.paragraphs)) return 'paragraphs must be an array';
  return normalizeParagraphs(value.paragraphs).length ? '' : 'paragraphs must contain text';
}

function validateReviewValue(value) {
  if (!value || typeof value !== 'object') return 'review must be an object';
  if (typeof value.passed !== 'boolean') return 'passed must be boolean';
  if (!Number.isFinite(Number(value.score))) return 'score must be numeric';
  if (typeof value.summary !== 'string' || !value.summary.trim()) return 'summary must be a non-empty string';
  if (!Array.isArray(value.issues)) return 'issues must be an array';
  if (value.passed && value.issues.length > 0) return 'passed review must not include issues';
  const invalidIssue = value.issues.find((issue) => !issue || typeof issue !== 'object' || !String(issue.problem || '').trim());
  return invalidIssue ? 'each issue needs a problem' : '';
}

function validateRewriteValue(value, draft) {
  const draftIds = new Set((draft?.paragraphs || []).map((paragraph) => paragraph.id));
  if (!value || typeof value !== 'object' || !Array.isArray(value.paragraphs)) return 'paragraphs must be an array';
  const paragraphs = normalizeParagraphs(value.paragraphs);
  if (!paragraphs.length) return 'rewrite must return at least one paragraph patch';
  return paragraphs.some((paragraph) => draftIds.has(paragraph.id)) ? '' : 'rewrite paragraph ids must match the draft';
}

function validateMemoryValue(value) {
  if (!value || typeof value !== 'object') return 'memory must be an object';
  if (typeof value.summary !== 'string' || !value.summary.trim()) return 'summary must be a non-empty string';
  if (!Array.isArray(value.keyEvents)) return 'keyEvents must be an array';
  if (!Array.isArray(value.characterChanges)) return 'characterChanges must be an array';
  if (!Array.isArray(value.foreshadowingUpdates)) return 'foreshadowingUpdates must be an array';
  return typeof value.nextChapterBrief === 'string' && value.nextChapterBrief.trim() ? '' : 'nextChapterBrief must be a non-empty string';
}

function jsonMessages({ persona, task, payload, schema, qualityRules = [] }) {
  return [
    systemPrompt(
      [
        persona,
        '你必须只返回一个 JSON object，不能返回 markdown、代码围栏、解释、前后缀或多余文本。',
        '所有字符串字段都要使用中文自然表达；数组字段必须返回数组，不能返回逗号分隔字符串。',
        '如果信息不足，也要基于输入做合理创作，不要向用户反问。',
      ].join('\n')
    ),
    userPrompt({
      task,
      payload,
      qualityRules,
      outputSchema: schema,
      contract: {
        jsonOnly: true,
        noMarkdown: true,
        noExtraKeysRequired: false,
        requiredTopLevelShape: Object.keys(schema || {}),
      },
    }),
  ];
}

function reviewSchema(category) {
  return {
    score: 88,
    passed: false,
    summary: '简短结论',
    issues: [
      {
        paragraphId: 'p001',
        category,
        severity: 'medium',
        problem: '当前文本中的具体问题',
        suggestion: '具体修改建议',
        fixInstruction: '可直接交给返工模型的改写指令',
      },
    ],
  };
}

function systemPrompt(content) {
  return { role: 'system', content };
}

function userPrompt(value) {
  return { role: 'user', content: JSON.stringify(value, null, 2) };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function traceFromResult(result, fallback) {
  return {
    ok: Boolean(result?.ok),
    fallback,
    providerId: result?.providerId || null,
    provider: result?.provider || null,
    model: result?.model || null,
    latencyMs: result?.latencyMs || 0,
    attempts: Array.isArray(result?.attempts) ? result.attempts : [],
    errors: Array.isArray(result?.errors) ? result.errors : [],
  };
}

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function assertObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw createHttpError(400, `${label} must be an object.`);
  }
}

function assertArray(value, label) {
  if (!Array.isArray(value)) {
    throw createHttpError(400, `${label} must be an array.`);
  }
}

function assertString(value, label) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw createHttpError(400, `${label} must be a non-empty string.`);
  }
}

function assertDraft(draft) {
  assertObject(draft, 'draft');
  assertString(draft.id, 'draft.id');
  assertString(draft.chapterId, 'draft.chapterId');
  assertArray(draft.paragraphs, 'draft.paragraphs');
}

module.exports = {
  routeOrchestrator,
};
