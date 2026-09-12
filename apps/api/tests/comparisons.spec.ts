import { describe, expect, it } from "vite-plus/test";
import type { AgentTool, ModelAdapter } from "@adui-forge/contracts";
import { defineAgent, AgentRegistry } from "@adui-forge/agent";
import { InMemoryRunStore } from "../src/runs/in-memory-run.store";
import { RunService } from "../src/runs/run.service";
import { ComparisonService } from "../src/compare/comparison.service";
import { InMemoryComparisonStore } from "../src/compare/comparison.store";

const buildService = () => {
  const registry = new AgentRegistry();
  registry.register(
    defineAgent({
      name: "forge-dev",
      description: "t",
      systemPrompt: "sys",
      model: {
        async generate(_messages, _tools, context) {
          context.onDelta?.("对比输出");
          return { content: "对比输出", toolCalls: [] };
        },
      } satisfies ModelAdapter,
      tools: [] as AgentTool[],
      loop: { maxSteps: 2, timeoutMs: 2000 },
    }),
  );
  const runStore = new InMemoryRunStore();
  const runService = new RunService(runStore, registry);
  const service = new ComparisonService(new InMemoryComparisonStore(), runService);
  return { runStore, service };
};

describe("ComparisonService", () => {
  it("创建批次 → 详情从 Run 实时派生输出/状态/耗时", async () => {
    const { runStore, service } = buildService();
    const runA = await service["runs"].createRun({ agentName: "forge-dev", task: "same task" });
    const runB = await service["runs"].createRun({ agentName: "forge-dev", task: "same task" });
    // Run 异步执行：等待事件落库与终态
    await new Promise((resolve) => setTimeout(resolve, 80));
    await runStore.update(runA.id, {
      status: "completed",
      startedAt: new Date(Date.now() - 1000).toISOString(),
      finishedAt: new Date().toISOString(),
    });

    await service.create({
      task: "same task",
      items: [
        { agentName: "agent-a", runId: runA.id },
        { agentName: "agent-b", runId: runB.id },
      ],
    });

    const { results } = await service.get((await service.list())[0]?.id ?? "");
    expect(results).toHaveLength(2);
    const a = results[0];
    expect(a?.agentName).toBe("agent-a");
    expect(a?.status).toBe("completed");
    expect(a?.text).toContain("对比输出");
    expect(a?.durationMs).not.toBeNull();
    const b = results[1];
    expect(b?.status).toBe("completed");
  });

  it("list 按创建时间倒序；未知批次 404；删除后不可取", async () => {
    const { service } = buildService();
    await service.create({ task: "t1", items: [] as never });
    await new Promise((resolve) => setTimeout(resolve, 5));
    await service.create({ task: "t2", items: [] as never });
    const list = await service.list();
    expect(list.map((record) => record.task)).toEqual(["t2", "t1"]);

    const first = list[0]?.id ?? "";
    await service.delete(first);
    await expect(service.get(first)).rejects.toThrow("unknown comparison");
  });

  it("Run 记录缺失时派生列降级为 unknown", async () => {
    const { service } = buildService();
    await service.create({ task: "t", items: [{ agentName: "x", runId: "run_missing" }] });
    const { results } = await service.get((await service.list())[0]?.id ?? "");
    expect(results[0]?.status).toBe("unknown");
    expect(results[0]?.text).toBe("");
  });
});
