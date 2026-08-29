import { Module } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { InMemoryRunStore } from "./in-memory-run.store";
import { PrismaRunStore } from "./prisma-run.store";
import { RunService } from "./run.service";
import { RUN_STORE } from "./run.tokens";
import { RunsController } from "./runs.controller";
import { AgentsModule } from "../agents/agents.module";
import { ApprovalsModule } from "../approvals/approvals.module";

/**
 * 配置了 DATABASE_URL 时使用 PostgreSQL 持久化（Prisma，需先 migrate deploy），
 * 否则退回进程内存实现——显式降级，不静默。
 */
@Module({
  imports: [AgentsModule, ApprovalsModule],
  controllers: [RunsController],
  providers: [
    {
      provide: RUN_STORE,
      useFactory: () => {
        if (process.env.DATABASE_URL !== undefined && process.env.DATABASE_URL !== "") {
          return new PrismaRunStore(new PrismaClient());
        }
        return new InMemoryRunStore();
      },
    },
    RunService,
  ],
})
export class RunsModule {}
