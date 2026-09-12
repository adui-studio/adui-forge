import { Body, Controller, Get, Inject, Param, Post } from "@nestjs/common";
import { z } from "zod";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { AGENT_BUILD_CONTEXT } from "./agent-config.service";
import { parseMcpServers, testMcpServerConnection, type AgentBuildContext } from "./agent.factory";

export const testMcpServerSchema = z.object({ name: z.string().min(1) });

/** MCP Server 观测端点：展示启动时的连接结果，并支持按需重连测试（不改运行中的工具池）。 */
@Controller("mcp")
export class McpController {
  constructor(@Inject(AGENT_BUILD_CONTEXT) private readonly context: AgentBuildContext) {}

  @Get("servers")
  list() {
    return this.context.mcpServers;
  }

  @Post("servers/:name/test")
  async test(
    @Param("name") name: string,
    @Body(new ZodValidationPipe(testMcpServerSchema)) _body: { name: string },
  ) {
    void _body;
    const server = parseMcpServers(process.env.FORGE_MCP_SERVERS).find(
      (candidate) => candidate.name === name,
    );
    if (server === undefined) {
      return { ok: false as const, error: `未找到名为 "${name}" 的 MCP Server 配置` };
    }
    const result = await testMcpServerConnection(server);
    if (result.ok) {
      return { ok: true as const, toolNames: result.tools.map((tool) => tool.name) };
    }
    return { ok: false as const, error: result.error };
  }
}
