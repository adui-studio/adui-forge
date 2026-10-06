import { describe, expect, it } from "vite-plus/test";
import type { AgentEvent, ModelAdapter } from "@adui-forge/contracts";
import { defineAgent, AgentRegistry } from "@adui-forge/agent";
import { createSqliteRunPersistence } from "../src/run-store-sqlite.ts";
import { RunnerRunService, type RunnerRunPersistence, type RunnerRunRecord } from "../src/runs.ts";

const scriptedRegistry = (reply: string): AgentRegistry => {
  const registry = new AgentRegistry();
  registry.register(
    defineAgent({
      name: "forge-local",
      description: "test",
      systemPrompt: "sys",
      model: {
        async generate(_messages, _tools, context) {
          context.onDelta?.(reply);
          return { content: reply, toolCalls: [] };
        },
      } satisfies ModelAdapter,
      tools: [],
      loop: { maxSteps: 2, timeoutMs: 2000 },
    }),
  );
  return registry;
};

/** 记录型假持久化：验证 upsert 调用时机，并可预置"上次崩溃"的历史。 */
const fakePersistence = (seed: RunnerRunRecord[] = []) => {
  const rows = new Map<string, RunnerRunRecord>(seed.map((record) => [record.id, record]));
  const upserts: string[] = [];
  return {
    upserts,
    persistence: {
      upsert(record: RunnerRunRecord): void {
        upserts.push(`${record.status}:${record.id}`);
        rows.set(record.id, JSON.parse(JSON.stringify(record)) as RunnerRunRecord);
      },
      loadAll(): RunnerRunRecord[] {
        return [...rows.values()].reverse();
      },
    } satisfies RunnerRunPersistence,
  };
};

const seedRecord = (overrides: Partial<RunnerRunRecord>): RunnerRunRecord => ({
  id: `run_${Math.random().toString(36).slice(2)}`,
  agentName: "forge-local",
  task: "old task",
  status: "running",
  createdAt: new Date().toISOString(),
  events: [] as AgentEvent[],
  ...overrides,
});

describe("Runner 运行持久化（ADR-010）", () => {
  it("创建/执行中事件/终态均整行落库", async () => {
    const { persistence, upserts } = fakePersistence();
    const service = new RunnerRunService(scriptedRegistry("out"), persistence);
    service.create({ task: "t" });
    await new Promise((resolve) => setTimeout(resolve, 60));

    // queued → running → 逐事件 → completed，每次变更都有 upsert
    expect(upserts.filter((entry) => entry.startsWith("queued:")).length).toBe(1);
    expect(upserts.filter((entry) => entry.startsWith("running:")).length).toBeGreaterThanOrEqual(
      1,
    );
    expect(upserts.filter((entry) => entry.startsWith("completed:")).length).toBe(1);
    const finalRow = persistence.loadAll()[0];
    expect(finalRow?.status).toBe("completed");
    expect(finalRow?.events.some((event) => event.name === "run.completed")).toBe(true);
  });

  it("重启恢复：非终态 Run 收敛为 failed 并说明原因，终态原样保留", async () => {
    const { persistence } = fakePersistence([
      seedRecord({ id: "run_stale", status: "running", task: "stale" }),
      seedRecord({ id: "run_done", status: "completed", task: "done" }),
    ]);
    const service = new RunnerRunService(scriptedRegistry("x"), persistence);

    expect(service.get("run_stale")?.status).toBe("failed");
    expect(service.get("run_stale")?.error).toContain("restarted");
    expect(service.get("run_done")?.status).toBe("completed");
    // 列表瘦身语义不因恢复改变
    const listed = service.list();
    expect(listed).toHaveLength(2);
    expect(listed.every((item) => !Object.hasOwn(item, "events"))).toBe(true);
  });

  it("无持久化时行为与旧版一致（构造不抛错）", async () => {
    const service = new RunnerRunService(scriptedRegistry("x"));
    expect(service.create({ task: "t" }).status).toBe("queued");
  });

  it("sqlite 实现仅在 Bun 运行时可用；Node/tsx 开发态显式回退 null", async () => {
    const persistence = await createSqliteRunPersistence("/tmp/should-not-exist.db");
    // 本测试跑在 Node（vitest）下：返回 null，回退内存
    expect(persistence).toBeNull();
  });
});
