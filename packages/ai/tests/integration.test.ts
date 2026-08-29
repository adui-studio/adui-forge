import type { LanguageModelV4StreamPart } from "@ai-sdk/provider";
import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it } from "vite-plus/test";
import { z } from "zod";
import type { AgentTool } from "@adui-forge/contracts";
import { runAgent } from "@adui-forge/agent-runtime";
import { createModelAdapter } from "../src/openai-compatible.ts";

const usage = {
  inputTokens: { total: 5, noCache: 5, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 2, text: 2, reasoning: undefined },
};

const streamFrom = (
  parts: LanguageModelV4StreamPart[],
): ReadableStream<LanguageModelV4StreamPart> => {
  return new ReadableStream<LanguageModelV4StreamPart>({
    start(controller) {
      for (const part of parts) {
        controller.enqueue(part);
      }
      controller.close();
    },
  });
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

describe("端到端：agent-runtime + ai 流式 + tool 协议", () => {
  it("mock 流式模型发起工具调用 → Loop 执行 → 第二轮流式收敛完成", async () => {
    const model = new MockLanguageModelV4({
      doStream: async (options) => {
        const isFirstTurn = options.prompt.filter((part) => part.role === "tool").length === 0;
        return {
          stream: streamFrom(
            isFirstTurn
              ? [
                  { type: "stream-start", warnings: [] },
                  {
                    type: "tool-call",
                    toolCallId: "call_1",
                    toolName: "echo",
                    input: JSON.stringify({ message: "from e2e" }),
                  },
                  {
                    type: "finish",
                    finishReason: { unified: "tool-calls", raw: undefined },
                    usage,
                  },
                ]
              : [
                  { type: "stream-start", warnings: [] },
                  { type: "text-start", id: "t1" },
                  { type: "text-delta", id: "t1", delta: "done" },
                  { type: "text-end", id: "t1" },
                  { type: "finish", finishReason: { unified: "stop", raw: undefined }, usage },
                ],
          ),
        };
      },
    });

    const deltas: string[] = [];
    const result = await runAgent(createModelAdapter(model), [echoTool], "say hi", {
      maxSteps: 4,
      timeoutMs: 5000,
      onEvent: (event) => {
        if (event.name === "model.delta") {
          deltas.push((event.payload as { text: string }).text);
        }
      },
    });

    expect(result.status).toBe("completed");
    expect(result.messages.at(-2)).toMatchObject({ role: "tool", content: "echo: from e2e" });
    expect(result.messages.at(-1)).toMatchObject({ role: "assistant", content: "done" });
    // 第二轮的 token 增量经 Loop 桥接为 model.delta 事件
    expect(deltas).toEqual(["done"]);
  });
});
