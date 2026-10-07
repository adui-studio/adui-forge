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

/** 窗口控制与拖拽：官方 @tauri-apps/api（decorations:false 自定义标题栏用）。
 *  不走手写裸 invoke——参数格式与错误传播的细节差异无法从外部排查。 */
import { getCurrentWindow } from "@tauri-apps/api/window";

export const minimizeWindow = async (): Promise<void> => {
  if (getInvoke() === null) return;
  await getCurrentWindow().minimize();
};

export const toggleMaximizeWindow = async (): Promise<void> => {
  if (getInvoke() === null) return;
  await getCurrentWindow().toggleMaximize();
};

export const closeWindow = async (): Promise<void> => {
  if (getInvoke() === null) return;
  await getCurrentWindow().close();
};

/** 显式拖拽（TitleBar onMouseDown 调用；不再依赖注入的 drag-region 处理器）。 */
export const startDragging = async (): Promise<void> => {
  if (getInvoke() === null) return;
  await getCurrentWindow().startDragging();
};
