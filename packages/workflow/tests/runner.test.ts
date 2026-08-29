import { describe, expect, it } from "vite-plus/test";
import { z } from "zod";
import type { AgentEvent, AgentTool, ModelAdapter, ModelTurnResult } from "@adui-forge/contracts";
import { defineAgent } from "@adui-forge/agent";
import { WorkflowRunner } from "../src/runner.ts";
import type { WorkflowStep } from "../src/types.ts";

const scriptedAgent = (reply: string) =>
  defineAgent({
    name: "wfa",
    description: "test",
    systemPrompt: "sys",
    model: {
      async generate(): Promise<ModelTurnResult> {
        return { content: reply, toolCalls: [] };
      },
    } satisfies ModelAdapter,
    tools: [],
    loop: { maxSteps: 2, timeoutMs: 2000 },
  });

const upperTool: AgentTool<{ text: string }> = {
  name: "upper",
  description: "Uppercase text",
  permission: "free",
  inputSchema: z.object({ text: z.string() }),
  async execute(input) {
    return input.text.toUpperCase();
  },
};

describe("WorkflowRunner", () => {
  it("runs tool → agent → condition chain and collects outputs", async () => {
    const runner = new WorkflowRunner();
    const steps: WorkflowStep[] = [
      { id: "upper", type: "tool", tool: upperTool, input: { text: "forge" } },
      {
        id: "summarize",
        type: "agent",
        agent: scriptedAgent("summary done"),
        task: (context) => `summarize: ${String(context.outputs["upper"])}`,
      },
      {
        id: "skip-branch",
        type: "condition",
        when: (context) => String(context.outputs["upper"]) === "NEVER",
        steps: [{ id: "never", type: "tool", tool: upperTool, input: { text: "x" } }],
      },
    ];
    const events: AgentEvent[] = [];

    const result = await runner.run(
      { name: "pipeline", steps },
      { onEvent: (event) => events.push(event) },
    );

    expect(result.status).toBe("completed");
    expect(result.outputs["upper"]).toBe("FORGE");
    expect(result.outputs["summarize"]).toBe("summary done");
    expect(result.outputs["never"]).toBeUndefined();
    const names = events.map((event) => event.name);
    expect(names).toContain("workflow.started");
    expect(names).toContain("workflow.step.completed");
    expect(names).toContain("workflow.completed");
  });

  it("marks failed status when an agent step does not complete", async () => {
    const runner = new WorkflowRunner();
    const failing = scriptedAgent("ignored");
    // 覆盖 run 让它返回 max_steps_reached 的效果：直接给一个会抛错的 tool 步骤
    const steps: WorkflowStep[] = [
      {
        id: "boom",
        type: "tool",
        tool: {
          name: "boom",
          description: "throws",
          permission: "free",
          inputSchema: z.object({}),
          execute: async () => {
            throw new Error("exploded");
          },
        },
        input: {},
      },
    ];

    const result = await runner.run({ name: "boom-flow", steps });

    expect(result.status).toBe("failed");
    expect(result.error).toContain("exploded");
    void failing;
  });
});
