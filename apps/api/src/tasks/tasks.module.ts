import { Module } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { InMemoryTaskStore, TASK_STORE, TaskService } from "./task.service";
import { PrismaTaskStore } from "./prisma-task.store";
import { TasksController } from "./tasks.controller";

/**
 * 配置了 DATABASE_URL 时使用 PostgreSQL 持久化（Prisma，需先 migrate deploy），
 * 否则退回进程内存实现——显式降级，不静默。
 */
@Module({
  controllers: [TasksController],
  providers: [
    {
      provide: TASK_STORE,
      useFactory: () =>
        process.env.DATABASE_URL !== undefined && process.env.DATABASE_URL !== ""
          ? new PrismaTaskStore(new PrismaClient())
          : new InMemoryTaskStore(),
    },
    TaskService,
  ],
})
export class TasksModule {}
