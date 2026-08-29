import { Controller, Get, Inject } from "@nestjs/common";
import { APPROVAL_SERVICE, ApprovalService } from "../approvals/approval.service";
import { MemoryService } from "../runs/memory.service";
import { RunService } from "../runs/run.service";

@Controller("metrics")
export class MetricsController {
  constructor(
    @Inject(RunService) private readonly runs: RunService,
    @Inject(APPROVAL_SERVICE) private readonly approvals: ApprovalService,
    @Inject(MemoryService) private readonly memory: MemoryService,
  ) {}

  /** 轻量运行指标（JSON）；OpenTelemetry 接入前的可观测基线（REQUIREMENTS §62）。 */
  @Get()
  async metrics() {
    const runs = await this.runs.listRuns();
    const byStatus: Record<string, number> = {};
    for (const run of runs) {
      byStatus[run.status] = (byStatus[run.status] ?? 0) + 1;
    }
    return {
      runs: { total: runs.length, byStatus },
      approvals: { pending: this.approvals.list().length },
      memory: { records: this.memory.recent("forge-dev", Number.MAX_SAFE_INTEGER).length },
    };
  }
}
