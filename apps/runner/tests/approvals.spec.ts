import { describe, expect, it } from "vite-plus/test";
import type { ApprovalRequest } from "@adui-forge/agent-runtime";
import { RunnerApprovalService } from "../src/approvals.ts";

const request = (runId: string): ApprovalRequest => ({
  runId,
  toolName: "shell_exec",
  input: { command: "npm test" },
  reason: "high-risk shell",
});

describe("RunnerApprovalService", () => {
  it("createPending 阻塞等待，decide 后 resolve 并移除", async () => {
    const service = new RunnerApprovalService();
    const { item, promise } = service.createPending(request("run_1"));
    expect(service.pending()).toHaveLength(1);

    const decisionPromise = promise.then((decision) => {
      expect(decision).toBe("approved");
      expect(service.pending()).toHaveLength(0);
    });
    const decided = service.decide(item.id, "approved");
    expect(decided?.toolName).toBe("shell_exec");
    await decisionPromise;
  });

  it("拒绝同样 resolve；未知 id 返回 undefined", async () => {
    const service = new RunnerApprovalService();
    const { item, promise } = service.createPending(request("run_2"));
    const decisionPromise = promise.then((decision) => {
      expect(decision).toBe("rejected");
    });
    expect(service.decide(item.id, "rejected")).toBeDefined();
    await decisionPromise;
    expect(service.decide(item.id, "approved")).toBeUndefined();
  });
});
