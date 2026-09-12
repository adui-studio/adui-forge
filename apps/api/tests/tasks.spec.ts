import { describe, expect, it } from "vite-plus/test";
import type { AgentTool } from "@adui-forge/contracts";
import { defineAgent, AgentRegistry } from "@adui-forge/agent";
import { InMemoryRunStore } from "../src/runs/in-memory-run.store";
import { RunService } from "../src/runs/run.service";
import { InMemoryTaskStore, TaskService } from "../src/tasks/task.service";
import { createTaskSchema } from "../src/tasks/tasks.controller";

const buildService = (): TaskService => {
  const registry = new AgentRegistry();
  registry.register(
    defineAgent({
      name: "forge-dev",
      description: "t",
      systemPrompt: "sys",
      model: {
        async generate() {
          return { content: "done", toolCalls: [] };
        },
      },
      tools: [] as AgentTool[],
      loop: { maxSteps: 2, timeoutMs: 2000 },
    }),
  );
  return new TaskService(new InMemoryTaskStore(), new RunService(new InMemoryRunStore(), registry));
};

describe("TaskService", () => {
  it("creates a task that derives a run", async () => {
    const service = buildService();
    const task = await service.createTask({ title: "加搜索功能", task: "implement search" });
    expect(task.title).toBe("加搜索功能");
    expect(task.runId).toMatch(/^run_/);
    expect(await service.list()).toHaveLength(1);
  });

  it("createTaskSchema rejects empty titles", () => {
    expect(() => createTaskSchema.parse({ title: "", task: "x" })).toThrow();
  });
});

describe("TaskService 状态回填", () => {
  it("list 回填派生 Run 的实时状态", async () => {
    const registry = new AgentRegistry();
    registry.register(
      defineAgent({
        name: "forge-dev",
        description: "t",
        systemPrompt: "sys",
        model: {
          async generate() {
            return { content: "done", toolCalls: [] };
          },
        },
        tools: [] as AgentTool[],
        loop: { maxSteps: 2, timeoutMs: 2000 },
      }),
    );
    const runStore = new InMemoryRunStore();
    const service = new TaskService(new InMemoryTaskStore(), new RunService(runStore, registry));
    const task = await service.createTask({ title: "t", task: "do it" });
    expect(task.status).toBe("queued");
    // Run 推进到 completed 后，台账列表应反映最新状态
    await runStore.update(task.runId, {
      status: "completed",
      finishedAt: new Date().toISOString(),
    });
    const listed = await service.list();
    expect(listed[0]?.status).toBe("completed");
  });
});
