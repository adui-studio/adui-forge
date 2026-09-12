import { PrismaClient } from "../../generated/prisma-client";

export const COMPARISON_STORE = Symbol("COMPARISON_STORE");

export interface ComparisonItem {
  agentName: string;
  runId: string;
}

export interface ComparisonRecord {
  id: string;
  task: string;
  items: ComparisonItem[];
  createdAt: string;
}

export interface ComparisonStore {
  create(record: ComparisonRecord): Promise<ComparisonRecord>;
  get(id: string): Promise<ComparisonRecord | null>;
  list(): Promise<ComparisonRecord[]>;
  delete(id: string): Promise<boolean>;
}

export class InMemoryComparisonStore implements ComparisonStore {
  readonly #comparisons = new Map<string, ComparisonRecord>();

  async create(record: ComparisonRecord): Promise<ComparisonRecord> {
    this.#comparisons.set(record.id, record);
    return record;
  }

  async get(id: string): Promise<ComparisonRecord | null> {
    return this.#comparisons.get(id) ?? null;
  }

  async list(): Promise<ComparisonRecord[]> {
    return [...this.#comparisons.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async delete(id: string): Promise<boolean> {
    return this.#comparisons.delete(id);
  }
}

/** PostgreSQL 对比批次存储（Prisma）。需先 `prisma migrate deploy`。 */
export class PrismaComparisonStore implements ComparisonStore {
  readonly #prisma: PrismaClient;

  constructor(prisma: PrismaClient = new PrismaClient()) {
    this.#prisma = prisma;
  }

  #toRecord(row: { id: string; task: string; items: unknown; createdAt: Date }): ComparisonRecord {
    return {
      id: row.id,
      task: row.task,
      items: Array.isArray(row.items) ? (row.items as ComparisonItem[]) : [],
      createdAt: row.createdAt.toISOString(),
    };
  }

  async create(record: ComparisonRecord): Promise<ComparisonRecord> {
    const row = await this.#prisma.comparison.create({
      data: {
        id: record.id,
        task: record.task,
        items: JSON.parse(JSON.stringify(record.items)),
      },
    });
    return this.#toRecord(row);
  }

  async get(id: string): Promise<ComparisonRecord | null> {
    const row = await this.#prisma.comparison.findUnique({ where: { id } });
    return row === null ? null : this.#toRecord(row);
  }

  async list(): Promise<ComparisonRecord[]> {
    const rows = await this.#prisma.comparison.findMany({ orderBy: { createdAt: "desc" } });
    return rows.map((row) => this.#toRecord(row));
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.#prisma.comparison.deleteMany({ where: { id } });
    return result.count > 0;
  }
}
