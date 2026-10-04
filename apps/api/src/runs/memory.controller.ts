import { Body, Controller, Delete, Get, Inject, Param, Post, Query } from "@nestjs/common";
import { z } from "zod";
import { MemoryService } from "./memory.service";
import { ZodValidationPipe } from "../common/zod-validation.pipe";

@Controller("memory")
export class MemoryController {
  constructor(@Inject(MemoryService) private readonly memory: MemoryService) {}

  @Get()
  recent(@Query("agent") agent: string = "forge-dev") {
    return this.memory.recent(agent, 10);
  }

  /** 管理视图：全量记录（可选按 Agent 过滤）。 */
  @Get("records")
  records(@Query("agent") agent: string | undefined) {
    return this.memory.list(agent === "" ? undefined : agent);
  }

  @Get("enabled")
  enabled() {
    return { enabled: this.memory.enabled };
  }

  @Post("enabled")
  setEnabled(
    @Body(new ZodValidationPipe(z.object({ enabled: z.boolean() }))) input: { enabled: boolean },
  ) {
    this.memory.setEnabled(input.enabled);
    return { enabled: input.enabled };
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    const removed = this.memory.remove(id);
    if (!removed) {
      return null;
    }
    return { ok: true };
  }

  @Post("clear")
  clear(
    @Body(new ZodValidationPipe(z.object({ agent: z.string().optional() })))
    input: { agent?: string },
  ) {
    return { removed: this.memory.clear(input.agent) };
  }
}
