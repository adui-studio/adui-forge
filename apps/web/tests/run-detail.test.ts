import { describe, expect, it } from "vite-plus/test";
import type { AgentEvent } from "@adui-forge/contracts";
import { groupEvents } from "@/pages/RunDetail.tsx";

const event = (name: string, extra: Partial<AgentEvent> = {}): AgentEvent =>
  ({ name, runId: "r1", timestamp: "", ...extra }) as AgentEvent;

describe("groupEvents", () => {
  it("按 step.started 分组，run 级事件落在无 stepId 的组", () => {
    const groups = groupEvents([
      event("run.started"),
      event("step.started", { stepId: "step_1" }),
      event("model.completed", { stepId: "step_1" }),
      event("step.completed", { stepId: "step_1" }),
    ]);
    expect(groups).toHaveLength(2);
    expect(groups[0]?.stepId).toBeNull();
    expect(groups[0]?.events[0]?.name).toBe("run.started");
    expect(groups[1]?.stepId).toBe("step_1");
    expect(groups[1]?.events.map((e) => e.name)).toEqual([
      "step.started",
      "model.completed",
      "step.completed",
    ]);
  });

  it("连续同工具 completed 聚合为一条（§192），被打断后重新计数", () => {
    const groups = groupEvents([
      event("step.started", { stepId: "step_1" }),
      event("tool.completed", { payload: { tool: "read_file" } }),
      event("tool.completed", { payload: { tool: "read_file" } }),
      event("tool.completed", { payload: { tool: "read_file" } }),
      event("tool.completed", { payload: { tool: "shell" } }),
      event("tool.completed", { payload: { tool: "read_file" } }),
    ]);
    expect(groups).toHaveLength(1);
    const names = groups[0]?.events.map((e) =>
      "aggregate" in e && e.aggregate !== undefined
        ? `${e.aggregate.tool} × ${e.aggregate.count}`
        : e.name,
    );
    expect(names).toEqual(["step.started", "read_file × 3", "shell × 1", "read_file × 1"]);
  });

  it("tool.failed 不参与聚合并标记组失败", () => {
    const groups = groupEvents([
      event("step.started", { stepId: "step_1" }),
      event("tool.completed", { payload: { tool: "shell" } }),
      event("tool.failed", { payload: { tool: "shell" } }),
      event("step.failed", { stepId: "step_1" }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.failed).toBe(true);
    expect(groups[0]?.events.map((e) => e.name)).toEqual([
      "step.started",
      "tool.completed",
      "tool.failed",
      "step.failed",
    ]);
  });
});
