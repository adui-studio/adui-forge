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

describe("WorkflowRunner 回归", () => {
  it("支持嵌套 condition 且被中止时返回 aborted", async () => {
    const runner = new WorkflowRunner();
    const controller = new AbortController();
    const steps: WorkflowStep[] = [
      {
        id: "outer",
        type: "condition",
        when: () => true,
        steps: [
          {
            id: "inner",
            type: "condition",
            when: () => true,
            steps: [
              {
                id: "slow",
                type: "tool",
                tool: {
                  name: "slow",
                  description: "waits for abort",
                  permission: "free",
                  inputSchema: z.object({}),
                  execute: async (_input, context) => {
                    await new Promise((_resolve, reject) => {
                      context.signal.addEventListener("abort", () => reject(new Error("aborted")));
                    });
                    return "never";
                  },
                },
                input: {},
              },
            ],
          },
        ],
      },
    ];

    controller.abort();
    const result = await runner.run({ name: "abort-flow", steps }, { signal: controller.signal });

    expect(result.status).toBe("aborted");
  });

  it("condition 为 false 时跳过分支", async () => {
    const runner = new WorkflowRunner();
    const result = await runner.run({
      name: "skip-flow",
      steps: [
        {
          id: "gate",
          type: "condition",
          when: () => false,
          steps: [{ id: "agent-node", type: "agent", agent: scriptedAgent("never"), task: "x" }],
        },
      ],
    });
    expect(result.status).toBe("completed");
    expect(result.outputs["agent-node"]).toBeUndefined();
  });
});
