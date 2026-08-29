import { Body, Controller, Get, Inject, Param, Post } from "@nestjs/common";
import { z } from "zod";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { WorkflowService } from "./workflow.service";
import { WorkflowsRegistry } from "./workflow.registry";

export const registerWorkflowSchema = z.object({
  name: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).default(""),
  tasks: z.array(z.string().min(1).max(10_000)).min(1).max(10),
});

@Controller("workflows")
export class WorkflowsRegistryController {
  constructor(
    @Inject(WorkflowsRegistry) private readonly registry: WorkflowsRegistry,
    @Inject(WorkflowService) private readonly workflows: WorkflowService,
  ) {}

  @Get()
  list() {
    return this.registry.list();
  }

  @Post()
  register(
    @Body(new ZodValidationPipe(registerWorkflowSchema)) input: {
      name: string;
      description: string;
      tasks: string[];
    },
  ) {
    this.registry.register(input);
    return { ok: true, name: input.name };
  }

  @Post(":name/runs")
  async run(@Param("name") name: string) {
    const definition = this.registry.get(name);
    return this.workflows.createWorkflowRun({ tasks: definition.tasks });
  }
}
