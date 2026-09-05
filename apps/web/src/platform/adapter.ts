import type { AgentTool } from "@adui-forge/contracts";

/**
 * PlatformAdapter（REQUIREMENTS.md §15）：
 * 业务代码不得直接判断 `window.__TAURI_INTERNALS__`，一律经本接口。
 * Web 实现为默认；Desktop 实现通过 Tauri IPC 转发系统能力。
 */

export interface PlatformInfo {
  /** web | desktop */
  platform: "web" | "desktop";
}

export interface PlatformAdapter {
  getPlatformInfo(): Promise<PlatformInfo>;
  /** 打开外部链接（浏览器新窗口 / 系统默认浏览器）。 */
  openExternal(url: string): Promise<void>;
}

const isTauri = (): boolean =>
  typeof window !== "undefined" &&
  (window as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ !== undefined;

const hasTauriInvoke = (): boolean =>
  isTauri() &&
  typeof (
    window as {
      __TAURI_INTERNALS__?: { invoke?: unknown };
    }
  ).__TAURI_INTERNALS__?.invoke === "function";

const tauriInvoke = (command: string, args?: Record<string, unknown>): Promise<unknown> => {
  const internals = (
    window as {
      __TAURI_INTERNALS__?: {
        invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
      };
    }
  ).__TAURI_INTERNALS__;
  if (internals === undefined) {
    return Promise.reject(new Error("not running inside Tauri"));
  }
  return internals.invoke(command, args);
};

export const createWebPlatformAdapter = (): PlatformAdapter => ({
  async getPlatformInfo() {
    return { platform: "web" };
  },
  async openExternal(url: string) {
    window.open(url, "_blank", "noopener");
  },
});

export const createDesktopPlatformAdapter = (): PlatformAdapter => ({
  async getPlatformInfo() {
    return { platform: "desktop" };
  },
  // 经 tauri-plugin-opener（capability: opener:default）走系统默认浏览器
  async openExternal(url: string) {
    if (!hasTauriInvoke()) {
      throw new Error("not running inside Tauri");
    }
    await tauriInvoke("plugin:opener|open_url", { url });
  },
});

export const getPlatformAdapter = (): PlatformAdapter =>
  isTauri() ? createDesktopPlatformAdapter() : createWebPlatformAdapter();

// AgentTool 的引用仅为类型归属说明，避免误把适配器当工具暴露
export type { AgentTool };
