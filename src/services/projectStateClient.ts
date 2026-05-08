import type { ProjectSnapshot, ProjectStateLoadResult, ProjectStateStatus } from "../types/domain";

const API_BASE = import.meta.env.VITE_INKWELL_API_BASE || import.meta.env.VITE_ZHUQUE_API_BASE || "http://127.0.0.1:8788";

export async function getProjectSnapshot(): Promise<ProjectStateLoadResult> {
  return requestJson("/api/project-state");
}

export async function saveProjectSnapshot(snapshot: ProjectSnapshot): Promise<ProjectStateStatus> {
  return requestJson("/api/project-state", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ snapshot }),
  });
}

export async function deleteProjectSnapshot(): Promise<ProjectStateStatus> {
  return requestJson("/api/project-state", { method: "DELETE" });
}

async function requestJson<T>(pathname: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${pathname}`, init);
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `Project state service failed: ${response.status}`));
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
