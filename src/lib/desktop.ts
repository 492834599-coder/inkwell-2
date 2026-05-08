import { invoke } from "@tauri-apps/api/core";

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}

export function isDesktopRuntime() {
  return Boolean(window.__TAURI_INTERNALS__);
}

export async function getRuntimeLabel() {
  if (!isDesktopRuntime()) return "browser-preview";

  try {
    return await invoke<string>("app_runtime");
  } catch {
    return "tauri-desktop";
  }
}
