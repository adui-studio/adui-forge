import { Module } from "@nestjs/common";
import { RunsModule } from "../runs/runs.module";
import { WorkflowsController } from "./workflows.controller";
import { WorkflowService } from "./workflow.service";
import { WorkflowsRegistry } from "./workflow.registry";
import { WorkflowsRegistryController } from "./workflows.registry.controller";

@Module({
  imports: [RunsModule],
  controllers: [WorkflowsController, WorkflowsRegistryController],
  providers: [WorkflowService, WorkflowsRegistry],
  exports: [WorkflowsRegistry],
})
export class WorkflowsModule {}
