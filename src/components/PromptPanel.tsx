import { FileText } from "lucide-react";
import { useEffect, useState } from "react";
import { getMiniMaxConfigStatus, type MiniMaxConfigStatus } from "../services/modelConfigClient";
import type { PromptPreset } from "../types/domain";

interface PromptPanelProps {
  presets: PromptPreset[];
}

export function PromptPanel({ presets }: PromptPanelProps) {
  const [miniMaxStatus, setMiniMaxStatus] = useState<MiniMaxConfigStatus | null>(null);
  const [configError, setConfigError] = useState("");

  useEffect(() => {
    let alive = true;
    getMiniMaxConfigStatus()
      .then((status) => {
        if (alive) setMiniMaxStatus(status);
      })
      .catch((error) => {
        if (alive) setConfigError(error instanceof Error ? error.message : "MiniMax 配置探测失败");
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <section className="prompt-page">
      <header className="section-header">
        <div>
          <span className="eyebrow">模型与提示词</span>
          <h1>每个节点都有自己的角色和约束。</h1>
          <p>这里先展示 Prompt 版本草稿。后续接 Orchestrator 时，这些模板会成为真实模型调用的输入。</p>
        </div>
      </header>
      <div className="integration-strip">
        <article className="integration-card">
          <span className="eyebrow">模型配置</span>
          <h2>MiniMax</h2>
          <p>
            {miniMaxStatus
              ? miniMaxStatus.available
                ? `已在本机 OpenClaw/Codex 配置中发现 ${miniMaxStatus.findings.length} 条 MiniMax 线索。`
                : "暂未发现可用 MiniMax 配置。"
              : configError || "正在探测本机 MiniMax 配置..."}
          </p>
          {miniMaxStatus && (
            <div className="integration-tags">
              {Array.from(new Set(miniMaxStatus.findings.map((finding) => finding.authType))).map((authType) => (
                <span key={authType}>{authType}</span>
              ))}
            </div>
          )}
          <small>{miniMaxStatus?.note || "不会在前端显示任何 key/token。"}</small>
        </article>
        <article className="integration-card zhuque">
          <span className="eyebrow">检测服务</span>
          <h2>朱雀复测</h2>
          <p>本地 Playwright 后端会提交正文、解析 AIGC 值，并保存详细报告截图/HTML。</p>
          <div className="integration-tags">
            <span>anonymous 5/day</span>
            <span>扫码登录预留</span>
            <span>报告归档</span>
          </div>
          <small>默认服务地址：http://127.0.0.1:8788</small>
        </article>
      </div>
      <div className="prompt-grid">
        {presets.map((preset) => (
          <article className="prompt-card" key={preset.id}>
            <div className="prompt-card-top">
              <FileText size={18} />
              <span>{preset.nodeId}</span>
            </div>
            <h2>{preset.title}</h2>
            <div className="node-meta">
              <span>{preset.model}</span>
              <span>v{preset.version}</span>
            </div>
            <p>{preset.template}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
