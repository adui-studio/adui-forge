import { Controller, Get, Inject, Param } from "@nestjs/common";
import { ArtifactService } from "./artifact.service";

@Controller("runs")
export class ArtifactsController {
  constructor(@Inject(ArtifactService) private readonly artifacts: ArtifactService) {}

  @Get(":id/artifacts")
  listByRun(@Param("id") runId: string) {
    return this.artifacts.listByRun(runId);
  }
}
