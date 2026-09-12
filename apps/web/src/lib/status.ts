import i18next from "i18next";

/** 统一 Run 状态文案（DesignGuidelines §157/§158：集中管理，key 随语言切换）。 */
const STATUS_KEYS: Record<string, string> = {
  queued: "status.queued",
  preparing: "status.preparing",
  running: "status.running",
  waiting_approval: "status.waiting_approval",
  waiting_input: "status.waiting_input",
  paused: "status.paused",
  completed: "status.completed",
  failed: "status.failed",
  cancelled: "status.cancelled",
  timeout: "status.timeout",
};

/** 供无 hook 的组件使用（StatusTag 等）；React 组件内优先用 useTranslation 保持响应。 */
export const statusLabel = (status: string): string => {
  const key = STATUS_KEYS[status];
  if (key === undefined) return status;
  return i18next.t(key);
};

export const statusKeys = (): string[] => Object.keys(STATUS_KEYS);
