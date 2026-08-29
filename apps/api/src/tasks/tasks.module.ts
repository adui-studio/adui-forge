import { Module } from "@nestjs/common";
import { InMemoryTaskStore, TASK_STORE, TaskService } from "./task.service";
import { TasksController } from "./tasks.controller";

@Module({
  controllers: [TasksController],
  providers: [{ provide: TASK_STORE, useValue: new InMemoryTaskStore() }, TaskService],
})
export class TasksModule {}
