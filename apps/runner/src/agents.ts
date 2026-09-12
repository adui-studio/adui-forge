import { createOpenAICompatibleModelAdapter } from "@adui-forge/ai";
import { defineAgent, AgentRegistry, type Agent } from "@adui-forge/agent";
import { createFileTools } from "@adui-forge/tool-sdk";

/** 默认本地 Agent 的名字（与云端 API 一致）。 */
export const LOCAL_AGENT_NAME = "forge-local";

export interface ForgeModelConfig {
  name: string;
  baseURL: string;
  modelId: string;
  apiKey?: string;
}

/** 读取 FORGE_MODEL_* 模型配置；未配置时返回 null（Runner 显式降级）。 */
export const readForgeModelConfig = (
  env: NodeJS.ProcessEnv = process.env,
): ForgeModelConfig | null => {
  const baseURL = env.FORGE_MODEL_BASE_URL;
  const modelId = env.FORGE_MODEL_ID;
  if (baseURL === undefined || baseURL === "" || modelId === undefined || modelId === "") {
    return null;
  }
  return {
    name: env.FORGE_MODEL_NAME ?? "forge-provider",
    baseURL,
    modelId,
    apiKey: env.FORGE_MODEL_API_KEY,
  };
};

/**
 * 本地 Agent 装配（ADR-005 阶段 3 / REQUIREMENTS §17）：
 * 模型走 FORGE_MODEL_*，工具仅限 Workspace 文件组（边界内）。
 * Shell/Git 属进程执行类，本地 MVP 不装配（Sandbox First：无 Sandbox 即无进程工具）。
 */
export const buildLocalAgents = (
  workspaceRoot: string,
  env: NodeJS.ProcessEnv = process.env,
): AgentRegistry | null => {
  const config = readForgeModelConfig(env);
  if (config === null) return null;

  const agent: Agent = defineAgent({
    name: LOCAL_AGENT_NAME,
    description: "ADui Forge 本地开发 Agent（FORGE_MODEL_* 模型 + Workspace 文件工具，无进程执行）",
    systemPrompt:
      "You are ADui Forge running locally. Inspect before you change, plan minimal diffs, and verify with tests.",
    model: createOpenAICompatibleModelAdapter({
      name: config.name,
      baseURL: config.baseURL,
      apiKey: config.apiKey,
      modelId: config.modelId,
    }),
    tools: createFileTools({ root: workspaceRoot }),
    loop: {
      maxSteps: Number(env.FORGE_AGENT_MAX_STEPS ?? 16),
      timeoutMs: Number(env.FORGE_AGENT_TIMEOUT_MS ?? 300_000),
      tokenLimit: env.FORGE_AGENT_TOKEN_LIMIT ? Number(env.FORGE_AGENT_TOKEN_LIMIT) : undefined,
    },
  });

  const registry = new AgentRegistry();
  registry.register(agent);
  return registry;
};
