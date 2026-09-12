import { describe, expect, it } from "vite-plus/test";
import type { AgentEvent } from "@adui-forge/contracts";
import { chatReducer, initialChatState } from "../src/lib/chat.ts";

const event = (name: AgentEvent["name"], payload?: unknown): AgentEvent =>
  ({ name, runId: "run_1", timestamp: "", payload }) as AgentEvent;

describe("chatReducer", () => {
  it("send 追加用户消息与流式中的 assistant 消息，active 期间拒绝再次发送", () => {
    let state = chatReducer(initialChatState, { type: "send", text: "你好" });
    expect(state.messages).toHaveLength(2);
    expect(state.messages[0]).toMatchObject({ role: "user", text: "你好" });
    expect(state.messages[1]).toMatchObject({ role: "assistant", status: "streaming" });
    expect(state.active).toBe(true);
    // active 时再次 send 是 no-op
    state = chatReducer(state, { type: "send", text: "第二条" });
    expect(state.messages).toHaveLength(2);
  });

  it("model.delta 增量拼接、tool.started 去重、run.completed 收尾", () => {
    let state = chatReducer(initialChatState, { type: "send", text: "跑测试" });
    state = chatReducer(state, { type: "run-created", runId: "run_1" });
    state = chatReducer(state, { type: "event", event: event("tool.started", { tool: "shell" }) });
    state = chatReducer(state, { type: "event", event: event("tool.started", { tool: "shell" }) });
    state = chatReducer(state, { type: "event", event: event("model.delta", { text: "测试" }) });
    state = chatReducer(state, { type: "event", event: event("model.delta", { text: "通过" }) });
    state = chatReducer(state, { type: "event", event: event("run.completed") });

    const assistant = state.messages[1];
    expect(assistant?.text).toBe("测试通过");
    expect(assistant?.tools).toEqual(["shell"]);
    expect(assistant?.status).toBe("completed");
    expect(assistant?.runId).toBe("run_1");
    expect(state.active).toBe(false);
  });

  it("run.failed 记录错误信息并结束活跃状态", () => {
    let state = chatReducer(initialChatState, { type: "send", text: "x" });
    state = chatReducer(state, { type: "event", event: event("run.failed", { error: "boom" }) });
    expect(state.messages[1]).toMatchObject({ status: "failed", error: "boom" });
    expect(state.active).toBe(false);
  });

  it("reset 清空并允许新一轮对话", () => {
    let state = chatReducer(initialChatState, { type: "send", text: "x" });
    state = chatReducer(state, { type: "event", event: event("run.completed") });
    state = chatReducer(state, { type: "reset" });
    expect(state).toEqual(initialChatState);
  });
});

describe("chatReducer 会话恢复", () => {
  it("loaded 恢复历史消息且历史 streaming 消息驱动 active", () => {
    let state = chatReducer(initialChatState, {
      type: "loaded",
      messages: [
        { role: "user", text: "hi", status: "completed", tools: [] },
        { role: "assistant", text: "done", status: "completed", tools: [] },
      ],
    });
    expect(state.active).toBe(false);
    expect(state.messages).toHaveLength(2);

    state = chatReducer(initialChatState, {
      type: "loaded",
      messages: [{ role: "assistant", text: "partial", status: "streaming", tools: [] }],
    });
    expect(state.active).toBe(true);
  });

  it("恢复后可继续发送新消息", () => {
    let state = chatReducer(initialChatState, {
      type: "loaded",
      messages: [{ role: "assistant", text: "done", status: "completed", tools: [] }],
    });
    state = chatReducer(state, { type: "send", text: "下一个问题" });
    expect(state.messages).toHaveLength(3);
    expect(state.messages[2]?.status).toBe("streaming");
  });
});
