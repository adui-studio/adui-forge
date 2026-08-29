import { describe, expect, it } from "vite-plus/test";
import { APPROVAL_SERVICE, ApprovalService } from "../src/approvals/approval.service";
import { MemoryService } from "../src/runs/memory.service";
import { MetricsController } from "../src/metrics/metrics.controller";
import { RunService } from "../src/runs/run.service";

describe("MetricsController", () => {
  it("aggregates run / approval / memory counters", async () => {
    const approvals = new ApprovalService();
    const memory = new MemoryService();
    const runs = {
      listRuns: async () => [
        { status: "completed" },
        { status: "completed" },
        { status: "failed" },
      ],
    } as never;
    approvals.createPending({
      runId: "run_x",
      toolName: "shell_exec",
      input: {},
      reason: "test",
    });
    const controller = new MetricsController(runs, approvals, memory);
    const metrics = await controller.metrics();
    expect(metrics.runs.total).toBe(3);
    expect(metrics.runs.byStatus.completed).toBe(2);
    expect(metrics.approvals.pending).toBe(1);
  });
});
