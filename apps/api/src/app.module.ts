import { Module } from "@nestjs/common";
import { HealthController } from "./health/health.controller";
import { AgentsModule } from "./agents/agents.module";
import { RunsModule } from "./runs/runs.module";
import { ApprovalsModule } from "./approvals/approvals.module";
import { WorkflowsModule } from "./workflows/workflows.module";

@Module({
  imports: [AgentsModule, ApprovalsModule, RunsModule, WorkflowsModule],
  controllers: [HealthController],
})
export class AppModule {}
