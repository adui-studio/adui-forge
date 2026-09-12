import { Logger } from "@nestjs/common";
import type { AgentTool } from "@adui-forge/contracts";
import { defineAgent, type Agent, AgentRegistry } from "@adui-forge/agent";
import { createOpenAICompatibleModelAdapter } from "@adui-forge/ai";
import {
  createFileTools,
  createGitTools,
  createShellExecTool,
  DockerSandbox,
  HostSandbox,
  type Sandbox,
} from "@adui-forge/tool-sdk";

/** 默认示例 Agent 的名字。 */
export const DEFAULT_AGENT_NAME = "forge-dev";

export interface ForgeModelConfig {
  name: string;
  baseURL: string;
  modelId: string;
  apiKey?: string;
}

/** 从环境变量读取模型配置并组装默认 Agent 的选项。 */
export interface ToolPoolOptions {
  workspaceRoot?: string;
  /**
   * Sandbox 选择：docker（默认，容器隔离，无需信任模式）| host | off。
   * host 仅在 trustedLocalMode 开启时生效（REQUIREMENTS.md §47）。
   */
  sandbox?: "docker" | "host" | "off";
  /** DockerSandbox 使用的镜像，默认 node:22-bookworm。 */
  sandboxImage?: string;
  trustedLocalMode?: boolean;
  /** 由 MCP Server 桥接而来的工具（启动时连接并列举）。 */
  mcpTools?: AgentTool[];
}

/** 全量工具池：自定义 Agent 从中按名选择（未知名在构建时拒绝）。 */
export const buildToolPool = (options: ToolPoolOptions): AgentTool[] => {
  const tools: AgentTool[] = [];
  const {
    workspaceRoot,
    trustedLocalMode,
    sandbox: sandboxMode = "docker",
    sandboxImage,
  } = options;
  if (workspaceRoot !== undefined && workspaceRoot !== "") {
    tools.push(...createFileTools({ root: workspaceRoot }));

    let sandbox: Sandbox | undefined;
    if (sandboxMode === "docker") {
      sandbox = new DockerSandbox({ workspaceRoot, image: sandboxImage });
    } else if (sandboxMode === "host" && trustedLocalMode === true) {
      // HostSandbox 无隔离边界，仅因 Trusted Local Mode 显式开启而存在
      sandbox = new HostSandbox();
    }

    if (sandbox !== undefined) {
      // shell_exec / git_add / git_commit 均为 approval 权限，Loop 会强制人工审批
      tools.push(
        ...createGitTools({ sandbox, workspaceRoot }),
        createShellExecTool({ sandbox, workspaceRoot }),
      );
    }
  }
  tools.push(...(options.mcpTools ?? []));
  return tools;
};

/** 自定义 Agent 的持久化定义（与 AgentConfigRecord 对齐）。 */
export interface AgentConfigDefinition {
  name: string;
  description: string;
  systemPrompt: string;
  /** 从工具池中选择的工具名列表。 */
  tools: string[];
  maxSteps: number;
  timeoutMs: number;
  tokenLimit?: number;
}

/** 构建 Agent 所需的运行时上下文（模型、工具池、审批处理器）。 */
export interface AgentBuildContext {
  config: ForgeModelConfig | null;
  toolPool: AgentTool[];
  approvals?: {
    createPending: (request: {
      runId: string;
      toolName: string;
      input: unknown;
      reason: string;
    }) => { promise: Promise<"approved" | "rejected"> };
  };
}

const defaultAgentDescription = (sandboxMode: string, trustedLocalMode: boolean): string =>
  "ADui Forge 默认开发 Agent（OpenAI Compatible 模型 + Workspace 文件工具" +
  (sandboxMode === "docker"
    ? " + Shell/Git（Docker Sandbox）"
    : trustedLocalMode === true
      ? " + Shell/Git（Trusted Local Mode）"
      : "") +
  "）";

/** 由持久化定义构建可运行 Agent；引用未知工具名时显式失败。 */
export const buildAgentFromDefinition = (
  definition: AgentConfigDefinition,
  context: AgentBuildContext,
): Agent => {
  const tools: AgentTool[] = [];
  for (const toolName of definition.tools) {
    const tool = context.toolPool.find((candidate) => candidate.name === toolName);
    if (tool === undefined) {
      throw new Error(`unknown tool: "${toolName}"`);
    }
    tools.push(tool);
  }
  return defineAgent({
    name: definition.name,
    description: definition.description,
    systemPrompt: definition.systemPrompt,
    // 运行中审批：approval 级工具触发 PendingApproval，REST 决策后 resolve 继续执行
    approval:
      context.approvals === undefined
        ? undefined
        : {
            requestApproval: async (request) => {
              const approvals = context.approvals;
              if (approvals === undefined) {
                throw new Error("approval handler unavailable");
              }
              const { promise } = approvals.createPending(request);
              return promise;
            },
          },
    model: createOpenAICompatibleModelAdapter({
      name: context.config?.name ?? "forge-provider",
      baseURL: context.config?.baseURL ?? "",
      apiKey: context.config?.apiKey,
      modelId: context.config?.modelId ?? "",
    }),
    tools,
    loop: {
      maxSteps: definition.maxSteps,
      timeoutMs: definition.timeoutMs,
      tokenLimit: definition.tokenLimit,
    },
  });
};

