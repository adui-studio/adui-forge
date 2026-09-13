import { createOpenAICompatibleModelAdapter } from "@adui-forge/ai";
import { defineAgent, AgentRegistry, type Agent } from "@adui-forge/agent";
import type { AgentTool } from "@adui-forge/contracts";
import {
  createFileTools,
  createGitTools,
  createShellExecTool,
  HostSandbox,
} from "@adui-forge/tool-sdk";

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

/** 本地 Agent 装配选项（ADR-006）：trustedLocalMode 由用户在 Desktop 前端显式开启。 */
export interface LocalAgentOptions {
  workspaceRoot: string;
  trustedLocalMode: boolean;
  /** approval 级工具触发时创建 Pending 并等待决策（trusted 模式必填）。 */
  createPending?: (request: {
    runId: string;
    toolName: string;
    input: unknown;
    reason: string;
  }) => { promise: Promise<"approved" | "rejected"> };
}

/**
 * 本地 Agent 装配（ADR-005/006）：
 * - 模型走 FORGE_MODEL_*，文件工具恒可用（边界内）；
 * - Trusted Local Mode 显式开启时追加 Shell/Git（HostSandbox），全部 approval 级；
 * - 非信任模式能力上限即文件读写（默认拒绝，与 v0.6.x 兼容）。
 */
export const buildLocalAgents = (
  options: LocalAgentOptions,
  env: NodeJS.ProcessEnv = process.env,
): AgentRegistry | null => {
  const config = readForgeModelConfig(env);
  if (config === null) return null;

  const tools: AgentTool[] = [...createFileTools({ root: options.workspaceRoot })];
  if (options.trustedLocalMode) {
    // HostSandbox 无隔离边界，仅因用户显式信任而存在（ADR-006 §1/§2）
    const sandbox = new HostSandbox();
    tools.push(
      ...createGitTools({ sandbox, workspaceRoot: options.workspaceRoot }),
      createShellExecTool({ sandbox, workspaceRoot: options.workspaceRoot }),
    );
  }

  const createPending = options.createPending;
  const approval =
    options.trustedLocalMode && createPending !== undefined
      ? {
          requestApproval: async (request: {
            runId: string;
            toolName: string;
            input: unknown;
            reason: string;
          }) => {
            const { promise } = createPending(request);
            return promise;
          },
        }
      : undefined;

  const agent: Agent = defineAgent({
    name: LOCAL_AGENT_NAME,
    description:
      "ADui Forge 本地开发 Agent（FORGE_MODEL_* 模型 + Workspace 文件工具" +
      (options.trustedLocalMode ? " + Shell/Git（Trusted Local Mode）" : "") +
      "）",
    systemPrompt:
      "You are ADui Forge running locally. Inspect before you change, plan minimal diffs, and verify with tests.",
    model: createOpenAICompatibleModelAdapter({
      name: config.name,
      baseURL: config.baseURL,
      apiKey: config.apiKey,
      modelId: config.modelId,
    }),
    tools,
    loop: {
      maxSteps: Number(env.FORGE_AGENT_MAX_STEPS ?? 16),
      timeoutMs: Number(env.FORGE_AGENT_TIMEOUT_MS ?? 300_000),
      tokenLimit: env.FORGE_AGENT_TOKEN_LIMIT ? Number(env.FORGE_AGENT_TOKEN_LIMIT) : undefined,
    },
    approval,
  });

  const registry = new AgentRegistry();
  registry.register(agent);
  return registry;
};
