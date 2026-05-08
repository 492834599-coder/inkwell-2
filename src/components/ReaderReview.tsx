import { ArrowLeft, CheckCircle2, MessageSquarePlus, Send } from "lucide-react";
import type { DraftParagraph, UserAnnotation } from "../types/domain";

interface ReaderReviewProps {
  paragraphs: DraftParagraph[];
  annotations: UserAnnotation[];
  onBack: () => void;
  onAddAnnotation: (paragraphId: string, text: string) => void;
  onApprove: () => void;
  onSendAnnotations: () => void;
}

export function ReaderReview({ paragraphs, annotations, onBack, onAddAnnotation, onApprove, onSendAnnotations }: ReaderReviewProps) {
  const openCount = annotations.filter((annotation) => annotation.status === "open").length;

  return (
    <section className="reader-page">
      <header className="section-header">
        <div>
          <span className="eyebrow">人工读稿关卡</span>
          <h1>读到不对劲，就圈出来交给 AI。</h1>
          <p>用户批注拥有最高优先级。只要存在未解决批注，章节就回到修改工作流。</p>
        </div>
        <div className="header-actions">
          <button className="secondary-action" onClick={onBack}>
            <ArrowLeft size={17} />
            返回工作流
          </button>
          <button className="primary-action" onClick={onApprove}>
            <CheckCircle2 size={17} />
            满意，准备定稿
          </button>
        </div>
      </header>

      <div className="reader-layout">
        <article className="manuscript">
          {paragraphs.length === 0 && (
            <div className="empty-manuscript">
              <strong>还没有章节正文</strong>
              <p>先回到章节工作流，运行 “A 写作” 节点生成第一版初稿。</p>
            </div>
          )}
          {paragraphs.map((paragraph) => (
            <p className={paragraph.hasComment ? "commented" : ""} key={paragraph.id}>
              <span>{paragraph.id}</span>
              {paragraph.text}
              <button
                title="给这一段添加批注"
                onClick={() => {
                  const text = window.prompt("给这一段写一句批注", "这里读感不对，请让 AI 重新处理。");
                  if (text?.trim()) onAddAnnotation(paragraph.id, text.trim());
                }}
              >
                <MessageSquarePlus size={15} />
              </button>
            </p>
          ))}
        </article>
        <aside className="annotation-panel">
          <span className="eyebrow">批注回流</span>
          <h2>{annotations.length} 条人工意见</h2>
          <p>{openCount > 0 ? `还有 ${openCount} 条待送回 AI。` : "当前没有待处理人工批注。"}</p>
          {annotations.map((annotation) => (
            <div className="annotation-card" key={annotation.id}>
              <strong>{annotation.paragraphId}</strong>
              <p>{annotation.text}</p>
              <span>{annotation.status === "sent_to_ai" ? "已送回 AI 修改" : "待处理"}</span>
            </div>
          ))}
          <button className="primary-action wide" onClick={onSendAnnotations}>
            <Send size={17} />
            把批注送回工作流
          </button>
        </aside>
      </div>
    </section>
  );
}
