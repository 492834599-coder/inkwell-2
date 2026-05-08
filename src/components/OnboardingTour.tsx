import { ArrowRight, CheckCircle2, X } from "lucide-react";
import { useState } from "react";

type View = "create" | "workspace" | "workflow" | "reader" | "prompts";

interface TourStep {
  eyebrow: string;
  title: string;
  body: string;
  action: string;
  view: View;
}

interface OnboardingTourProps {
  onClose: () => void;
  onNavigate: (view: View) => void;
}

const steps: TourStep[] = [
  {
    eyebrow: "第一步",
    title: "从一句类型或灵感开始",
    body: "你只需要选择小说类型，或者写下一句脑洞。平台会给出多个书名、主角和方向，让你挑满意的种子。",
    action: "去创作入口",
    view: "create",
  },
  {
    eyebrow: "第二步",
    title: "用工作流管住 AI",
    body: "A 模型写，B 模型审结构，A 再返工，C 模型审 AI 味，最终验收。每一步都可单独重跑。",
    action: "看章节工作流",
    view: "workflow",
  },
  {
    eyebrow: "第三步",
    title: "人只负责读稿和裁决",
    body: "读稿时你可以给段落做批注。只要存在批注，系统就会把意见回流给改写节点。",
    action: "看读稿页",
    view: "reader",
  },
  {
    eyebrow: "新增关卡",
    title: "发布前做朱雀复测",
    body: "用户满意后，系统会把正文交给朱雀检测。AI 特征偏高就回流降痕改写，匿名额度用完则提示扫码登录。",
    action: "看复测节点",
    view: "workflow",
  },
  {
    eyebrow: "进阶",
    title: "提示词和模型可替换",
    body: "DeepSeek、MiniMax、GPT/Codex 都是节点角色的一部分。后端接入后，这里会变成真正的模型编排面板。",
    action: "看提示词",
    view: "prompts",
  },
];

export function OnboardingTour({ onClose, onNavigate }: OnboardingTourProps) {
  const [index, setIndex] = useState(0);
  const step = steps[index];
  const isLast = index === steps.length - 1;

  return (
    <div className="tour-backdrop" role="dialog" aria-modal="true" aria-label="墨池 2.0 新手教学">
      <article className="tour-card">
        <button className="tour-close" onClick={onClose} aria-label="关闭教学">
          <X size={18} />
        </button>
        <span className="eyebrow">{step.eyebrow}</span>
        <h2>{step.title}</h2>
        <p>{step.body}</p>
        <div className="tour-progress" aria-label={`第 ${index + 1} 步，共 ${steps.length} 步`}>
          {steps.map((item, stepIndex) => (
            <span className={stepIndex <= index ? "active" : ""} key={item.title} />
          ))}
        </div>
        <div className="tour-actions">
          <button
            className="secondary-action"
            onClick={() => {
              onNavigate(step.view);
              onClose();
            }}
          >
            {step.action}
            <ArrowRight size={16} />
          </button>
          <button
            className="primary-action"
            onClick={() => {
              if (isLast) {
                onClose();
                return;
              }
              setIndex(index + 1);
            }}
          >
            {isLast ? "开始使用" : "下一步"}
            {isLast ? <CheckCircle2 size={16} /> : <ArrowRight size={16} />}
          </button>
        </div>
      </article>
    </div>
  );
}
