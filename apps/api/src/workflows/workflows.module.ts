import { Module } from "@nestjs/common";
import { RunsModule } from "../runs/runs.module";
import { WorkflowsController } from "./workflows.controller";
import { WorkflowService } from "./workflow.service";

@Module({
  imports: [RunsModule],
  controllers: [WorkflowsController],
  providers: [WorkflowService],
})
export class WorkflowsModule {}
