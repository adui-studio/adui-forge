import { PrismaClient } from "@prisma/client";
import type { TaskRecord, TaskStore } from "./task.service";

/** PostgreSQL 任务存储（Prisma）。需先 `prisma migrate deploy`。 */
export class PrismaTaskStore implements TaskStore {
  readonly #prisma: PrismaClient;

  constructor(prisma: PrismaClient = new PrismaClient()) {
    this.#prisma = prisma;
  }

  async create(task: Omit<TaskRecord, "createdAt">): Promise<TaskRecord> {
    const row = await this.#prisma.task.create({ data: { ...task } });
    return {
      id: row.id,
      title: row.title,
      runId: row.runId,
      status: row.status as TaskRecord["status"],
      createdAt: row.createdAt.toISOString(),
    };
  }

  async list(): Promise<TaskRecord[]> {
    const rows = await this.#prisma.task.findMany({ orderBy: { createdAt: "desc" } });
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      runId: row.runId,
      status: row.status as TaskRecord["status"],
      createdAt: row.createdAt.toISOString(),
    }));
  }
}
