import type { RunRecord, RunStore } from "./run.types";

const nowIso = (): string => new Date().toISOString();

interface Entry {
  seq: number;
  record: RunRecord;
}

const cloneRecord = (record: RunRecord): RunRecord => ({
  ...record,
  events: record.events.map((event) => ({ ...event })),
});

/**
 * 进程内 RunStore：MVP-5 的最小实现，重启即失联数据，生产实现见 MVP-6（Prisma）。
 * 所有读路径返回快照：外部拿到的是创建/查询时刻的状态，不随后台执行可变对象漂移。
 */
export class InMemoryRunStore implements RunStore {
  readonly #entries = new Map<string, Entry>();
  #seq = 0;

  create(input: Pick<RunRecord, "id" | "agentName" | "task">): RunRecord {
    if (this.#entries.has(input.id)) {
      throw new Error(`run already exists: "${input.id}"`);
    }
    const record: RunRecord = {
      ...input,
      status: "queued",
      createdAt: nowIso(),
      events: [],
    };
    this.#entries.set(record.id, { seq: (this.#seq += 1), record });
    return cloneRecord(record);
  }

  get(id: string): RunRecord | undefined {
    const entry = this.#entries.get(id);
    return entry === undefined ? undefined : cloneRecord(entry.record);
  }

  list(): RunRecord[] {
    return [...this.#entries.values()]
      .sort((a, b) => b.seq - a.seq)
      .map((entry) => cloneRecord(entry.record));
  }

  update(id: string, patch: Partial<Omit<RunRecord, "id">>): RunRecord | undefined {
    const entry = this.#entries.get(id);
    if (entry === undefined) {
      return undefined;
    }
    Object.assign(entry.record, patch);
    return cloneRecord(entry.record);
  }
}
