import { Inject, Injectable } from "@nestjs/common";
import type { RunStatus } from "@adui-forge/contracts";
import { RunService } from "../runs/run.service";

export const TASK_STORE = Symbol("TASK_STORE");

export interface TaskRecord {
  id: string;
  title: string;
  runId: string;
  status: RunStatus;
  createdAt: string;
}

export interface TaskStore {
  create(task: Omit<TaskRecord, "createdAt">): TaskRecord;
  list(): TaskRecord[];
}

export class InMemoryTaskStore implements TaskStore {
  readonly #tasks: TaskRecord[] = [];

  create(task: Omit<TaskRecord, "createdAt">): TaskRecord {
    const record: TaskRecord = { ...task, createdAt: new Date().toISOString() };
    this.#tasks.unshift(record);
    return record;
  }

  list(): TaskRecord[] {
    return [...this.#tasks];
  }
}

/** 任务 = 面向人的工作单元；创建即派生一个 Run 执行（REQUIREMENTS.md §69 Task）。 */
@Injectable()
export class TaskService {
  constructor(
    @Inject(TASK_STORE) private readonly store: TaskStore,
    private readonly runs: RunService,
  ) {}

  async createTask(input: {
    title: string;
    task: string;
    agentName?: string;
  }): Promise<TaskRecord> {
    const run = await this.runs.createRun({
      agentName: input.agentName ?? "forge-dev",
      task: input.task,
    });
    return this.store.create({
      id: `task_${globalThis.crypto.randomUUID()}`,
      title: input.title,
      runId: run.id,
      status: run.status,
    });
  }

  list(): TaskRecord[] {
    return this.store.list();
  }
}
