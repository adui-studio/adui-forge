import { describe, expect, it } from "vite-plus/test";
import { firstValueFrom } from "rxjs";
import { toArray } from "rxjs/operators";
import { z } from "zod";
import type { AgentMessage, AgentTool, ModelAdapter, ModelTurnResult } from "@adui-forge/contracts";
import { defineAgent, AgentRegistry } from "@adui-forge/agent";
import { InMemoryRunStore } from "../src/runs/in-memory-run.store";
import { RunService } from "../src/runs/run.service";
import { ZodValidationPipe } from "../src/common/zod-validation.pipe";
import { createRunSchema } from "../src/runs/runs.controller";

const echoTool: AgentTool<{ message: string }> = {
  name: "echo",
  description: "Echo a message back",
  permission: "free",
  inputSchema: z.object({ message: z.string() }),
  async execute(input) {
    return `echo: ${input.message}`;
  },
};

/** 两轮脚本模型：第一轮发起工具调用，第二轮收敛完成。 */
const scriptedModel = (): { adapter: ModelAdapter; prompts: AgentMessage[][] } => {
  const prompts: AgentMessage[][] = [];
  let index = 0;
  return {
    prompts,
    adapter: {
      async generate(messages) {
        prompts.push(messages.map((message) => ({ ...message })));
        const turn: ModelTurnResult =
          index === 0
            ? {
                content: null,
                toolCalls: [{ id: "call_1", name: "echo", input: { message: "from api" } }],
              }
            : { content: "done", toolCalls: [] };
        index += 1;
        return turn;
      },
    },
  };
};

const buildRegistry = (): { registry: AgentRegistry; prompts: AgentMessage[][] } => {
  const { adapter, prompts } = scriptedModel();
  const registry = new AgentRegistry();
  registry.register(
    defineAgent({
      name: "forge-dev",
      description: "test agent",
      systemPrompt: "sys",
      model: adapter,
      tools: [echoTool],
      loop: { maxSteps: 3, timeoutMs: 2000 },
    }),
  );
  return { registry, prompts };
};

describe("RunService", () => {
  it("createRun returns immediately, executes in background and records events", async () => {
    const { registry } = buildRegistry();
    const store = new InMemoryRunStore();
    const service = new RunService(store, registry);

    const record = await service.createRun({ agentName: "forge-dev", task: "hello" });
    expect(["queued", "running"]).toContain(record.status);
    expect(record.agentName).toBe("forge-dev");

    await new Promise((resolve) => setTimeout(resolve, 50));
    const finished = await service.getRun(record.id);
    expect(finished.status).toBe("completed");
    expect(finished.finishedAt).toBeDefined();
    const names = finished.events.map((event) => event.name);
    expect(names).toContain("run.started");
    expect(names).toContain("run.completed");
  }, 10_000);

  it("listRuns returns newest first", async () => {
    const { registry } = buildRegistry();
    const service = new RunService(new InMemoryRunStore(), registry);
    const first = await service.createRun({ agentName: "forge-dev", task: "a" });
    const second = await service.createRun({ agentName: "forge-dev", task: "b" });
    const ids = (await service.listRuns()).map((run) => run.id);
    expect(ids[0]).toBe(second.id);
    expect(ids.at(-1)).toBe(first.id);
  });

  it("rejects unknown agent names", async () => {
    const { registry } = buildRegistry();
    const service = new RunService(new InMemoryRunStore(), registry);
    await expect(service.createRun({ agentName: "nope", task: "x" })).rejects.toThrow(
      'unknown agent: "nope"',
    );
  });

  it("getRun throws for unknown id", async () => {
    const { registry } = buildRegistry();
    const service = new RunService(new InMemoryRunStore(), registry);
    await expect(service.getRun("missing")).rejects.toThrow('unknown run: "missing"');
  });
});

describe("ZodValidationPipe", () => {
  it("applies schema defaults", () => {
    const pipe = new ZodValidationPipe(createRunSchema);
    expect(pipe.transform({ task: "fix bug" }, {} as never)).toEqual({
      agentName: "forge-dev",
      task: "fix bug",
    });
  });

  it("rejects invalid bodies with a BadRequest message", () => {
    const pipe = new ZodValidationPipe(createRunSchema);
    expect(() => pipe.transform({ task: "" }, {} as never)).toThrow(/validation failed/);
  });
});

describe("RunService.streamEvents (SSE)", () => {
  it("replays snapshot, pushes live events and completes on terminal event", async () => {
    const { registry } = buildRegistry();
    const service = new RunService(new InMemoryRunStore(), registry);
    const record = await service.createRun({ agentName: "forge-dev", task: "stream me" });

    // 等 Run 跑完再订阅：验证快照补发 + 终态完成
    await new Promise((resolve) => setTimeout(resolve, 50));

    const events = await firstValueFrom(service.streamEvents(record.id).pipe(toArray()));
    const names = events.map((event) => (event.data as { name: string }).name);
    expect(names).toContain("run.started");
    expect(names).toContain("run.completed");
  }, 10_000);

  it("errors for unknown run ids", async () => {
    const { registry } = buildRegistry();
    const service = new RunService(new InMemoryRunStore(), registry);
    await expect(firstValueFrom(service.streamEvents("missing"))).rejects.toThrow(
      'unknown run: "missing"',
    );
  });
});

describe("Artifacts", () => {
  it("registers an execution summary artifact on completion", async () => {
    const { registry } = buildRegistry();
    const store = new InMemoryRunStore();
    const service = new RunService(store, registry);
    const registered: Array<{ runId: string; name: string; type: string; content: string }> = [];
    service.setArtifactRegistrar((input) => {
      registered.push(input);
    });

    const record = await service.createRun({ agentName: "forge-dev", task: "make artifact" });
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(registered).toHaveLength(1);
    expect(registered[0]?.runId).toBe(record.id);
    expect(registered[0]?.name).toBe("execution-summary");
    expect(registered[0]?.content.length).toBeGreaterThan(0);
  }, 10_000);
});

describe("retryRun", () => {
  it("creates a new run with the same agent and task", async () => {
    const { registry } = buildRegistry();
    const service = new RunService(new InMemoryRunStore(), registry);
    const first = await service.createRun({ agentName: "forge-dev", task: "original task" });

    const retried = await service.retryRun(first.id);
    expect(retried.id).not.toBe(first.id);
    expect(retried.agentName).toBe("forge-dev");
    expect(retried.task).toBe("original task");
  });

  it("rejects retry of unknown runs", async () => {
    const { registry } = buildRegistry();
    const service = new RunService(new InMemoryRunStore(), registry);
    await expect(service.retryRun("missing")).rejects.toThrow('unknown run: "missing"');
  });
});

describe("listRuns 过滤", () => {
  it("filters by status and limits", async () => {
    const { registry } = buildRegistry();
    const service = new RunService(new InMemoryRunStore(), registry);
    await service.createRun({ agentName: "forge-dev", task: "a" });
    await service.createRun({ agentName: "forge-dev", task: "b" });
    await new Promise((resolve) => setTimeout(resolve, 50));
    const completed = await service.listRuns({ status: "completed", limit: 1 });
    expect(completed).toHaveLength(1);
    expect(await service.listRuns({ agentName: "other" })).toHaveLength(0);
  });
});
