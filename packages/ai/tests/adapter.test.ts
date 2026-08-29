import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it } from "vite-plus/test";
import { createModelAdapter } from "../src/openai-compatible.ts";
import { ModelRegistry } from "../src/registry.ts";

const usage = {
  inputTokens: { total: 5, noCache: 5, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 2, text: 2, reasoning: undefined },
};

describe("createModelAdapter", () => {
  it("maps a text-only turn", async () => {
    const model = new MockLanguageModelV4({
      doGenerate: async () => ({
        content: [{ type: "text", text: "hello forge" }],
        finishReason: { unified: "stop", raw: undefined },
        usage,
        warnings: [],
      }),
    });

    const turn = await createModelAdapter(model).generate(
      [{ role: "user", content: "hi" }],
      [],
      new AbortController().signal,
    );

    expect(turn.content).toBe("hello forge");
    expect(turn.toolCalls).toEqual([]);
    expect(turn.inputTokens).toBe(5);
    expect(turn.outputTokens).toBe(2);
  });

  it("maps a tool-call turn and parses the stringified input", async () => {
    const model = new MockLanguageModelV4({
      doGenerate: async () => ({
        content: [
          {
            type: "tool-call",
            toolCallId: "call_1",
            toolName: "echo",
            input: JSON.stringify({ message: "yo" }),
          },
        ],
        finishReason: { unified: "tool-calls", raw: undefined },
        usage,
        warnings: [],
      }),
    });

    const turn = await createModelAdapter(model).generate(
      [{ role: "user", content: "hi" }],
      [],
      new AbortController().signal,
    );

    expect(turn.content).toBeNull();
    expect(turn.toolCalls).toEqual([{ id: "call_1", name: "echo", input: { message: "yo" } }]);
  });
});

describe("ModelRegistry", () => {
  it("resolves modelId to an adapter and rejects unknown ids", () => {
    const registry = new ModelRegistry();
    registry.register("forge-chat-mini", () => createModelAdapter(new MockLanguageModelV4()));
    expect(registry.list()).toEqual(["forge-chat-mini"]);
    expect(typeof registry.resolve("forge-chat-mini").generate).toBe("function");
    expect(() => registry.resolve("nope")).toThrow('unknown modelId: "nope"');
  });

  it("rejects duplicate registration", () => {
    const registry = new ModelRegistry();
    registry.register("m", () => createModelAdapter(new MockLanguageModelV4()));
    expect(() =>
      registry.register("m", () => createModelAdapter(new MockLanguageModelV4())),
    ).toThrow("already registered");
  });
});
