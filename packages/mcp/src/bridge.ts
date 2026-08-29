import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { z } from "zod";
import { Ajv } from "ajv";
import { defineTool } from "@adui-forge/tool-sdk";
import type { AgentTool, ToolPermission } from "@adui-forge/contracts";

const ajv = new Ajv({ strict: false });

export interface McpServerConnection {
  /** 连接名（用于工具前缀与日志），如 "github"。 */
  name: string;
  client: Client;
  /** MCP 工具的 permission；MCP 内容视为不可信输入（AGENTS.md §44），默认 approval。 */
  permission?: ToolPermission;
  timeoutMs?: number;
}

export interface McpToolInfo {
  name: string;
  description?: string;
  inputSchema?: unknown;
}

export const listMcpTools = async (client: Client): Promise<McpToolInfo[]> => {
  const { tools } = await client.listTools();
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
  }));
};

/**
 * 把 MCP Server 的工具桥接为 AgentTool（REQUIREMENTS.md §37/38）。
 *
 * - 命名加 `mcp_<server>__` 前缀，避免与内置工具冲突
 * - MCP 工具的入参是 JSON Schema：执行边界用 ajv 校验（协议层为 zod passthrough）
 * - permission 默认 approval：MCP 视为不可信外部能力，不自动获得高级权限
 */
export const createMcpTools = async (connection: McpServerConnection): Promise<AgentTool[]> => {
  const tools = await listMcpTools(connection.client);
  const timeoutMs = connection.timeoutMs ?? 60_000;

  return tools.map((mcpTool) => {
    const validate = mcpTool.inputSchema
      ? ajv.compile(mcpTool.inputSchema as Record<string, unknown>)
      : null;
    const toolName = `mcp_${connection.name}__${mcpTool.name}`;

    return defineTool({
      name: toolName,
      description: `[MCP:${connection.name}] ${mcpTool.description ?? mcpTool.name}`,
      permission: connection.permission ?? "approval",
      inputSchema: z.unknown(),
      execute: async (input) => {
        if (validate !== null && !validate(input)) {
          const errors = (validate.errors ?? [])
            .map((issue) => `${issue.instancePath}: ${issue.message}`)
            .join("; ");
          throw new Error(`invalid MCP tool input — ${errors}`);
        }
        const result = await connection.client.callTool(
          { name: mcpTool.name, arguments: (input ?? {}) as Record<string, unknown> },
          undefined,
          { timeout: timeoutMs },
        );
        const content = Array.isArray(result.content)
          ? result.content
              .map((part) => (part.type === "text" ? part.text : `[${part.type} content]`))
              .join("\n")
          : "";
        if (result.isError === true) {
          throw new Error(`MCP tool "${mcpTool.name}" failed: ${content}`);
        }
        return content;
      },
    });
  });
};

/** 通过 stdio 启动并连接一个 MCP Server（npx / node / 可执行文件均可）。 */
export const connectStdioServer = async (params: {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  permission?: ToolPermission;
  timeoutMs?: number;
}): Promise<McpServerConnection & { close: () => Promise<void> }> => {
  const { StdioClientTransport } = await import("@modelcontextprotocol/sdk/client/stdio.js");
  const transport = new StdioClientTransport({
    command: params.command,
    args: params.args ?? [],
    env: params.env as Record<string, string> | undefined,
  });
  const client = new Client({ name: `adui-forge-${params.name}`, version: "0.0.0" });
  await client.connect(transport);
  return {
    name: params.name,
    client,
    permission: params.permission,
    timeoutMs: params.timeoutMs,
    close: async () => {
      await client.close();
    },
  };
};
