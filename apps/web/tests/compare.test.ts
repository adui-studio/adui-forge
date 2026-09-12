import { describe, expect, it } from "vite-plus/test";
import type { AgentEvent } from "@adui-forge/contracts";
import {
  applyCompareEvent,
  compareDurationSeconds,
  initialCompareState,
} from "../src/lib/compare.ts";

const event = (name: AgentEvent["name"], payload?: unknown): AgentEvent =>
  ({ name, runId: "run_1", timestamp: "", payload }) as AgentEvent;

describe("applyCompareEvent", () => {
  it("run.started 置为 running 并记录开始时间", () => {
    const state = applyCompareEvent(initialCompareState, event("run.started"));
    expect(state.status).toBe("running");
    expect(state.startedAt).toBeTypeOf("number");
  });

  it("model.delta 累积、工具去重、终态收尾", () => {
    let state = applyCompareEvent(initialCompareState, event("run.started"));
    state = applyCompareEvent(state, event("tool.started", { tool: "shell" }));
    state = applyCompareEvent(state, event("tool.started", { tool: "shell" }));
    state = applyCompareEvent(state, event("model.delta", { text: "结果" }));
    state = applyCompareEvent(state, event("run.completed"));
    expect(state.text).toBe("结果");
    expect(state.tools).toEqual(["shell"]);
    expect(state.status).toBe("completed");
    expect(state.finishedAt).toBeTypeOf("number");
  });

  it("run.failed 记录错误并结束", () => {
    let state = applyCompareEvent(initialCompareState, event("run.started"));
    state = applyCompareEvent(state, event("run.failed", { error: "boom" }));
    expect(state.status).toBe("failed");
    expect(state.error).toBe("boom");
  });

  it("终态后忽略后续事件", () => {
    let state = applyCompareEvent(initialCompareState, event("run.completed"));
    state = applyCompareEvent(state, event("model.delta", { text: "late" }));
    expect(state.text).toBe("");
  });
});

describe("compareDurationSeconds", () => {
  it("未开始为 null；结束时按记录计算", () => {
    expect(compareDurationSeconds(initialCompareState)).toBeNull();
    const started = applyCompareEvent(initialCompareState, event("run.started"));
    const fixedNow = Date.now();
    const state = { ...started, finishedAt: fixedNow };
    // 手动回填开始时间以得到确定值
    const withStart = { ...state, startedAt: fixedNow - 1500 };
    expect(compareDurationSeconds(withStart)).toBe(1.5);
  });
});
