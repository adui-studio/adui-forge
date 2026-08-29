import { Module } from "@nestjs/common";
import { InMemoryRunStore } from "./in-memory-run.store";
import { RunService } from "./run.service";
import { RUN_STORE } from "./run.tokens";
import { RunsController } from "./runs.controller";
import { AgentsModule } from "../agents/agents.module";

@Module({
  imports: [AgentsModule],
  controllers: [RunsController],
  providers: [{ provide: RUN_STORE, useValue: new InMemoryRunStore() }, RunService],
})
export class RunsModule {}
