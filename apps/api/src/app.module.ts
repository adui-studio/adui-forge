import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { HealthController } from "./health/health.controller";
import { AgentsModule } from "./agents/agents.module";
import { RunsModule } from "./runs/runs.module";
import { ApprovalsModule } from "./approvals/approvals.module";
import { WorkflowsModule } from "./workflows/workflows.module";
import { AuthModule } from "./auth/auth.module";
import { TasksModule } from "./tasks/tasks.module";
import { MetricsModule } from "./metrics/metrics.module";
import { OpenapiModule } from "./openapi/openapi.module";
import { RateLimitGuard } from "./common/rate-limit.guard";
import { AuthGuard } from "./auth/auth.guard";

@Module({
  imports: [
    AgentsModule,
    ApprovalsModule,
    RunsModule,
    WorkflowsModule,
    AuthModule,
    TasksModule,
    MetricsModule,
    OpenapiModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: RateLimitGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
  controllers: [HealthController],
})
export class AppModule {}
