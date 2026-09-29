import { Body, Controller, Delete, Get, Inject, Param, Post } from "@nestjs/common";
import { z } from "zod";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { ComparisonService } from "./comparison.service";
import { comparisonToCsv, comparisonToMarkdown } from "./comparison.export";

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

  @Get("stats/by-model")
  statsByModel() {
    return this.comparisons.statsByModel();
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.comparisons.get(id);
  }

  @Get(":id/export/:format")
  async export(
    @Param("id") id: string,
    @Param("format") format: string,
  ): Promise<{ filename: string; content: string }> {
    const { record, results } = await this.comparisons.get(id);
    if (format !== "csv" && format !== "md") {
      return { filename: "report.txt", content: "unsupported format\n" };
    }
    return {
      filename: `comparison-${id}.${format}`,
      content:
        format === "csv" ? comparisonToCsv(record, results) : comparisonToMarkdown(record, results),
    };
  }

  @Delete(":id")
  async delete(@Param("id") id: string) {
    await this.comparisons.delete(id);
    return { ok: true };
  }
}
