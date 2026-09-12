import { describe, expect, it } from "vite-plus/test";
import { z } from "zod";
import type { AgentTool, ModelAdapter, ModelTurnResult } from "@adui-forge/contracts";
import { defineAgent, AgentRegistry } from "@adui-forge/agent";
import { AgentConfigService, AGENT_BUILD_CONTEXT } from "../src/agents/agent-config.service";
import { InMemoryAgentConfigStore, AGENT_CONFIG_STORE } from "../src/agents/agent-config.store";
import { DEFAULT_AGENT_NAME } from "../src/agents/agent.factory";
import type { AgentBuildContext } from "../src/agents/agent.factory";

const echoTool: AgentTool<{ text: string }> = {
  name: "echo",
  description: "echo text",
  permission: "free",
  inputSchema: z.object({ text: z.string() }),
  async execute(input) {
    return input.text;
  },
};

const buildContext = (): AgentBuildContext => ({
  config: { name: "p", baseURL: "http://localhost", modelId: "test-model" },
  toolPool: [echoTool],
});

const buildService = () => {
  const registry = new AgentRegistry();
  registry.register(
    defineAgent({
      name: DEFAULT_AGENT_NAME,
      description: "builtin",
      systemPrompt: "sys",
      model: {
        async generate(): Promise<ModelTurnResult> {
          return { content: "ok", toolCalls: [] };
        },
      } satisfies ModelAdapter,
      tools: [],
      loop: { maxSteps: 2, timeoutMs: 2000 },
    }),
  );
  const store = new InMemoryAgentConfigStore();
  const service = new AgentConfigService(store, registry, buildContext()) as unknown as {
    onModuleInit(): Promise<void>;
  } & AgentConfigService;
  return { registry, store, service };
};

const baseInput = {
  name: "reviewer",
  description: "code reviewer",
  systemPrompt: "You review code.",
  tools: ["echo"],
  maxSteps: 8,
  timeoutMs: 60_000,
};

describe("AgentConfigService", () => {
  it("创建自定义 Agent 后可从注册表解析，再次保存为更新", async () => {
    const { registry, service } = buildService();
    await service.createOrUpdate(baseInput);
    expect(registry.get("reviewer")?.systemPrompt).toBe("You review code.");
    expect(registry.get("reviewer")?.tools.map((tool) => tool.name)).toEqual(["echo"]);

    await service.createOrUpdate({ ...baseInput, systemPrompt: "updated prompt" });
    expect(registry.get("reviewer")?.systemPrompt).toBe("updated prompt");
  });

  it("启动时装载持久化配置到注册表", async () => {
    const { registry, store, service } = buildService();
    await store.upsert({ ...baseInput, createdAt: new Date().toISOString() });
    await service.onModuleInit();
    expect(registry.get("reviewer")).toBeDefined();
  });

  it("引用未知工具名时显式失败且不落库", async () => {
    const { store, service } = buildService();
    await expect(service.createOrUpdate({ ...baseInput, tools: ["nope"] })).rejects.toThrow(
      'unknown tool: "nope"',
    );
    expect(await store.get("reviewer")).toBeNull();
  });

  it("内置 Agent 不可覆盖或删除；删除自定义 Agent 后从注册表移除", async () => {
    const { registry, service } = buildService();
    await expect(
      service.createOrUpdate({ ...baseInput, name: DEFAULT_AGENT_NAME }),
    ).rejects.toThrow("内置 Agent");
    await expect(service.delete(DEFAULT_AGENT_NAME)).rejects.toThrow("内置 Agent");

    await service.createOrUpdate(baseInput);
    await service.delete("reviewer");
    expect(registry.get("reviewer")).toBeUndefined();
    await expect(service.delete("reviewer")).rejects.toThrow("unknown agent config");
  });

  it("AGENT_BUILD_CONTEXT symbol 已导出（DI token）", () => {
    expect(typeof AGENT_BUILD_CONTEXT).toBe("symbol");
    expect(typeof AGENT_CONFIG_STORE).toBe("symbol");
  });
});