/**
 * 解析 FORGE_MCP_SERVERS 环境变量（JSON 数组：name / command / args? / env?）。
 */
export interface McpServerConfig {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export const parseMcpServers = (raw: string | undefined): McpServerConfig[] => {
  if (raw === undefined || raw.trim() === "") {
    return [];
  }
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error("FORGE_MCP_SERVERS must be a JSON array");
  }
  return parsed.map((item) => {
    const server = item as Partial<McpServerConfig>;
    if (typeof server.name !== "string" || typeof server.command !== "string") {
      throw new Error("FORGE_MCP_SERVERS entry requires name and command");
    }
    return {
      name: server.name,
      command: server.command,
      args: server.args,
      env: server.env,
    };
  });
};

/**
 * 从环境变量读取模型配置。
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

/**
 * 组装 Agent 构建上下文：读模型配置、连接 MCP Server、构建工具池。
 * 默认 Agent 与自定义 Agent 共用同一上下文，保证工具池一致。
 */
export const buildAgentBuildContext = async (
  approvals?: AgentBuildContext["approvals"],
  env: NodeJS.ProcessEnv = process.env,
  logger: { log(message: string): void; warn(message: string): void } = new Logger("AgentFactory"),
): Promise<AgentBuildContext> => {
  const config = readForgeModelConfig(env);
  if (config === null) {
    return { config: null, toolPool: [], approvals };
  }
  const trustedLocalMode = env.FORGE_TRUSTED_LOCAL_MODE === "1";
  if (trustedLocalMode) {
    logger.warn("Trusted Local Mode 已开启：进程可在宿主机执行（无隔离）");
  }
  const mcpTools: AgentTool[] = [];
  for (const server of parseMcpServers(env.FORGE_MCP_SERVERS)) {
    try {
      const { connectStdioServer, createMcpTools } = await import("@adui-forge/mcp");
      const connection = await connectStdioServer({
        name: server.name,
        command: server.command,
        args: server.args,
        env: server.env,
      });
      mcpTools.push(...(await createMcpTools(connection)));
      logger.log(`MCP server "${server.name}" connected`);
    } catch (error) {
      logger.warn(
        `MCP server "${server.name}" 连接失败，已跳过: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  const toolPool = buildToolPool({
    workspaceRoot: env.FORGE_WORKSPACE_ROOT,
    trustedLocalMode,
    sandbox: (env.FORGE_SANDBOX ?? "docker") as "docker" | "host" | "off",
    sandboxImage: env.FORGE_SANDBOX_IMAGE,
    mcpTools,
  });
  return { config, toolPool, approvals };
};

/** 组装并注册默认 Agent；模型未配置时跳过注册并告警（启动不失败，Run 时显式 404）。 */
export const registerDefaultAgent = async (
  registry: AgentRegistry,
  context: AgentBuildContext,
): Promise<void> => {
  const logger = new Logger("AgentFactory");
  const { config } = context;
  if (config === null) {
    logger.warn(
      "FORGE_MODEL_BASE_URL / FORGE_MODEL_ID 未配置，默认 Agent 未注册；Run 请求将返回 404",
    );
    return;
  }
  const trustedLocalMode = process.env.FORGE_TRUSTED_LOCAL_MODE === "1";
  const sandbox = (process.env.FORGE_SANDBOX ?? "docker") as "docker" | "host" | "off";
  registry.register(
    buildAgentFromDefinition(
      {
        name: DEFAULT_AGENT_NAME,
        description: defaultAgentDescription(sandbox, trustedLocalMode),
        systemPrompt:
          "You are ADui Forge, a careful software engineering agent. " +
          "Inspect before you change, plan minimal diffs, and verify with tests.",
        tools: context.toolPool.map((tool) => tool.name),
        maxSteps: Number(process.env.FORGE_AGENT_MAX_STEPS ?? 16),
        timeoutMs: Number(process.env.FORGE_AGENT_TIMEOUT_MS ?? 300_000),
        tokenLimit: process.env.FORGE_AGENT_TOKEN_LIMIT
          ? Number(process.env.FORGE_AGENT_TOKEN_LIMIT)
          : undefined,
      },
      context,
    ),
  );
  logger.log(`default agent "${DEFAULT_AGENT_NAME}" registered (model: ${config.modelId})`);
};
