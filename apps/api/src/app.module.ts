import { Module } from "@nestjs/common";
import { HealthController } from "./health/health.controller";
import { AgentsModule } from "./agents/agents.module";
import { RunsModule } from "./runs/runs.module";
import { ApprovalsModule } from "./approvals/approvals.module";
import { WorkflowsModule } from "./workflows/workflows.module";
import { AuthModule } from "./auth/auth.module";
import { TasksModule } from "./tasks/tasks.module";
import { MetricsModule } from "./metrics/metrics.module";
import { AuthGuard } from "./auth/auth.guard";
import { APP_GUARD } from "@nestjs/core";

@Module({
  imports: [
    AgentsModule,
    ApprovalsModule,
    RunsModule,
    WorkflowsModule,
    AuthModule,
    TasksModule,
    MetricsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: AuthGuard }],
  controllers: [HealthController],
})
export class AppModule {}
