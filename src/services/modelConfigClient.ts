const API_BASE = import.meta.env.VITE_INKWELL_API_BASE || import.meta.env.VITE_ZHUQUE_API_BASE || "http://127.0.0.1:8788";

export interface ModelConfigFinding {
  path: string;
  authType: "oauth" | "api_key" | "mentioned";
  hasSecretLikeValue: boolean;
}

export interface MiniMaxConfigStatus {
  available: boolean;
  findings: ModelConfigFinding[];
  note: string;
}

export async function getMiniMaxConfigStatus(): Promise<MiniMaxConfigStatus> {
  const response = await fetch(`${API_BASE}/api/models/minimax/config`);
  if (!response.ok) {
    throw new Error(`MiniMax 配置探测失败：${response.status}`);
  }
  return response.json();
}
