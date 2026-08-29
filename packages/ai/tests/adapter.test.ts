import type { LanguageModelV4StreamPart } from "@ai-sdk/provider";
import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it } from "vite-plus/test";
import { createModelAdapter } from "../src/openai-compatible.ts";
import { ModelRegistry } from "../src/registry.ts";

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

const textStream = (deltas: string[]): LanguageModelV4StreamPart[] => [
  { type: "stream-start", warnings: [] },
  ...deltas.flatMap((delta): LanguageModelV4StreamPart[] => [
    { type: "text-start", id: "t1" },
    { type: "text-delta", id: "t1", delta },
    { type: "text-end", id: "t1" },
  ]),
  { type: "finish", finishReason: { unified: "stop", raw: undefined }, usage },
];

describe("createModelAdapter（streamText 流式）", () => {
  it("streams token deltas through onDelta and maps the final turn", async () => {
    const model = new MockLanguageModelV4({
      doStream: async () => ({
        stream: streamFrom(textStream(["hel", "lo forge"])),
      }),
    });
    const deltas: string[] = [];

    const turn = await createModelAdapter(model).generate([{ role: "user", content: "hi" }], [], {
      signal: new AbortController().signal,
      onDelta: (delta) => deltas.push(delta),
    });

    expect(deltas).toEqual(["hel", "lo forge"]);
    expect(turn.content).toBe("hello forge");
    expect(turn.toolCalls).toEqual([]);
    expect(turn.inputTokens).toBe(5);
    expect(turn.outputTokens).toBe(2);
  });

  it("maps a streamed tool-call turn and parses the stringified input", async () => {
    const model = new MockLanguageModelV4({
      doStream: async () => ({
        stream: streamFrom([
          { type: "stream-start", warnings: [] },
          {
            type: "tool-call",
            toolCallId: "call_1",
            toolName: "echo",
            input: JSON.stringify({ message: "yo" }),
          },
          { type: "finish", finishReason: { unified: "tool-calls", raw: undefined }, usage },
        ]),
      }),
    });

    const turn = await createModelAdapter(model).generate([{ role: "user", content: "hi" }], [], {
      signal: new AbortController().signal,
    });

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
