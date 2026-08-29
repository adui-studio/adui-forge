import { Module } from "@nestjs/common";
import { HealthController } from "./health/health.controller";
import { AgentsModule } from "./agents/agents.module";
import { RunsModule } from "./runs/runs.module";

@Module({
  imports: [AgentsModule, RunsModule],
  controllers: [HealthController],
})
export class AppModule {}
