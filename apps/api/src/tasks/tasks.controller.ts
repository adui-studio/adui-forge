import { Body, Controller, Get, Inject, Post } from "@nestjs/common";
import { z } from "zod";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { RunService } from "../runs/run.service";
import { TaskService, TASK_STORE } from "./task.service";

export const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  task: z.string().min(1).max(10_000),
  agentName: z.string().min(1).optional(),
});

@Controller("tasks")
export class TasksController {
  constructor(
    @Inject(TASK_STORE) private readonly store: { list(): unknown[] },
    @Inject(TaskService) private readonly tasks: TaskService,
    @Inject(RunService) private readonly runs: RunService,
  ) {}

  @Post()
  create(
    @Body(new ZodValidationPipe(createTaskSchema)) input: {
      title: string;
      task: string;
      agentName?: string;
    },
  ) {
    return this.tasks.createTask(input);
  }

  @Get()
  list() {
    return this.store.list();
  }
}
