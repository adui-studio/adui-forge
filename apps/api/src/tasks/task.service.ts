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
  create(task: Omit<TaskRecord, "createdAt">): Promise<TaskRecord>;
  list(): Promise<TaskRecord[]>;
}

export class InMemoryTaskStore implements TaskStore {
  readonly #tasks: TaskRecord[] = [];

  async create(task: Omit<TaskRecord, "createdAt">): Promise<TaskRecord> {
    const record: TaskRecord = { ...task, createdAt: new Date().toISOString() };
    this.#tasks.unshift(record);
    return record;
  }

  async list(): Promise<TaskRecord[]> {
    return [...this.#tasks];
  }
}

/** 任务 = 面向人的工作单元；创建即派生一个 Run 执行（REQUIREMENTS.md §69 Task）。 */
@Injectable()
export class TaskService {
  constructor(
    @Inject(TASK_STORE) private readonly store: TaskStore,
    @Inject(RunService) private readonly runs: RunService,
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

  async list(): Promise<TaskRecord[]> {
    const records = await this.store.list();
    // 台账里的 status 是创建时快照；列表展示时回填派生 Run 的实时状态
    return Promise.all(
      records.map(async (task) => {
        try {
          const run = await this.runs.getRun(task.runId);
          return run.status === task.status ? task : { ...task, status: run.status };
        } catch {
          // Run 记录不可达（被清理等）时保留台账快照
          return task;
        }
      }),
    );
  }
}
