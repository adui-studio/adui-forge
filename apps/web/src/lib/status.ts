/** 统一 Run 状态文案（DesignGuidelines §157/§158：集中管理，不允许模块各自翻译）。 */
export const STATUS_LABEL: Record<string, string> = {
  queued: "排队中",
  preparing: "准备中",
  running: "运行中",
  waiting_approval: "等待批准",
  waiting_input: "等待输入",
  paused: "已暂停",
  completed: "已完成",
  failed: "失败",
  cancelled: "已取消",
  timeout: "超时",
};

export const statusLabel = (status: string): string => STATUS_LABEL[status] ?? status;
