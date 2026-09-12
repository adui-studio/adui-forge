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

export interface NotificationInput {
  title: string;
  body: string;
}

export interface RunnerInfo {
  running: boolean;
  baseUrl: string | null;
  token: string | null;
}

export interface PlatformAdapter {
  getPlatformInfo(): Promise<PlatformInfo>;
  /** Local Runner（ADR-005）：desktop 实现；web 恒为 null。 */
  getRunnerInfo(): Promise<RunnerInfo | null>;
  /** 启动本地 Runner；web 不支持（返回 null）。 */
  startRunner(workspaceRoot: string, runnerCwd: string, entry: string): Promise<RunnerInfo | null>;
  /** 打开外部链接（浏览器新窗口 / 系统默认浏览器）。 */
  openExternal(url: string): Promise<void>;
  /** 系统通知（DesktopGuidelines §155：窗口后台时 Run 状态变化提醒）。 */
  notify(input: NotificationInput): Promise<void>;
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
  async getRunnerInfo() {
    return null;
  },
  async startRunner() {
    return null;
  },
  async openExternal(url: string) {
    window.open(url, "_blank", "noopener");
  },
  async notify({ title, body }) {
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "default") {
      await Notification.requestPermission();
    }
    if (Notification.permission === "granted") {
      new Notification(title, { body });
    }
  },
});

export const createDesktopPlatformAdapter = (): PlatformAdapter => ({
  async getPlatformInfo() {
    return { platform: "desktop" };
  },
  async getRunnerInfo() {
    if (!hasTauriInvoke()) return null;
    return (await tauriInvoke("runner_status")) as RunnerInfo;
  },
  async startRunner(workspaceRoot: string, runnerCwd: string, entry: string) {
    if (!hasTauriInvoke()) return null;
    return (await tauriInvoke("spawn_runner", {
      workspaceRoot,
      runnerCwd,
      entry,
    })) as RunnerInfo;
  },
  // 经 tauri-plugin-notification(capability: notification:default)发系统通知
  async notify({ title, body }) {
    if (!hasTauriInvoke()) {
      throw new Error("not running inside Tauri");
    }
    await tauriInvoke("plugin:notification|notify", { title, body });
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

declare const __APP_VERSION__: string;
export const appVersion = typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "dev";
