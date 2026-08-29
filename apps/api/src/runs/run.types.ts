import type { AgentEvent, RunStatus } from "@adui-forge/contracts";

/** 一次 Agent Run 的持久化记录（REQUIREMENTS.md §50）。 */
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

/** 运行存储接口：让 RunService 与具体存储（内存 / Prisma）解耦。全部异步。 */
export interface RunStore {
  create(input: Pick<RunRecord, "id" | "agentName" | "task">): Promise<RunRecord>;
  get(id: string): Promise<RunRecord | undefined>;
  list(): Promise<RunRecord[]>;
  update(id: string, patch: Partial<Omit<RunRecord, "id">>): Promise<RunRecord | undefined>;
}
