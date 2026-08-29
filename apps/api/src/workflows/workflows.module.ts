import { Module } from "@nestjs/common";
import { RunsModule } from "../runs/runs.module";
import { WorkflowsController } from "./workflows.controller";
import { WorkflowService } from "./workflow.service";
import { WorkflowsRegistry } from "./workflow.registry";
import { PrismaWorkflowsRegistry } from "./prisma-workflow.registry";
import { PrismaClient } from "@prisma/client";
import { WorkflowsRegistryController } from "./workflows.registry.controller";

@Module({
  imports: [RunsModule],
  controllers: [WorkflowsController, WorkflowsRegistryController],
  providers: [
    WorkflowService,
    {
      provide: WorkflowsRegistry,
      useFactory: () =>
        process.env.DATABASE_URL !== undefined && process.env.DATABASE_URL !== ""
          ? new PrismaWorkflowsRegistry(new PrismaClient())
          : new WorkflowsRegistry(),
    },
  ],
  exports: [WorkflowsRegistry],
})
export class WorkflowsModule {}
