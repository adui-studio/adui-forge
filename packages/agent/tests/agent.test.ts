import { describe, expect, it } from "vite-plus/test";
import { z } from "zod";
import type { AgentTool, AgentMessage, ModelAdapter, ModelTurnResult } from "@adui-forge/contracts";
import { defineAgent } from "../src/define.ts";
import { AgentRegistry } from "../src/registry.ts";

const scriptedModel = (
  turns: ModelTurnResult[],
): { adapter: ModelAdapter; prompts: AgentMessage[][] } => {
  const prompts: AgentMessage[][] = [];
  let index = 0;
  return {
    prompts,
    adapter: {
      async generate(messages) {
        // 快照：Loop 复用同一个 messages 数组，必须复制以观察调用时刻的状态
        prompts.push(messages.map((message) => ({ ...message })));
        const turn = turns[Math.min(index, turns.length - 1)];
        index += 1;
        return turn;
      },
    },
  };
};

const echoTool: AgentTool<{ message: string }> = {
  name: "echo",
  description: "Echo a message back",
  permission: "free",
  inputSchema: z.object({ message: z.string() }),
  async execute(input) {
    return `echo: ${input.message}`;
  },
};

const dangerousTool: AgentTool<{ message: string }> = {
  name: "dangerous",
  description: "Requires approval",
  permission: "approval",
  inputSchema: z.object({ message: z.string() }),
  async execute(input) {
    return `did: ${input.message}`;
  },
};

const toolCall = (name: string, input: unknown): ModelTurnResult => ({
  content: null,
  toolCalls: [{ id: "call_1", name, input }],
});

const baseDefinition = (model: ModelAdapter) => ({
  name: "repo-coder",
  description: "test agent",
  systemPrompt: "you are adui forge",
  model,
  tools: [echoTool, dangerousTool],
  loop: { maxSteps: 3, timeoutMs: 1000, tokenLimit: 500 },
});

describe("defineAgent", () => {
  it("applies definition defaults: system prompt reaches the model first", async () => {
    const { adapter, prompts } = scriptedModel([{ content: "done", toolCalls: [] }]);
    const agent = defineAgent(baseDefinition(adapter));

    const result = await agent.run("hi");

    expect(result.status).toBe("completed");
    expect(prompts[0]?.[0]).toEqual({ role: "system", content: "you are adui forge" });
    expect(prompts[0]?.at(-1)).toEqual({ role: "user", content: "hi" });
  });

  it("definition maxSteps bounds the loop without per-run options", async () => {
    const { adapter } = scriptedModel([toolCall("echo", { message: "loop" })]);
    const agent = defineAgent(baseDefinition(adapter));

    const result = await agent.run("hi");

    expect(result.status).toBe("max_steps_reached");
    expect(result.steps).toBe(3);
  });

  it("run overrides pass through: approval handler executes approval-gated tools", async () => {
    const { adapter, prompts } = scriptedModel([
      toolCall("dangerous", { message: "deploy" }),
      { content: "done", toolCalls: [] },
    ]);
    const agent = defineAgent(baseDefinition(adapter));
    const approvals: string[] = [];

    const result = await agent.run("hi", {
      approval: {
        requestApproval: async (request) => {
          approvals.push(request.toolName);
          return "approved";
        },
      },
    });

    expect(result.status).toBe("completed");
    expect(approvals).toEqual(["dangerous"]);
    expect(prompts.at(-1)?.at(-1)).toMatchObject({ role: "tool", content: "did: deploy" });
  });

  it("run overrides pass through: runId and onEvent reach the loop", async () => {
    const { adapter } = scriptedModel([{ content: "done", toolCalls: [] }]);
    const agent = defineAgent(baseDefinition(adapter));
    const events: string[] = [];

    const result = await agent.run("hi", {
      runId: "run_custom",
      onEvent: (event) => events.push(event.name),
    });

    expect(result.runId).toBe("run_custom");
    expect(events).toContain("run.started");
    expect(events).toContain("run.completed");
  });
});

describe("AgentRegistry", () => {
  it("registers and resolves agents by name", () => {
    const { adapter } = scriptedModel([{ content: "done", toolCalls: [] }]);
    const registry = new AgentRegistry();
    const agent = defineAgent(baseDefinition(adapter));
    registry.register(agent);
    expect(registry.resolve("repo-coder").description).toBe("test agent");
    expect(registry.list()).toHaveLength(1);
  });

  it("rejects duplicates and unknown names", () => {
    const { adapter } = scriptedModel([{ content: "done", toolCalls: [] }]);
    const registry = new AgentRegistry();
    const agent = defineAgent(baseDefinition(adapter));
    registry.register(agent);
    expect(() => registry.register(defineAgent(baseDefinition(adapter)))).toThrow(
      "already registered",
    );
    expect(() => registry.resolve("nope")).toThrow('unknown agent: "nope"');
  });
});
