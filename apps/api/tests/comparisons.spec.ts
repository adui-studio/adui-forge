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

describe("ComparisonService 跨批次统计", () => {
  it("汇总各 Agent 参与数/完成/失败/平均耗时/最快胜出", async () => {
    const { runStore, service } = buildService();
    // 批次 1：a 快于 b
    const r1 = await service["runs"].createRun({ agentName: "forge-dev", task: "t" });
    const r2 = await service["runs"].createRun({ agentName: "forge-dev", task: "t" });
    await new Promise((resolve) => setTimeout(resolve, 60));
    await runStore.update(r1.id, {
      status: "completed",
      startedAt: new Date(Date.now() - 2000).toISOString(),
      finishedAt: new Date().toISOString(),
    });
    await runStore.update(r2.id, {
      status: "completed",
      startedAt: new Date(Date.now() - 5000).toISOString(),
      finishedAt: new Date().toISOString(),
    });
    await service.create({
      task: "t",
      items: [
        { agentName: "agent-a", runId: r1.id },
        { agentName: "agent-b", runId: r2.id },
      ],
    });
    // 批次 2：b 胜，a 失败
    const r3 = await service["runs"].createRun({ agentName: "forge-dev", task: "t" });
    const r4 = await service["runs"].createRun({ agentName: "forge-dev", task: "t" });
    await new Promise((resolve) => setTimeout(resolve, 60));
    await runStore.update(r3.id, {
      status: "failed",
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      error: "boom",
    });
    await runStore.update(r4.id, {
      status: "completed",
      startedAt: new Date(Date.now() - 1000).toISOString(),
      finishedAt: new Date().toISOString(),
    });
    await service.create({
      task: "t",
      items: [
        { agentName: "agent-a", runId: r3.id },
        { agentName: "agent-b", runId: r4.id },
      ],
    });

    const stats = await service.stats();
    const a = stats.find((entry) => entry.agentName === "agent-a");
    const b = stats.find((entry) => entry.agentName === "agent-b");
    expect(a).toMatchObject({ batches: 2, completed: 1, failed: 1, fastestWins: 1 });
    expect(b).toMatchObject({ batches: 2, completed: 2, failed: 0, fastestWins: 1 });
    expect(a?.avgDurationMs).not.toBeNull();
    // 并列（各 1 胜）时按名称排序
    expect(stats.map((entry) => entry.agentName)).toEqual(["agent-a", "agent-b"]);
  });
});
