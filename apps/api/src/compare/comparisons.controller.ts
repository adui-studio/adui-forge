import { Body, Controller, Delete, Get, Inject, Param, Post } from "@nestjs/common";
import { z } from "zod";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { ComparisonService } from "./comparison.service";

export const createComparisonSchema = z.object({
  task: z.string().min(1).max(10_000),
  items: z
    .array(
      z.object({
        agentName: z.string().min(1),
        runId: z.string().min(1),
      }),
    )
    .min(2)
    .max(4),
});

@Controller("comparisons")
export class ComparisonsController {
  constructor(@Inject(ComparisonService) private readonly comparisons: ComparisonService) {}

  @Post()
  create(
    @Body(new ZodValidationPipe(createComparisonSchema))
    input: { task: string; items: Array<{ agentName: string; runId: string }> },
  ) {
    return this.comparisons.create(input);
  }

  @Get()
  list() {
    return this.comparisons.list();
  }

  @Get("stats")
  stats() {
    return this.comparisons.stats();
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.comparisons.get(id);
  }

  @Delete(":id")
  async delete(@Param("id") id: string) {
    await this.comparisons.delete(id);
    return { ok: true };
  }
}
