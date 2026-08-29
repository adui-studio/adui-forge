import { describe, expect, it } from "vite-plus/test";
import type { ModelAdapter } from "@adui-forge/contracts";
import { defineAgent } from "../src/define.ts";
import { agentToTool } from "../src/agent-as-tool.ts";

const specialist = defineAgent({
  name: "specialist",
  description: "does specialist work",
  systemPrompt: "sys",
  model: {
    async generate() {
      return { content: "specialist answer", toolCalls: [] };
    },
  } satisfies ModelAdapter,
  tools: [],
  loop: { maxSteps: 2, timeoutMs: 2000 },
});

describe("agentToTool", () => {
  it("wraps an agent as a free-permission tool with prefixed name", () => {
    const tool = agentToTool({ agent: specialist });
    expect(tool.name).toBe("delegate_specialist");
    expect(tool.permission).toBe("free");
  });

  it("runs the delegated agent in its own run and returns its final answer", async () => {
    const tool = agentToTool({ agent: specialist });

    const output = await tool.execute(
      { task: "do specialist things" },
      { runId: "run_parent", signal: new AbortController().signal },
    );

    expect(output).toBe("specialist answer");
  });

  it("propagates delegated failure and forwards deltas", async () => {
    const deltas: string[] = [];
    const failing = defineAgent({
      name: "flaky",
      description: "fails at loop level",
      systemPrompt: "sys",
      model: {
        async generate(_messages, _tools, context) {
          context.onDelta?.("partial");
          return { content: null, toolCalls: [{ id: "c1", name: "missing-tool", input: {} }] };
        },
      } satisfies ModelAdapter,
      tools: [],
      loop: { maxSteps: 1, timeoutMs: 2000 },
    });
    const tool = agentToTool({ agent: failing });

    // maxSteps=1 且模型发起工具调用 → 子 Run 以 max_steps_reached 结束 → 委派失败
    await expect(
      tool.execute({ task: "x" }, { runId: "run_parent", signal: new AbortController().signal }),
    ).rejects.toThrow("max_steps_reached");
    void deltas;
  });
});
