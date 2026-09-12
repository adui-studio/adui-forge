import type { AgentEvent } from "@adui-forge/contracts";

export interface ChatMessage {
  role: "user" | "assistant";
  /** assistant 消息：model.delta 流式累积文本 */
  text: string;
  runId?: string;
  status: "streaming" | "completed" | "failed" | "cancelled";
  error?: string;
  /** 本次执行使用过的工具（按首次出现去重） */
  tools: string[];
}

export interface ChatState {
  messages: ChatMessage[];
  /** 是否有正在流式的回复（发送与停止按钮依赖此状态） */
  active: boolean;
}

export const initialChatState: ChatState = { messages: [], active: false };

export type ChatAction =
  | { type: "send"; text: string }
  | { type: "run-created"; runId: string }
  | { type: "event"; event: AgentEvent }
  | { type: "reset" };

const payloadString = (event: AgentEvent, key: string): string => {
  const value = (event.payload as Record<string, unknown> | undefined)?.[key];
  return typeof value === "string" ? value : "";
};

/**
 * Chat 界面状态机：send/run-created 与 SSE 事件共同驱动。
 * 所有事件只作用于最后一条 assistant 消息（同一时刻只有一个活跃 Run）。
 */
export const chatReducer = (state: ChatState, action: ChatAction): ChatState => {
  switch (action.type) {
    case "send": {
      if (state.active) return state;
      return {
        active: true,
        messages: [
          ...state.messages,
          { role: "user", text: action.text, status: "completed", tools: [] },
          { role: "assistant", text: "", status: "streaming", tools: [] },
        ],
      };
    }
    case "run-created": {
      if (!state.active) return state;
      const messages = [...state.messages];
      const last = messages.at(-1);
      if (last === undefined || last.role !== "assistant") return state;
      messages[messages.length - 1] = { ...last, runId: action.runId };
      return { ...state, messages };
    }
    case "event": {
      if (!state.active) return state;
      const messages = [...state.messages];
      const index = messages.length - 1;
      const last = messages[index];
      if (last === undefined || last.role !== "assistant") return state;
      const event = action.event;
      switch (event.name) {
        case "model.delta": {
          messages[index] = { ...last, text: last.text + payloadString(event, "text") };
          break;
        }
        case "tool.started": {
          const tool = payloadString(event, "tool");
          if (tool !== "" && !last.tools.includes(tool)) {
            messages[index] = { ...last, tools: [...last.tools, tool] };
          }
          break;
        }
        case "run.completed": {
          messages[index] = { ...last, status: "completed" };
          break;
        }
        case "run.cancelled": {
          messages[index] = { ...last, status: "cancelled" };
          break;
        }
        case "run.failed": {
          messages[index] = {
            ...last,
            status: "failed",
            error: payloadString(event, "error") || "未知错误",
          };
          break;
        }
        default:
          return state;
      }
      const active = messages[index]?.status === "streaming";
      return { active, messages };
    }
    case "reset":
      return initialChatState;
  }
};
