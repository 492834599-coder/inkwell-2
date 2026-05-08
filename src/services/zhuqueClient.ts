import type { ZhuqueCheckStatus } from "../types/domain";

const API_BASE = import.meta.env.VITE_INKWELL_API_BASE || import.meta.env.VITE_ZHUQUE_API_BASE || "http://127.0.0.1:8788";

export interface ZhuqueCheckRequest {
  title: string;
  chapterId: string;
  draftId: string;
  text: string;
}

export interface ZhuqueCheckResponse {
  status: ZhuqueCheckStatus;
  aigcScore: number | null;
  aiPercent: number | null;
  verdict: string;
  summary: string;
  remainingDaily: number | null;
  reportScreenshotUrl?: string;
  reportHtmlUrl?: string;
  reportScreenshotPath?: string;
  reportHtmlPath?: string;
  reportText?: string;
}

export async function checkZhuqueText(payload: ZhuqueCheckRequest): Promise<ZhuqueCheckResponse> {
  const response = await fetch(`${API_BASE}/api/zhuque/check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `朱雀检测服务异常：${response.status}`));
  }

  return response.json();
}

export async function getZhuqueLoginQr(): Promise<{ status: string; qrImageUrl?: string; qrImagePath?: string; message?: string }> {
  const response = await fetch(`${API_BASE}/api/zhuque/login/qr`, { method: "POST" });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `朱雀登录服务异常：${response.status}`));
  }
  return response.json();
}

async function readErrorMessage(response: Response, fallback: string) {
  const text = await response.text();
  if (!text) return fallback;
  try {
    const parsed = JSON.parse(text) as { error?: string };
    return parsed.error || text;
  } catch {
    return text;
  }
}
