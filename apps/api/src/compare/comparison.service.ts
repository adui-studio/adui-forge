import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { RunRecord } from "../runs/run.types";
import { RunService } from "../runs/run.service";
import {
  COMPARISON_STORE,
  type ComparisonItem,
  type ComparisonRecord,
  type ComparisonStore,
} from "./comparison.store";

/** 对比列的派生结果：全部来自 Run 记录，不复制数据。 */
export interface ComparisonItemResult extends ComparisonItem {
  status: string;
  text: string;
  tools: string[];
  error?: string;
  durationMs: number | null;
}

const runOutputText = (run: RunRecord): string =>
  run.events
    .filter((event) => event.name === "model.delta")
    .map((event) => {
      const value = (event.payload as { text?: string } | undefined)?.text;
      return typeof value === "string" ? value : "";
    })
    .join("");

const runTools = (run: RunRecord): string[] => {
  const tools: string[] = [];
  for (const event of run.events) {
    if (event.name !== "tool.started") continue;
    const tool = (event.payload as { tool?: string } | undefined)?.tool;
    if (tool !== undefined && tool !== "" && !tools.includes(tool)) tools.push(tool);
  }
  return tools;
};

const deriveItem = (item: ComparisonItem, run: RunRecord | undefined): ComparisonItemResult => ({
  ...item,
  status: run?.status ?? "unknown",
  text: run === undefined ? "" : runOutputText(run),
  tools: run === undefined ? [] : runTools(run),
  error: run?.error,
  durationMs:
    run?.startedAt !== undefined && run?.finishedAt !== undefined
      ? new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime()
      : null,
});

/** 对比批次服务：批次生命周期 + 从 RunStore 派生结果详情。 */
@Injectable()
export class ComparisonService {
  constructor(
    @Inject(COMPARISON_STORE) private readonly store: ComparisonStore,
    private readonly runs: RunService,
  ) {}

  async create(input: { task: string; items: ComparisonItem[] }): Promise<ComparisonRecord> {
    return this.store.create({
      id: `cmp_${globalThis.crypto.randomUUID()}`,
      task: input.task,
      items: input.items,
      createdAt: new Date().toISOString(),
    });
  }

  async list(): Promise<ComparisonRecord[]> {
    return this.store.list();
  }

  async get(id: string): Promise<{ record: ComparisonRecord; results: ComparisonItemResult[] }> {
    const record = await this.store.get(id);
    if (record === null) {
      throw new NotFoundException(`unknown comparison: "${id}"`);
    }
    const results = await Promise.all(
      record.items.map(async (item) => {
        const run = await this.runs.getRun(item.runId).catch(() => undefined);
        return deriveItem(item, run);
      }),
    );
    return { record, results };
  }

  async delete(id: string): Promise<void> {
    const deleted = await this.store.delete(id);
    if (!deleted) {
      throw new NotFoundException(`unknown comparison: "${id}"`);
    }
  }

  /** 跨批次统计：每个 Agent 的参与数、完成/失败、平均耗时与最快胜出次数。 */
  async stats(): Promise<
    Array<{
      agentName: string;
      batches: number;
      completed: number;
      failed: number;
      avgDurationMs: number | null;
      fastestWins: number;
    }>
  > {
    const batches = await this.store.list();
    const acc = new Map<
      string,
      { batches: number; completed: number; failed: number; durations: number[]; wins: number }
    >();
    for (const batch of batches) {
      const { results } = await this.get(batch.id);
      // 最快胜出：该批次中已完成的列里耗时最短者（并列各计一次）
      const completedDurations = results.filter(
        (result) => result.status === "completed" && result.durationMs !== null,
      ) as Array<ComparisonItemResult & { durationMs: number }>;
      const fastest =
        completedDurations.length > 0
          ? Math.min(...completedDurations.map((result) => result.durationMs))
          : null;
      for (const result of results) {
        const entry = acc.get(result.agentName) ?? {
          batches: 0,
          completed: 0,
          failed: 0,
          durations: [],
          wins: 0,
        };
        entry.batches += 1;
        if (result.status === "completed") {
          entry.completed += 1;
          if (result.durationMs !== null) entry.durations.push(result.durationMs);
          if (fastest !== null && result.durationMs === fastest) entry.wins += 1;
        } else if (result.status === "failed") {
          entry.failed += 1;
        }
        acc.set(result.agentName, entry);
      }
    }
    return [...acc.entries()]
      .map(([agentName, entry]) => ({
        agentName,
        batches: entry.batches,
        completed: entry.completed,
        failed: entry.failed,
        avgDurationMs:
          entry.durations.length > 0
            ? Math.round(
                entry.durations.reduce((sum, value) => sum + value, 0) / entry.durations.length,
              )
            : null,
        fastestWins: entry.wins,
      }))
      .sort((a, b) => b.fastestWins - a.fastestWins || a.agentName.localeCompare(b.agentName));
  }
}
