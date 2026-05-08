import { Activity, AlertTriangle, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { requestProviderDiagnostics } from "../services/orchestratorClient";
import type { ProviderDiagnostics } from "../types/domain";

interface ProviderDebugPanelProps {
  refreshKey?: string;
}

export function ProviderDebugPanel({ refreshKey = "" }: ProviderDebugPanelProps) {
  const [diagnostics, setDiagnostics] = useState<ProviderDiagnostics | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const refresh = async () => {
    setIsLoading(true);
    setError("");
    try {
      setDiagnostics(await requestProviderDiagnostics(20));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Provider diagnostics unavailable");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [refreshKey]);

  const providers = diagnostics?.providerStatus.providers || [];
  const calls = diagnostics?.calls || [];
  const missing = diagnostics?.providerStatus.missing || [];

  return (
    <section className="provider-debug-panel">
      <div className="provider-debug-header">
        <div>
          <span className="eyebrow">Provider diagnostics</span>
          <h2>模型调用健康度</h2>
        </div>
        <button className="secondary-action" onClick={refresh} disabled={isLoading}>
          <RefreshCw size={16} />
          刷新
        </button>
      </div>

      {error && (
        <div className="provider-debug-error">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      <div className="provider-health-grid">
        {providers.slice(0, 6).map((provider) => (
          <article className={`provider-health-card status-${provider.health.status}`} key={provider.id}>
            <span>{provider.id}</span>
            <strong>{provider.provider}/{provider.model}</strong>
            <small>
              {provider.health.status} · ok {provider.health.successCount} · fail {provider.health.failureCount}
            </small>
            <small>{provider.api}</small>
            {provider.health.cooldownUntil && <small>cooldown until {provider.health.cooldownUntil}</small>}
            {provider.health.lastError && <small>{provider.health.lastError}</small>}
          </article>
        ))}
      </div>

      {missing.length > 0 && (
        <div className="provider-missing-list">
          <strong>Missing providers</strong>
          <span>{missing.join(" · ")}</span>
        </div>
      )}

      <div className="provider-call-list">
        <div className="provider-call-title">
          <Activity size={16} />
          <strong>Recent calls</strong>
        </div>
        {calls.length === 0 && <span className="provider-call-empty">暂无调用记录</span>}
        {calls.slice(0, 8).map((call) => (
          <div className="provider-call-row" key={call.id}>
            <span>{call.role}</span>
            <strong>{call.providerId}</strong>
            <em>{call.status}</em>
            <small>{formatLatency(call.latencyMs)}</small>
            {call.cooldownUntil && <small className="provider-call-note">cooldown until {call.cooldownUntil}</small>}
            {call.error && <small className="provider-call-error">{call.error}</small>}
          </div>
        ))}
      </div>
    </section>
  );
}

function formatLatency(latencyMs: number) {
  if (!Number.isFinite(latencyMs) || latencyMs <= 0) return "0ms";
  if (latencyMs < 1000) return `${Math.round(latencyMs)}ms`;
  return `${(latencyMs / 1000).toFixed(1)}s`;
}
