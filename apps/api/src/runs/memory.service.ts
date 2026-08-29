import { Injectable } from "@nestjs/common";
import type { RunStatus } from "@adui-forge/contracts";

export interface MemoryRecord {
  agentName: string;
  task: string;
  status: RunStatus;
  summary: string;
  recordedAt: string;
}

/**
 * Session Memory（REQUIREMENTS.md §69 Context/Memory）：
 * 记录每个 Run 的任务与结果摘要，并注入后续同 Agent 任务的首条系统提示，
 * 让连续任务具备会话连续性。内存实现；可查看、随进程生命周期淘汰。
 */
@Injectable()
export class MemoryService {
  readonly #records: MemoryRecord[] = [];

  record(input: { agentName: string; task: string; status: RunStatus; summary: string }): void {
    this.#records.unshift({ ...input, recordedAt: new Date().toISOString() });
  }

  recent(agentName: string, limit = 3): MemoryRecord[] {
    return this.#records.filter((record) => record.agentName === agentName).slice(0, limit);
  }
}
