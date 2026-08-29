import { Injectable, Logger } from "@nestjs/common";
import type { AgentTool } from "@adui-forge/contracts";
import { defineAgent, type Agent, AgentRegistry } from "@adui-forge/agent";
import { createOpenAICompatibleModelAdapter } from "@adui-forge/ai";
import { createFileTools } from "@adui-forge/tool-sdk";

/** 默认示例 Agent 的名字。 */
export const DEFAULT_AGENT_NAME = "forge-dev";

export interface ForgeModelConfig {
  name: string;
  baseURL: string;
  modelId: string;
  apiKey?: string;
}

/**
 * 从环境变量读取模型配置并组装默认 Agent。
 *
 * FORGE_MODEL_BASE_URL / FORGE_MODEL_ID / [FORGE_MODEL_API_KEY] / [FORGE_MODEL_NAME]
 * 未配置时返回 null 并由调用方决定行为——不允许用假配置静默启动。
 */
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

export const buildDefaultAgent = (config: ForgeModelConfig, workspaceRoot?: string): Agent => {
  const tools: AgentTool[] = workspaceRoot ? createFileTools({ root: workspaceRoot }) : [];

  return defineAgent({
    name: DEFAULT_AGENT_NAME,
    description: "ADui Forge 默认开发 Agent（OpenAI Compatible 模型 + Workspace 文件工具）",
    systemPrompt:
      "You are ADui Forge, a careful software engineering agent. " +
      "Inspect before you change, plan minimal diffs, and verify with tests.",
    model: createOpenAICompatibleModelAdapter({
      name: config.name,
      baseURL: config.baseURL,
      apiKey: config.apiKey,
      modelId: config.modelId,
    }),
    tools,
    loop: {
      maxSteps: Number(process.env.FORGE_AGENT_MAX_STEPS ?? 16),
      timeoutMs: Number(process.env.FORGE_AGENT_TIMEOUT_MS ?? 300_000),
      tokenLimit: process.env.FORGE_AGENT_TOKEN_LIMIT
        ? Number(process.env.FORGE_AGENT_TOKEN_LIMIT)
        : undefined,
    },
  });
};

/** 组装并注册默认 Agent；模型未配置时跳过注册并告警（启动不失败，Run 时显式 404）。 */
export const registerDefaultAgent = (
  registry: AgentRegistry,
  env: NodeJS.ProcessEnv = process.env,
): void => {
  const logger = new Logger("AgentFactory");
  const config = readForgeModelConfig(env);
  if (config === null) {
    logger.warn(
      "FORGE_MODEL_BASE_URL / FORGE_MODEL_ID 未配置，默认 Agent 未注册；Run 请求将返回 404",
    );
    return;
  }
  const workspaceRoot = env.FORGE_WORKSPACE_ROOT;
  registry.register(buildDefaultAgent(config, workspaceRoot));
  logger.log(`default agent "${DEFAULT_AGENT_NAME}" registered (model: ${config.modelId})`);
};
