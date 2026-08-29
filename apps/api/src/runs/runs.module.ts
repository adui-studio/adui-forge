import { Module } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { AgentRegistry } from "@adui-forge/agent";
import { InMemoryRunStore } from "./in-memory-run.store";
import { PrismaRunStore } from "./prisma-run.store";
import { RunService } from "./run.service";
import { RUN_STORE } from "./run.tokens";
import type { RunStore } from "./run.types";
import { RunsController } from "./runs.controller";
import { ArtifactService } from "./artifact.service";
import { ArtifactsController } from "./artifacts.controller";
import { MemoryController } from "./memory.controller";
import { MemoryService } from "./memory.service";
import { AgentsModule } from "../agents/agents.module";
import { ApprovalsModule } from "../approvals/approvals.module";

/**
 * 配置了 DATABASE_URL 时使用 PostgreSQL 持久化（Prisma，需先 migrate deploy），
 * 否则退回进程内存实现——显式降级，不静默。
 */
@Module({
  imports: [AgentsModule, ApprovalsModule],
  controllers: [RunsController, ArtifactsController, MemoryController],
  exports: [RunService],
  providers: [
    ArtifactService,
    MemoryService,
    {
      provide: RUN_STORE,
      useFactory: () => {
        if (process.env.DATABASE_URL !== undefined && process.env.DATABASE_URL !== "") {
          return new PrismaRunStore(new PrismaClient());
        }
        return new InMemoryRunStore();
      },
    },
    {
      provide: RunService,
      useFactory: (
        store: RunStore,
        registry: AgentRegistry,
        artifacts: ArtifactService,
        memory: MemoryService,
      ) => {
        const service = new RunService(store, registry);
        service.setArtifactRegistrar((input) => artifacts.register(input));
        service.setMemory(memory);
        return service;
      },
      inject: [RUN_STORE, AgentRegistry, ArtifactService, MemoryService],
    },
  ],
})
export class RunsModule {}
