import { ArrowRight, Feather, RefreshCw, Sparkles } from "lucide-react";
import heroImage from "../assets/inkwell-workbench-hero.webp";
import type { CandidateGenerationResult, ProjectMode, ProviderTrace, StoryCandidate } from "../types/domain";

interface CreationPanelProps {
  mode: ProjectMode;
  genre: string;
  spark: string;
  onModeChange: (mode: ProjectMode) => void;
  onGenreChange: (genre: string) => void;
  onSparkChange: (spark: string) => void;
  onGenerate: () => void;
  isGenerating?: boolean;
  selectedId: string;
  onSelect: (id: string) => void;
  onStart: () => void | Promise<void>;
  candidates: StoryCandidate[];
  providerTrace?: ProviderTrace | null;
  providerFallback?: string[];
  providerSource?: CandidateGenerationResult["providerSource"] | null;
  providerMessage?: string;
}

const genres = ["都市悬疑", "科幻悬疑", "玄幻权谋", "仙侠群像"];

export function CreationPanel({
  mode,
  genre,
  spark,
  onModeChange,
  onGenreChange,
  onSparkChange,
  onGenerate,
  isGenerating = false,
  selectedId,
  onSelect,
  onStart,
  candidates,
  providerTrace,
  providerFallback,
  providerSource,
  providerMessage,
}: CreationPanelProps) {
  const sourceLabel = formatSourceLabel(providerSource, providerTrace, providerFallback);
  const sourceTone = formatSourceTone(providerSource, providerTrace, providerFallback);
  const sourceDetail = providerMessage || providerFallback?.[0] || "";
  return (
    <section className="creation-panel">
      <div className="creation-copy">
        <span className="eyebrow">Inkwell 2.0</span>
        <h1>把灵感交给 AI，把裁决留给你。</h1>
        <p>
          选择类型或丢下一句灵感，平台生成多个小说方向。你挑一个满意的，后面进入多模型写作、审计、返工和读稿工作流。
        </p>
        <figure className="creation-visual">
          <img src={heroImage} alt="" />
        </figure>
        <div className="mode-switch" aria-label="创作入口">
          <button className={mode === "genre" ? "active" : ""} onClick={() => onModeChange("genre")}>
            <Sparkles size={16} />
            选类型
          </button>
          <button className={mode === "spark" ? "active" : ""} onClick={() => onModeChange("spark")}>
            <Feather size={16} />
            写灵感
          </button>
        </div>
        <div className="prompt-box">
          {mode === "genre" ? (
            <>
              <label>小说类型</label>
              <div className="chip-row">
                {genres.map((item) => (
                  <button className={genre === item ? "active" : ""} key={item} onClick={() => onGenreChange(item)}>
                    {item}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <label>你的灵感</label>
              <textarea value={spark} onChange={(event) => onSparkChange(event.target.value)} />
            </>
          )}
          <button className="secondary-action generate-action" onClick={onGenerate} disabled={isGenerating}>
            <RefreshCw size={17} />
            {isGenerating ? "生成中..." : "生成 3 个方向"}
          </button>
          {(sourceLabel || sourceDetail) && (
            <div className={`candidate-source-banner ${sourceTone}`}>
              <strong>{sourceLabel || "候选生成状态"}</strong>
              {sourceDetail && <span>{sourceDetail}</span>}
              {providerFallback?.length ? <span>{providerFallback.slice(0, 2).join(" · ")}</span> : null}
            </div>
          )}
        </div>
      </div>

      <div className="candidate-board">
        <div className="board-header">
          <div>
            <span className="eyebrow">AI 企划候选</span>
            <h2>选一个方向开写</h2>
            {(sourceLabel || sourceDetail) && (
              <small className="provider-inline">
                {sourceLabel}
                {providerTrace ? ` · ${formatLatency(providerTrace.latencyMs)}` : ""}
                {sourceDetail ? ` · ${sourceDetail}` : ""}
              </small>
            )}
          </div>
          <button className="primary-action" onClick={onStart}>
            进入工作流
            <ArrowRight size={18} />
          </button>
        </div>
        <div className="candidate-grid">
          {candidates.map((candidate) => (
            <button
              className={`candidate-card ${selectedId === candidate.id ? "selected" : ""}`}
              key={candidate.id}
              onClick={() => onSelect(candidate.id)}
            >
              <span className="genre">{candidate.genre}</span>
              <strong>{candidate.title}</strong>
              <p>{candidate.logline}</p>
              <dl>
                <dt>主角</dt>
                <dd>{candidate.protagonist}</dd>
                <dt>冲突</dt>
                <dd>{candidate.coreConflict}</dd>
              </dl>
              <div className="tag-row">
                {candidate.toneTags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function formatSourceLabel(
  source: CandidateGenerationResult["providerSource"] | null | undefined,
  trace?: ProviderTrace | null,
  fallback?: string[]
) {
  if (source === "live-model" && trace) return `live model: ${formatProvider(trace)}`;
  if (source === "backend-deterministic") return "local backend: deterministic";
  if (source === "backend-deterministic-fallback") return "backend fallback: deterministic";
  if (source === "frontend-fallback") return "frontend fallback: mock data";
  if (trace) return trace.fallback ? `backend fallback: ${formatProvider(trace)}` : `live model: ${formatProvider(trace)}`;
  if (fallback?.length) return "frontend fallback: mock data";
  return "";
}

function formatSourceTone(
  source: CandidateGenerationResult["providerSource"] | null | undefined,
  trace?: ProviderTrace | null,
  fallback?: string[]
) {
  if (source === "live-model" && !trace?.fallback) return "live";
  if (source === "backend-deterministic") return "deterministic";
  if (source === "backend-deterministic-fallback") return "warning";
  if (source === "frontend-fallback") return "error";
  if (trace?.fallback || fallback?.length) return "warning";
  return "neutral";
}

function formatProvider(trace: ProviderTrace) {
  if (!trace.provider && !trace.model) return "local";
  if (!trace.provider) return trace.model || "unknown";
  if (!trace.model) return trace.provider;
  return `${trace.provider}/${trace.model}`;
}

function formatLatency(latencyMs: number) {
  if (!Number.isFinite(latencyMs) || latencyMs <= 0) return "0ms";
  if (latencyMs < 1000) return `${Math.round(latencyMs)}ms`;
  return `${(latencyMs / 1000).toFixed(1)}s`;
}
