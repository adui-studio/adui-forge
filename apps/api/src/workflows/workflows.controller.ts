import { Body, Controller, Inject, Post } from "@nestjs/common";
import { z } from "zod";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { WorkflowService } from "./workflow.service";

export const createWorkflowRunSchema = z.object({
  tasks: z.array(z.string().min(1).max(10_000)).min(1).max(10),
});

@Controller("workflows")
export class WorkflowsController {
  constructor(@Inject(WorkflowService) private readonly workflows: WorkflowService) {}

  @Post("runs")
  create(@Body(new ZodValidationPipe(createWorkflowRunSchema)) input: { tasks: string[] }) {
    return this.workflows.createWorkflowRun(input);
  }
}
