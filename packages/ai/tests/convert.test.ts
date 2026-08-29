import { describe, expect, it } from "vite-plus/test";
import { z } from "zod";
import type { AgentTool } from "@adui-forge/contracts";
import { toModelMessages, toToolSet } from "../src/openai-compatible.ts";

describe("toModelMessages", () => {
  it("maps system and user messages", () => {
    const messages = toModelMessages([
      { role: "system", content: "you are forge" },
      { role: "user", content: "hi" },
    ]);
    expect(messages).toEqual([
      { role: "system", content: "you are forge" },
      { role: "user", content: "hi" },
    ]);
  });

  it("maps assistant tool calls and tool results into paired parts", () => {
    const messages = toModelMessages([
      { role: "user", content: "run" },
      {
        role: "assistant",
        content: "calling tool",
        toolCalls: [{ id: "call_1", name: "echo", input: { message: "yo" } }],
      },
      { role: "tool", toolName: "echo", toolCallId: "call_1", content: "echo: yo" },
    ]);

    expect(messages[1]).toEqual({
      role: "assistant",
      content: [
        { type: "text", text: "calling tool" },
        {
          type: "tool-call",
          toolCallId: "call_1",
          toolName: "echo",
          input: { message: "yo" },
        },
      ],
    });
    expect(messages[2]).toEqual({
      role: "tool",
      content: [
        {
          type: "tool-result",
          toolCallId: "call_1",
          toolName: "echo",
          output: { type: "text", value: "echo: yo" },
        },
      ],
    });
  });

  it("omits the text part when assistant content is empty", () => {
    const messages = toModelMessages([
      {
        role: "assistant",
        content: "",
        toolCalls: [{ id: "c", name: "t", input: {} }],
      },
    ]);
    expect(messages[0]).toEqual({
      role: "assistant",
      content: [{ type: "tool-call", toolCallId: "c", toolName: "t", input: {} }],
    });
  });
});

describe("toToolSet", () => {
  it("maps agent tools to AI SDK tools without execute", () => {
    const echo: AgentTool<{ message: string }> = {
      name: "echo",
      description: "Echo a message",
      permission: "free",
      inputSchema: z.object({ message: z.string() }),
      execute: async (input) => input.message,
    };
    const set = toToolSet([echo]);
    expect(Object.keys(set)).toEqual(["echo"]);
    expect(set.echo).toMatchObject({ description: "Echo a message" });
  });
});
