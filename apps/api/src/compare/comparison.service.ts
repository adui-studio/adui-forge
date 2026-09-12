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
}
