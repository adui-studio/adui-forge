import { describe, expect, it } from "vite-plus/test";
import { z } from "zod";
import type { AgentTool, ModelTurnResult } from "@adui-forge/contracts";
import { defineAgent, AgentRegistry } from "@adui-forge/agent";
import { ApprovalService } from "../src/approvals/approval.service";
import { InMemoryRunStore } from "../src/runs/in-memory-run.store";
import { RunService } from "../src/runs/run.service";
import { decisionSchema } from "../src/approvals/approvals.controller";

const dangerousTool: AgentTool<{ message: string }> = {
  name: "dangerous",
  description: "Requires approval",
  permission: "approval",
  inputSchema: z.object({ message: z.string() }),
  async execute(input) {
    return `did: ${input.message}`;
  },
};

const buildAgent = (registry: AgentRegistry, approvals: ApprovalService) => {
  const agent = defineAgent({
    name: "forge-dev",
    description: "test",
    systemPrompt: "sys",
    model: (() => {
      let turn = 0;
      return {
        async generate(): Promise<ModelTurnResult> {
          turn += 1;
          return turn === 1
            ? {
                content: null,
                toolCalls: [{ id: "call_1", name: "dangerous", input: { message: "go" } }],
              }
            : { content: "done", toolCalls: [] };
        },
      };
    })(),
    tools: [dangerousTool],
    loop: { maxSteps: 2, timeoutMs: 3000 },
    approval: {
      requestApproval: async (request) => {
        const { promise } = approvals.createPending(request);
        return promise;
      },
    },
  });
  registry.register(agent);
  return agent;
};

describe("Approval 闭环", () => {
  it("run 等待审批 → REST 决策 approved → 继续执行完成", async () => {
    const approvals = new ApprovalService();
    const registry = new AgentRegistry();
    buildAgent(registry, approvals);
    const service = new RunService(new InMemoryRunStore(), registry);

    const record = await service.createRun({ agentName: "forge-dev", task: "go" });
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(approvals.list()).toHaveLength(1);
    const pending = approvals.list()[0];
    expect(pending?.toolName).toBe("dangerous");

    const waiting = await service.getRun(record.id);
    expect(waiting.status).toBe("waiting_approval");

    expect(approvals.resolve(pending?.id ?? "", "approved")).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 50));

    const finished = await service.getRun(record.id);
    expect(finished.status).toBe("completed");
    expect(finished.events.some((event) => event.name === "approval.approved")).toBe(true);
  }, 10_000);

  it("rejected 决策让 Run 正常收敛（工具被拒）", async () => {
    const approvals = new ApprovalService();
    const registry = new AgentRegistry();
    buildAgent(registry, approvals);
    const service = new RunService(new InMemoryRunStore(), registry);

    const record = await service.createRun({ agentName: "forge-dev", task: "go" });
    await new Promise((resolve) => setTimeout(resolve, 30));
    approvals.resolve(approvals.list()[0]?.id ?? "", "rejected");
    await new Promise((resolve) => setTimeout(resolve, 50));

    const finished = await service.getRun(record.id);
    expect(finished.status).toBe("completed");
    expect(finished.events.some((event) => event.name === "approval.rejected")).toBe(true);
  }, 10_000);

  it("decisionSchema 校验与未知审批 id", () => {
    expect(() => decisionSchema.parse({ decision: "maybe" })).toThrow();
    expect(new ApprovalService().resolve("nope", "approved")).toBe(false);
  });
});
