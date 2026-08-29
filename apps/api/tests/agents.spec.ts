import { describe, expect, it } from "vite-plus/test";
import { AgentsController } from "../src/agents/agents.controller";

describe("AgentsController", () => {
  it("lists registered agents with tool names", () => {
    const controller = new AgentsController({
      list: () => [
        {
          name: "forge-dev",
          description: "test",
          tools: [
            {
              name: "echo",
              description: "",
              permission: "free",
              inputSchema: {},
              execute: async () => null,
            },
            {
              name: "dangerous",
              description: "",
              permission: "approval",
              inputSchema: {},
              execute: async () => null,
            },
          ],
        },
      ],
    } as never);
    const agents = controller.list();
    expect(agents).toHaveLength(1);
    expect(agents[0]).toMatchObject({ name: "forge-dev", tools: ["echo", "dangerous"] });
  });
});
