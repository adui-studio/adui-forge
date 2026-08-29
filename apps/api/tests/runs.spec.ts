import { describe, expect, it } from "vite-plus/test";
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

    const record = service.createRun({ agentName: "forge-dev", task: "hello" });
    expect(record.status).toBe("queued");
    expect(record.agentName).toBe("forge-dev");

    await new Promise((resolve) => setTimeout(resolve, 50));
    const finished = service.getRun(record.id);
    expect(finished.status).toBe("completed");
    expect(finished.finishedAt).toBeDefined();
    const names = finished.events.map((event) => event.name);
    expect(names).toContain("run.started");
    expect(names).toContain("run.completed");
  }, 10_000);

  it("listRuns returns newest first", () => {
    const { registry } = buildRegistry();
    const service = new RunService(new InMemoryRunStore(), registry);
    const first = service.createRun({ agentName: "forge-dev", task: "a" });
    const second = service.createRun({ agentName: "forge-dev", task: "b" });
    const ids = service.listRuns().map((run) => run.id);
    expect(ids[0]).toBe(second.id);
    expect(ids.at(-1)).toBe(first.id);
  });

  it("rejects unknown agent names", () => {
    const { registry } = buildRegistry();
    const service = new RunService(new InMemoryRunStore(), registry);
    expect(() => service.createRun({ agentName: "nope", task: "x" })).toThrow(
      'unknown agent: "nope"',
    );
  });

  it("getRun throws for unknown id", () => {
    const { registry } = buildRegistry();
    const service = new RunService(new InMemoryRunStore(), registry);
    expect(() => service.getRun("missing")).toThrow('unknown run: "missing"');
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
