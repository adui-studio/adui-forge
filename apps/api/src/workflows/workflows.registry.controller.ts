import { Body, Controller, Get, Inject, Param, Post } from "@nestjs/common";
import { z } from "zod";
import { validateWorkflowGraph, workflowGraphSchema } from "@adui-forge/workflow";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { WorkflowService } from "./workflow.service";
import { graphTasks, WorkflowsRegistry, type WorkflowDefinitionRecord } from "./workflow.registry";

/** tasks（线性）与 graph（含条件分支）二选一。 */
export const registerWorkflowSchema = z
  .object({
    name: z
      .string()
      .min(1)
      .regex(/^[a-z0-9-]+$/),
    description: z.string().max(500).default(""),
    tasks: z.array(z.string().min(1).max(10_000)).min(1).max(10).optional(),
    graph: workflowGraphSchema.optional(),
  })
  .superRefine((input, context) => {
    if ((input.tasks === undefined) === (input.graph === undefined)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "tasks 与 graph 必须二选一",
      });
    }
    if (input.graph !== undefined) {
      try {
        validateWorkflowGraph(input.graph);
      } catch (error) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: error instanceof Error ? error.message : "Workflow 图定义不合法",
        });
      }
    }
  });

export type RegisterWorkflowInput = z.infer<typeof registerWorkflowSchema>;

@Controller("workflows")
export class WorkflowsRegistryController {
  constructor(
    @Inject(WorkflowsRegistry) private readonly registry: WorkflowsRegistry,
    @Inject(WorkflowService) private readonly workflows: WorkflowService,
  ) {}

  @Get()
  async list() {
    return this.registry.list();
  }

  @Post()
  register(@Body(new ZodValidationPipe(registerWorkflowSchema)) input: RegisterWorkflowInput) {
    const record: WorkflowDefinitionRecord = {
      name: input.name,
      description: input.description,
      tasks: input.graph !== undefined ? graphTasks(input.graph) : (input.tasks ?? []),
      graph: input.graph,
    };
    this.registry.register(record);
    return { ok: true, name: record.name };
  }

  @Post(":name/runs")
  async run(@Param("name") name: string) {
    // 注册表实现可能为同步（内存）或异步（Prisma），统一收敛为 Promise
    const definition = await Promise.resolve(this.registry.get(name));
    if (definition.graph !== undefined) {
      return this.workflows.createWorkflowRunFromGraph(definition.graph);
    }
    return this.workflows.createWorkflowRun({ tasks: definition.tasks });
  }
}
