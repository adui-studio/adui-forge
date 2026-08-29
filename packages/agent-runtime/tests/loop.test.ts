import { describe, expect, it } from "vite-plus/test";
import { z } from "zod";
import { runAgent } from "../src/loop.ts";
import type { AgentEvent, AgentTool, ModelAdapter, ModelTurnResult } from "../src/types.ts";

const scriptedModel = (
  turns: ModelTurnResult[],
): { adapter: ModelAdapter; callCount: () => number } => {
  let index = 0;
  return {
    adapter: {
      async generate() {
        const turn = turns[Math.min(index, turns.length - 1)];
        index += 1;
        return turn;
      },
    },
    callCount: () => index,
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

const boomTool: AgentTool = {
  name: "boom",
  description: "Always throws",
  permission: "free",
  inputSchema: z.object({}),
  async execute() {
    throw new Error("exploded");
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

const toolCall = (name: string, input: unknown, id = "call_1") => ({
  content: null,
  toolCalls: [{ id, name, input }],
});

const collectNames = (events: AgentEvent[]) => events.map((event) => event.name);

const baseOptions = { maxSteps: 4, timeoutMs: 1000 } as const;

describe("runAgent", () => {
  it("completes when the model returns no tool calls", async () => {
    const { adapter } = scriptedModel([{ content: "done", toolCalls: [] }]);
    const events: AgentEvent[] = [];

    const result = await runAgent(adapter, [echoTool], "hi", {
      ...baseOptions,
      onEvent: (event) => events.push(event),
    });

    expect(result.status).toBe("completed");
    expect(result.steps).toBe(1);
    expect(result.messages).toEqual([
      { role: "user", content: "hi" },
      { role: "assistant", content: "done" },
    ]);
    expect(collectNames(events)).toEqual([
      "run.started",
      "step.started",
      "model.started",
      "model.completed",
      "step.completed",
      "run.completed",
    ]);
  });

  it("executes a tool and feeds the result back to the model", async () => {
    const { adapter, callCount } = scriptedModel([
      toolCall("echo", { message: "yo" }),
      { content: "all done", toolCalls: [] },
    ]);

    const result = await runAgent(adapter, [echoTool], "hi", baseOptions);

    expect(result.status).toBe("completed");
    expect(result.steps).toBe(2);
    expect(callCount()).toBe(2);
    expect(result.messages.at(-2)).toMatchObject({
      role: "tool",
      toolName: "echo",
      content: "echo: yo",
    });
  });

  it("keeps running after an unknown tool call", async () => {
    const { adapter } = scriptedModel([
      toolCall("nope", {}),
      { content: "recovered", toolCalls: [] },
    ]);
    const events: AgentEvent[] = [];

    const result = await runAgent(adapter, [echoTool], "hi", {
      ...baseOptions,
      onEvent: (event) => events.push(event),
    });

    expect(result.status).toBe("completed");
    expect(events).toContainEqual(expect.objectContaining({ name: "tool.failed" }));
    expect(result.messages.at(-2)?.content).toContain('unknown tool "nope"');
  });

  it("rejects tool input that fails schema validation", async () => {
    const { adapter } = scriptedModel([
      toolCall("echo", { message: 123 }),
      { content: "recovered", toolCalls: [] },
    ]);
    const events: AgentEvent[] = [];

    const result = await runAgent(adapter, [echoTool], "hi", {
      ...baseOptions,
      onEvent: (event) => events.push(event),
    });

    expect(result.status).toBe("completed");
    expect(events).toContainEqual(expect.objectContaining({ name: "tool.failed" }));
    expect(result.messages.at(-2)?.content).toContain("invalid tool input");
  });

  it("feeds tool failures back to the model instead of crashing", async () => {
    const { adapter } = scriptedModel([
      toolCall("boom", {}),
      { content: "recovered", toolCalls: [] },
    ]);

    const result = await runAgent(adapter, [boomTool, echoTool], "hi", baseOptions);

    expect(result.status).toBe("completed");
    expect(result.messages.at(-2)?.content).toBe("Error: exploded");
  });

  it("stops with max_steps_reached when the model always requests tools", async () => {
    const { adapter } = scriptedModel([toolCall("echo", { message: "loop" })]);

    const result = await runAgent(adapter, [echoTool], "hi", {
      maxSteps: 3,
      timeoutMs: 1000,
    });

    expect(result.status).toBe("max_steps_reached");
    expect(result.steps).toBe(3);
  });

  it("stops with token_limit_reached when tokens exceed the limit", async () => {
    const { adapter } = scriptedModel([
      { content: null, toolCalls: [], inputTokens: 80, outputTokens: 40 },
    ]);

    const result = await runAgent(adapter, [echoTool], "hi", {
      ...baseOptions,
      tokenLimit: 100,
    });

    expect(result.status).toBe("token_limit_reached");
  });

  it("returns waiting_approval when an approval tool has no handler", async () => {
    const { adapter } = scriptedModel([toolCall("dangerous", { message: "rm -rf" })]);

    const result = await runAgent(adapter, [dangerousTool], "hi", baseOptions);

    expect(result.status).toBe("waiting_approval");
    expect(result.messages.at(-1)?.content).toBe("");
  });

  it("skips the tool when approval is rejected", async () => {
    const { adapter } = scriptedModel([
      toolCall("dangerous", { message: "rm -rf" }),
      { content: "ok, skipping", toolCalls: [] },
    ]);
    const events: AgentEvent[] = [];

    const result = await runAgent(adapter, [dangerousTool], "hi", {
      ...baseOptions,
      approval: { requestApproval: async () => "rejected" },
      onEvent: (event) => events.push(event),
    });

    expect(result.status).toBe("completed");
    expect(events).toContainEqual(expect.objectContaining({ name: "approval.rejected" }));
    expect(result.messages.at(-2)?.content).toContain("rejected this tool call");
  });

  it("executes the tool when approval is granted", async () => {
    const { adapter } = scriptedModel([
      toolCall("dangerous", { message: "deploy" }),
      { content: "done", toolCalls: [] },
    ]);
    const events: AgentEvent[] = [];

    const result = await runAgent(adapter, [dangerousTool], "hi", {
      ...baseOptions,
      approval: { requestApproval: async () => "approved" },
      onEvent: (event) => events.push(event),
    });

    expect(result.status).toBe("completed");
    expect(events).toContainEqual(expect.objectContaining({ name: "approval.approved" }));
    expect(result.messages.at(-2)?.content).toBe("did: deploy");
  });

  it("returns aborted when the external signal fires", async () => {
    const controller = new AbortController();
    controller.abort();
    const adapter: ModelAdapter = {
      generate: (_messages, _tools, signal) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener("abort", () => reject(signal.reason));
        }),
    };
    const events: AgentEvent[] = [];

    const result = await runAgent(adapter, [echoTool], "hi", {
      ...baseOptions,
      signal: controller.signal,
      onEvent: (event) => events.push(event),
    });

    expect(result.status).toBe("aborted");
    expect(events).toContainEqual(expect.objectContaining({ name: "run.cancelled" }));
  });

  it("returns aborted on timeout", async () => {
    const adapter: ModelAdapter = {
      generate: (_messages, _tools, signal) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener("abort", () => reject(signal.reason));
        }),
    };

    const result = await runAgent(adapter, [echoTool], "hi", {
      maxSteps: 4,
      timeoutMs: 20,
    });

    expect(result.status).toBe("aborted");
  });

  it("rejects invalid loop options up front", async () => {
    const { adapter } = scriptedModel([{ content: "x", toolCalls: [] }]);

    await expect(runAgent(adapter, [], "hi", { maxSteps: 0, timeoutMs: 1000 })).rejects.toThrow(
      RangeError,
    );
    await expect(runAgent(adapter, [], "hi", { maxSteps: 1, timeoutMs: 0 })).rejects.toThrow(
      RangeError,
    );
  });
});
