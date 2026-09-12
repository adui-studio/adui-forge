import { describe, expect, it } from "vite-plus/test";
import { McpController } from "../src/agents/mcp.controller";
import { buildAgentBuildContext, testMcpServerConnection } from "../src/agents/agent.factory";
import type { AgentBuildContext } from "../src/agents/agent.factory";

describe("MCP Server 观测", () => {
  it("连接失败的 server 记录 failed 与错误信息，不进工具池", async () => {
    const env = {
      FORGE_MODEL_BASE_URL: "http://localhost:1",
      FORGE_MODEL_ID: "m1",
      FORGE_MCP_SERVERS: JSON.stringify([
        { name: "broken", command: "definitely-not-a-real-binary-xyz" },
      ]),
    } as unknown as NodeJS.ProcessEnv;
    const context: AgentBuildContext = await buildAgentBuildContext(undefined, env, {
      log: () => {},
      warn: () => {},
    });
    expect(context.mcpServers).toHaveLength(1);
    expect(context.mcpServers[0]).toMatchObject({
      name: "broken",
      status: "failed",
      toolNames: [],
    });
    expect(context.mcpServers[0]?.error).toBeTruthy();
    // 失败服务的工具不应出现在池里
    expect(context.toolPool.every((tool) => !tool.name.startsWith("mcp_"))).toBe(true);
  }, 15_000);

  it("未配置 FORGE_MCP_SERVERS 时上下文为空列表", async () => {
    const context = await buildAgentBuildContext(
      undefined,
      {
        FORGE_MODEL_BASE_URL: "http://localhost:1",
        FORGE_MODEL_ID: "m1",
      } as unknown as NodeJS.ProcessEnv,
      { log: () => {}, warn: () => {} },
    );
    expect(context.mcpServers).toEqual([]);
  });

  it("控制器返回上下文中的 server 列表；test 未知名返回错误", async () => {
    const context = {
      mcpServers: [
        { name: "fs", command: "node", status: "connected", toolNames: ["mcp_fs_read"] },
      ],
    } as never;
    const controller = new McpController(context);
    expect(controller.list()).toHaveLength(1);
    const result = await controller.test("ghost", { name: "ghost" });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("ghost");
  }, 15_000);

  it("testMcpServerConnection 对不存在的命令返回 ok:false", async () => {
    const result = await testMcpServerConnection({
      name: "x",
      command: "definitely-not-a-real-binary-xyz",
    });
    expect(result.ok).toBe(false);
  }, 15_000);
});

// 说明：Skill 导入测试见 skills-import.spec.ts
