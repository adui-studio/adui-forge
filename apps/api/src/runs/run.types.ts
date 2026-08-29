import type { AgentEvent, RunStatus } from "@adui-forge/contracts";

/** 一次 Agent Run 的持久化记录（MVP-5 为内存实现，MVP-6 迁移 Prisma/PostgreSQL）。 */
export interface RunRecord {
  id: string;
  agentName: string;
  task: string;
  status: RunStatus;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  error?: string;
  events: AgentEvent[];
}

/** 运行存储接口：让 RunService 与具体存储（内存 / Prisma）解耦。 */
export interface RunStore {
  create(input: Pick<RunRecord, "id" | "agentName" | "task">): RunRecord;
  get(id: string): RunRecord | undefined;
  list(): RunRecord[];
  update(id: string, patch: Partial<Omit<RunRecord, "id">>): RunRecord | undefined;
}
