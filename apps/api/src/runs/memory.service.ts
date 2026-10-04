import { Injectable } from "@nestjs/common";
import type { RunStatus } from "@adui-forge/contracts";

export interface MemoryRecord {
  id: string;
  agentName: string;
  task: string;
  status: RunStatus;
  summary: string;
  recordedAt: string;
}

/**
 * Session Memory（REQUIREMENTS.md §69 Context/Memory）：
 * 记录每个 Run 的任务与结果摘要，并注入后续同 Agent 任务的首条系统提示，
 * 让连续任务具备会话连续性。内存实现；随进程生命周期淘汰。
 * 管理能力遵循 AGENTS.md §49：可查看、可删除（单条/清空）、可关闭（停用后
 * 不再记录且不再注入，开关随进程生命周期）。
 */
@Injectable()
export class MemoryService {
  readonly #records: MemoryRecord[] = [];
  #enabled = true;

  get enabled(): boolean {
    return this.#enabled;
  }

  setEnabled(enabled: boolean): void {
    this.#enabled = enabled;
  }

  record(input: { agentName: string; task: string; status: RunStatus; summary: string }): void {
    if (!this.#enabled) return;
    this.#records.unshift({
      ...input,
      id: `mem_${globalThis.crypto.randomUUID()}`,
      recordedAt: new Date().toISOString(),
    });
  }

  /** 注入后续任务的首条系统提示（停用时返回空，调用方无需感知开关）。 */
  recent(agentName: string, limit = 3): MemoryRecord[] {
    if (!this.#enabled) return [];
    return this.#records.filter((record) => record.agentName === agentName).slice(0, limit);
  }

  /** 管理页全量视图（按记录时间倒序）。 */
  list(agentName: string | undefined, limit = 50): MemoryRecord[] {
    if (!this.#enabled) return [];
    const pool =
      agentName === undefined
        ? this.#records
        : this.#records.filter((record) => record.agentName === agentName);
    return pool.slice(0, limit);
  }

  remove(id: string): boolean {
    const index = this.#records.findIndex((record) => record.id === id);
    if (index === -1) {
      return false;
    }
    this.#records.splice(index, 1);
    return true;
  }

  /** 清空（可限定单一 Agent）；返回清除条数。 */
  clear(agentName?: string): number {
    if (agentName === undefined) {
      const count = this.#records.length;
      this.#records.length = 0;
      return count;
    }
    let count = 0;
    for (let index = this.#records.length - 1; index >= 0; index -= 1) {
      if (this.#records[index]?.agentName === agentName) {
        this.#records.splice(index, 1);
        count += 1;
      }
    }
    return count;
  }
}
