import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vite-plus/test";
import type { AgentEvent, ModelAdapter } from "@adui-forge/contracts";
import { defineAgent, AgentRegistry } from "@adui-forge/agent";
import { RunnerRunService } from "../src/runs.ts";
import { buildLocalAgents } from "../src/agents.ts";

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

describe("RunnerRunService", () => {
  it("创建 → 后台执行 → 终态；订阅先补发快照再实时", async () => {
    const service = new RunnerRunService(scriptedRegistry("本地输出"));
    const record = { ...service.create({ task: "local task" }) };
    expect(record.status).toBe("queued");

    const events: AgentEvent[] = [];
    const unsubscribe = service.subscribe(record.id, (event) => events.push(event));

    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(events.length).toBeGreaterThan(0); // 实时推送
    const finished = service.get(record.id);
    expect(finished?.status).toBe("completed");
    // 终态事件已推送
    expect(events.some((event) => event.name === "run.completed")).toBe(true);
    unsubscribe?.();
  });

  it("list 倒序；cancel 终止执行中的 Run", async () => {
    const registry = new AgentRegistry();
    registry.register(
      defineAgent({
        name: "forge-local",
        description: "t",
        systemPrompt: "sys",
        model: {
          async generate(_messages, _tools, context) {
            await new Promise((resolve, reject) => {
              const timer = setTimeout(resolve, 5_000);
              context.signal.addEventListener("abort", () => {
                clearTimeout(timer);
                reject(new Error("aborted"));
              });
            });
            return { content: "never", toolCalls: [] };
          },
        } satisfies ModelAdapter,
        tools: [],
        loop: { maxSteps: 2, timeoutMs: 10_000 },
      }),
    );
    const service = new RunnerRunService(registry);
    const slow = service.create({ task: "slow" });
    const fast = service.create({ task: "fast" });
    void fast;
    service.cancel(slow.id);
    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(service.get(slow.id)?.status).toBe("cancelled");
    expect(service.list()[0]?.task).toBe("fast");
  });

  it("未知 Agent 显式报错", () => {
    const service = new RunnerRunService(new AgentRegistry());
    expect(() => service.create({ task: "x", agentName: "ghost" })).toThrow(
      'unknown agent: "ghost"',
    );
  });
});

describe("buildLocalAgents", () => {
  it("未配置 FORGE_MODEL_* 时返回 null", () => {
    expect(buildLocalAgents(join(tmpdir(), "x"), {})).toBeNull();
  });

  it("配置模型后装配默认 Agent，工具限定 workspace root", () => {
    const root = mkdtempSync(join(tmpdir(), "runner-agents-"));
    writeFileSync(join(root, "README.md"), "hi\n");
    const registry = buildLocalAgents(root, {
      FORGE_MODEL_BASE_URL: "http://localhost:1",
      FORGE_MODEL_ID: "m1",
    } as unknown as NodeJS.ProcessEnv);
    expect(registry).not.toBeNull();
    const agent = registry?.get("forge-local");
    expect(agent?.tools.map((tool) => tool.name)).toContain("read_file");
    expect(agent?.tools.some((tool) => tool.name === "shell_exec")).toBe(false);
  });
});
