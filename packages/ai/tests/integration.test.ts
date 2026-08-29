import { describe, expect, it } from "vite-plus/test";
import { z } from "zod";
import type { AgentTool } from "@adui-forge/contracts";
import { runAgent } from "@adui-forge/agent-runtime";
import { createModelAdapter } from "../src/openai-compatible.ts";
import { MockLanguageModelV4 } from "ai/test";

const usage = {
  inputTokens: { total: 5, noCache: 5, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 2, text: 2, reasoning: undefined },
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

describe("端到端：agent-runtime + ai + tool 协议", () => {
  it("mock 模型发起工具调用 → Loop 执行 → 第二轮收敛完成", async () => {
    const model = new MockLanguageModelV4({
      doGenerate: async (options) => {
        const isFirstTurn = options.prompt.filter((part) => part.role === "tool").length === 0;
        return isFirstTurn
          ? {
              content: [
                {
                  type: "tool-call",
                  toolCallId: "call_1",
                  toolName: "echo",
                  input: JSON.stringify({ message: "from e2e" }),
                },
              ],
              finishReason: { unified: "tool-calls", raw: undefined },
              usage,
              warnings: [],
            }
          : {
              content: [{ type: "text", text: "done" }],
              finishReason: { unified: "stop", raw: undefined },
              usage,
              warnings: [],
            };
      },
    });

    const result = await runAgent(createModelAdapter(model), [echoTool], "say hi", {
      maxSteps: 4,
      timeoutMs: 5000,
    });

    expect(result.status).toBe("completed");
    expect(result.messages.at(-2)).toMatchObject({ role: "tool", content: "echo: from e2e" });
    expect(result.messages.at(-1)).toMatchObject({ role: "assistant", content: "done" });
  });
});
