import { Module } from "@nestjs/common";
import { ApprovalsModule } from "../approvals/approvals.module";
import { RunsModule } from "../runs/runs.module";
import { MetricsController } from "./metrics.controller";

@Module({
  imports: [RunsModule, ApprovalsModule],
  controllers: [MetricsController],
})
export class MetricsModule {}
