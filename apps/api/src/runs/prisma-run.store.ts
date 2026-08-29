import { PrismaClient, type Prisma } from "@prisma/client";
import type { AgentEvent, RunStatus } from "@adui-forge/contracts";
import type { RunRecord, RunStore } from "./run.types";

interface RunRow {
  id: string;
  agentName: string;
  task: string;
  status: string;
  createdAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
  error: string | null;
  events: unknown;
}

const toRecord = (row: RunRow): RunRecord => {
  return {
    id: row.id,
    agentName: row.agentName,
    task: row.task,
    status: row.status as RunStatus,
    createdAt: row.createdAt.toISOString(),
    startedAt: row.startedAt?.toISOString(),
    finishedAt: row.finishedAt?.toISOString(),
    error: row.error ?? undefined,
    events: (Array.isArray(row.events) ? row.events : []) as AgentEvent[],
  };
};

const toDateOrUndefined = (iso: string | undefined): Date | undefined =>
  iso === undefined ? undefined : new Date(iso);

/** PostgreSQL 持久化实现（Prisma）。需先执行 `prisma migrate deploy` 建表。 */
export class PrismaRunStore implements RunStore {
  readonly #prisma: PrismaClient;

  constructor(prisma: PrismaClient = new PrismaClient()) {
    this.#prisma = prisma;
  }

  async create(input: Pick<RunRecord, "id" | "agentName" | "task">): Promise<RunRecord> {
    const row = await this.#prisma.run.create({
      data: {
        id: input.id,
        agentName: input.agentName,
        task: input.task,
        status: "queued",
        events: [],
      },
    });
    return toRecord(row);
  }

  async get(id: string): Promise<RunRecord | undefined> {
    const row = await this.#prisma.run.findUnique({ where: { id } });
    return row === null ? undefined : toRecord(row);
  }

  async list(): Promise<RunRecord[]> {
    const rows = await this.#prisma.run.findMany({ orderBy: { createdAt: "desc" } });
    return rows.map(toRecord);
  }

  async update(id: string, patch: Partial<Omit<RunRecord, "id">>): Promise<RunRecord | undefined> {
    try {
      const row = await this.#prisma.run.update({
        where: { id },
        data: {
          status: patch.status,
          startedAt: toDateOrUndefined(patch.startedAt),
          finishedAt: toDateOrUndefined(patch.finishedAt),
          error: patch.error,
          events:
            patch.events === undefined
              ? undefined
              : (JSON.parse(JSON.stringify(patch.events)) as Prisma.InputJsonValue),
        },
      });
      return toRecord(row);
    } catch (error) {
      // P2025 = 记录不存在；与 InMemoryRunStore 的 undefined 语义对齐
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code: string }).code === "P2025"
      ) {
        return undefined;
      }
      throw error;
    }
  }
}
