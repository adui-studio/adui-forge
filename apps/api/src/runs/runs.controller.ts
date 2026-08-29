import { Body, Controller, Get, Inject, Param, Post, Sse } from "@nestjs/common";
import type { MessageEvent } from "@nestjs/common";
import type { Observable } from "rxjs";
import { z } from "zod";
import { DEFAULT_AGENT_NAME } from "../agents/agent.factory";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { RunService } from "./run.service";

export const createRunSchema = z.object({
  agentName: z.string().min(1).default(DEFAULT_AGENT_NAME),
  task: z.string().min(1).max(10_000),
});

export type CreateRunDto = z.infer<typeof createRunSchema>;

@Controller("runs")
export class RunsController {
  constructor(@Inject(RunService) private readonly runs: RunService) {}

  @Post()
  create(@Body(new ZodValidationPipe(createRunSchema)) input: CreateRunDto) {
    return this.runs.createRun(input);
  }

  @Get()
  list() {
    return this.runs.listRuns();
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.runs.getRun(id);
  }

  @Post(":id/retry")
  retry(@Param("id") id: string) {
    return this.runs.retryRun(id);
  }

  /** SSE 事件流：快照补发 + 实时推送，domain.action 事件以 JSON 编码在 data 中。 */
  @Sse(":id/events")
  events(@Param("id") id: string): Observable<MessageEvent> {
    return this.runs.streamEvents(id);
  }
}
