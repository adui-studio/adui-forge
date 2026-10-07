/** Tauri 桥（与 Web 端 PlatformAdapter 同形的命令集；桌面 UI 独立实现）。 */

export interface RunnerInfo {
  running: boolean;
  baseUrl: string | null;
  token: string | null;
  trusted: boolean;
}

type TauriInvoke = (command: string, args?: Record<string, unknown>) => Promise<unknown>;

const getInvoke = (): TauriInvoke | null => {
  const internals = (
    globalThis as {
      __TAURI_INTERNALS__?: { invoke?: unknown };
    }
  ).__TAURI_INTERNALS__;
  if (internals?.invoke !== "function") {
    return null;
  }
  return internals.invoke as unknown as TauriInvoke;
};

export const isTauri = (): boolean => getInvoke() !== null;

export const invokeRunnerStatus = async (): Promise<RunnerInfo | null> => {
  const invoke = getInvoke();
  if (invoke === null) return null;
  return (await invoke("runner_status")) as RunnerInfo;
};

export const invokeStartRunner = async (
  workspaceRoot: string,
  trustedLocalMode: boolean,
): Promise<RunnerInfo | null> => {
  const invoke = getInvoke();
  if (invoke === null) return null;
  return (await invoke("spawn_runner", {
    workspaceRoot,
    trustedLocalMode,
  })) as RunnerInfo;
};

export const invokeStopRunner = async (): Promise<void> => {
  const invoke = getInvoke();
  if (invoke === null) return;
  await invoke("runner_stop");
};

/** 窗口控制（decorations:false 的自定义标题栏用；core:default 已含 window 基本操作）。 */
export const minimizeWindow = async (): Promise<void> => {
  const invoke = getInvoke();
  if (invoke === null) return;
  await invoke("plugin:window|minimize", { label: "main" });
};

export const toggleMaximizeWindow = async (): Promise<void> => {
  const invoke = getInvoke();
  if (invoke === null) return;
  await invoke("plugin:window|toggle_maximize", { label: "main" });
};

export const closeWindow = async (): Promise<void> => {
  const invoke = getInvoke();
  if (invoke === null) return;
  await invoke("plugin:window|close", { label: "main" });
};
