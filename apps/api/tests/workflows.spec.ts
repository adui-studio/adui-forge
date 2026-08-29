import { describe, expect, it } from "vite-plus/test";
import type { ModelAdapter, ModelTurnResult } from "@adui-forge/contracts";
import { defineAgent, AgentRegistry } from "@adui-forge/agent";
import { InMemoryRunStore } from "../src/runs/in-memory-run.store";
import { RunService } from "../src/runs/run.service";
import { WorkflowService } from "../src/workflows/workflow.service";

describe("WorkflowService", () => {
  it("按顺序执行多任务并把 workflow 事件写入 Run 记录", async () => {
    let turn = 0;
    const model: ModelAdapter = {
      async generate(): Promise<ModelTurnResult> {
        turn += 1;
        return { content: `step ${turn} done`, toolCalls: [] };
      },
    };
    const registry = new AgentRegistry();
    registry.register(
      defineAgent({
        name: "forge-dev",
        description: "t",
        systemPrompt: "sys",
        model,
        tools: [],
        loop: { maxSteps: 2, timeoutMs: 2000 },
      }),
    );
    const store = new InMemoryRunStore();
    const runService = new RunService(store, registry);
    const workflowService = new WorkflowService(store, registry, (runId, event) => {
      // 经 RunService 的订阅通道推送（此处仅验证不抛错）
      void runId;
      void event;
    });

    const record = await workflowService.createWorkflowRun({ tasks: ["first", "second"] });
    await new Promise((resolve) => setTimeout(resolve, 60));

    const finished = await runService.getRun(record.id);
    expect(finished.status).toBe("completed");
    expect(finished.events.some((event) => event.name === "workflow.started")).toBe(true);
    expect(finished.events.some((event) => event.name === "workflow.completed")).toBe(true);
    expect(finished.agentName).toBe("workflow(2 steps)");
  }, 10_000);

  it("默认 Agent 未注册时显式 404", async () => {
    const workflowService = new WorkflowService(
      new InMemoryRunStore(),
      new AgentRegistry(),
      () => {},
    );
    await expect(workflowService.createWorkflowRun({ tasks: ["x"] })).rejects.toThrow(
      'unknown agent: "forge-dev"',
    );
  });
});
