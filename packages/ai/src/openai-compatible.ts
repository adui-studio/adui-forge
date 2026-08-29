import type { AgentMessage, AgentTool, ModelAdapter, ModelTurnResult } from "@adui-forge/contracts";
import {
  streamText,
  tool as defineAiTool,
  type LanguageModel,
  type ModelMessage,
  type ToolSet,
} from "ai";

/** AgentMessage[] → AI SDK ModelMessage[]，含 assistant tool-call 与 tool-result 配对。 */
export const toModelMessages = (messages: AgentMessage[]): ModelMessage[] => {
  return messages.map((message) => {
    switch (message.role) {
      case "system":
        return { role: "system", content: message.content };
      case "user":
        return { role: "user", content: message.content };
      case "assistant": {
        const parts: Array<
          | { type: "text"; text: string }
          | { type: "tool-call"; toolCallId: string; toolName: string; input: unknown }
        > = [];
        if (message.content.length > 0) {
          parts.push({ type: "text", text: message.content });
        }
        for (const call of message.toolCalls ?? []) {
          parts.push({
            type: "tool-call",
            toolCallId: call.id,
            toolName: call.name,
            input: call.input,
          });
        }
        return { role: "assistant", content: parts };
      }
      case "tool":
        return {
          role: "tool",
          content: [
            {
              type: "tool-result",
              toolCallId: message.toolCallId ?? "",
              toolName: message.toolName ?? "",
              output: { type: "text", value: message.content },
            },
          ],
        };
    }
  });
};

/** AgentTool[] → AI SDK ToolSet。不挂 execute：工具执行权始终在 Agent Loop。 */
export const toToolSet = (tools: AgentTool[]): ToolSet => {
  const set: ToolSet = {};
  for (const agentTool of tools) {
    set[agentTool.name] = defineAiTool({
      description: agentTool.description,
      inputSchema: agentTool.inputSchema,
    });
  }
  return set;
};

/** 基于任意 AI SDK LanguageModel 构造 ModelAdapter（streamText 真实流式，REQUIREMENTS §60）。 */
export const createModelAdapter = (model: LanguageModel): ModelAdapter => {
  return {
    async generate(messages, tools, context): Promise<ModelTurnResult> {
      const result = streamText({
        model,
        messages: toModelMessages(messages),
        tools: toToolSet(tools),
        abortSignal: context.signal,
        // 重试策略由 Agent Loop / 调用方控制，此层不做静默重试
        maxRetries: 0,
      });

      // token 增量实时回传给 Loop（→ model.delta 事件 → SSE）
      for await (const delta of result.textStream) {
        context.onDelta?.(delta);
      }

      const [text, toolCalls, usage] = await Promise.all([
        result.text,
        result.toolCalls,
        result.usage,
      ]);

      return {
        content: text.length > 0 ? text : null,
        toolCalls: toolCalls.map((call) => ({
          id: call.toolCallId,
          name: call.toolName,
          input: call.input,
        })),
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
      };
    },
  };
};
