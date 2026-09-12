import type { AgentEvent } from "@adui-forge/contracts";

/** 单列对比状态：一个 Agent 在本次对比任务中的执行视图。 */
export interface CompareRunState {
  runId?: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  /** model.delta 流式累积的输出 */
  text: string;
  /** 本次执行使用过的工具（按首次出现去重） */
  tools: string[];
  error?: string;
  /** 本地记录的开始/结束时间戳（ms），用于耗时对比 */
  startedAt?: number;
  finishedAt?: number;
}

export const initialCompareState: CompareRunState = { status: "pending", text: "", tools: [] };

const payloadText = (event: AgentEvent, key: string): string => {
  const value = (event.payload as Record<string, unknown> | undefined)?.[key];
  return typeof value === "string" ? value : "";
};

/** SSE 事件 → 对比列状态；只处理影响展示的事件，其余忽略。 */
export const applyCompareEvent = (state: CompareRunState, event: AgentEvent): CompareRunState => {
  // 终态后冻结：迟到的增量事件不再改写结果
  if (state.status === "completed" || state.status === "failed" || state.status === "cancelled") {
    return state;
  }
  switch (event.name) {
    case "run.started":
      return {
        ...state,
        status: "running",
        startedAt: state.startedAt ?? Date.now(),
      };
    case "model.delta":
      return { ...state, text: state.text + payloadText(event, "text") };
    case "tool.started": {
      const tool = payloadText(event, "tool");
      if (tool === "" || state.tools.includes(tool)) return state;
      return { ...state, tools: [...state.tools, tool] };
    }
    case "run.completed":
      return { ...state, status: "completed", finishedAt: Date.now() };
    case "run.cancelled":
      return { ...state, status: "cancelled", finishedAt: Date.now() };
    case "run.failed":
      return {
        ...state,
        status: "failed",
        finishedAt: Date.now(),
        error: payloadText(event, "error") || "unknown error",
      };
    default:
      return state;
  }
};

/** 耗时（秒，一位小数）；未结束时基于当前时间计算。 */
export const compareDurationSeconds = (state: CompareRunState): number | null => {
  if (state.startedAt === undefined) return null;
  const end = state.finishedAt ?? Date.now();
  return Math.max(0, Math.round(((end - state.startedAt) / 1000) * 10) / 10);
};
