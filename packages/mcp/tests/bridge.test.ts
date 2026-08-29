import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { z } from "zod";
import { describe, expect, it } from "vite-plus/test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { createMcpTools } from "../src/bridge.ts";

const setUpServer = async (): Promise<Client> => {
  const server = new McpServer({ name: "test-server", version: "0.0.0" });
  server.registerTool(
    "echo",
    {
      description: "Echo a message",
      inputSchema: { message: z.string() },
    },
    async ({ message }) => ({ content: [{ type: "text", text: `echo: ${message}` }] }),
  );

  const client = new Client({ name: "test-client", version: "0.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return client;
};

describe("MCP 工具桥接", () => {
  it("lists server tools as AgentTools with mcp_ prefix and approval permission", async () => {
    const client = await setUpServer();
    const tools = await createMcpTools({ name: "test", client });

    expect(tools).toHaveLength(1);
    expect(tools[0]?.name).toBe("mcp_test__echo");
    expect(tools[0]?.permission).toBe("approval");
    expect(tools[0]?.description).toContain("[MCP:test]");
  });

  it("executes the MCP tool through the client", async () => {
    const client = await setUpServer();
    const [tool] = await createMcpTools({ name: "test", client });

    const output = (await tool?.execute({ message: "hi" } as never, {
      runId: "run_test",
      signal: new AbortController().signal,
    })) as string;

    expect(output).toBe("echo: hi");
  });

  it("rejects input failing the server JSON Schema", async () => {
    const client = await setUpServer();
    const [tool] = await createMcpTools({ name: "test", client });

    await expect(
      tool?.execute({ wrong: 1 } as never, {
        runId: "run_test",
        signal: new AbortController().signal,
      }),
    ).rejects.toThrow("invalid MCP tool input");
  });
});
