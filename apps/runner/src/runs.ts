import type { Agent, AgentRegistry } from "@adui-forge/agent";
import type { AgentEvent } from "@adui-forge/contracts";

export interface RunnerRunRecord {
  id: string;
  agentName: string;
  task: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  error?: string;
  events: AgentEvent[];
}

type Subscriber = (event: AgentEvent) => void;

/** 列表视图条目：不含事件流（与云端 listRuns 同形；详情经 GET /runs/:id）。 */
export type RunnerRunListItem = Omit<RunnerRunRecord, "events">;

const TERMINAL_STATUSES = new Set(["completed", "failed", "cancelled"]);

/**
 * 运行持久化契约（ADR-010）：每次变更整行落库，Runner 重启时恢复。
 * SQLite 实现仅在 Bun sidecar 下启用（bun:sqlite）；Node/tsx 开发态回退内存。
 */
export interface RunnerRunPersistence {
  upsert(record: RunnerRunRecord): void;
  /** 按 createdAt 倒序返回全部持久化 Run（含 events）。 */
  loadAll(): RunnerRunRecord[];
  close?(): void;
}

/** 非终态 Run 在重启后的收敛语义：执行进程已死，显式置败而非永久悬挂。 */
const RESTART_ERROR = "runner restarted before completion";

/** Runner 本地 Runs 服务：内存工作集 + 可选持久化 + 后台执行 + SSE 订阅。 */
export class RunnerRunService {
  readonly #runs = new Map<string, RunnerRunRecord>();
  readonly #subscribers = new Map<string, Set<Subscriber>>();
  readonly #controllers = new Map<string, AbortController>();
  readonly #persistence?: RunnerRunPersistence;

  constructor(
    private readonly registry: AgentRegistry,
    persistence?: RunnerRunPersistence,
  ) {
    this.#persistence = persistence;
    if (persistence === undefined) return;
    // 恢复历史（loadAll 倒序，倒插使 Map 保持"旧→新"插入序）；
    // 非终态 Run 的执行进程已随上次退出消失，显式收敛为 failed。
    for (const record of [...persistence.loadAll()].reverse()) {
      if (!TERMINAL_STATUSES.has(record.status)) {
        record.status = "failed";
        record.finishedAt = record.finishedAt ?? new Date().toISOString();
        record.error = record.error ?? RESTART_ERROR;
        persistence.upsert(record);
      }
      this.#runs.set(record.id, record);
    }
  }

  #persist(record: RunnerRunRecord): void {
    this.#persistence?.upsert(record);
  }

  create(input: { task: string; agentName?: string }): RunnerRunRecord {
    const agent: Agent | undefined = this.registry.get(input.agentName ?? "forge-local");
    if (agent === undefined) {
      throw new Error(`unknown agent: "${input.agentName ?? "forge-local"}"`);
    }
    const record: RunnerRunRecord = {
      id: `run_${globalThis.crypto.randomUUID()}`,
      agentName: agent.name,
      task: input.task,
      status: "queued",
      createdAt: new Date().toISOString(),
      events: [],
    };
    this.#runs.set(record.id, record);
    this.#subscribers.set(record.id, new Set());
    this.#persist(record);

    // 创建即返回，执行在后台推进（AGENTS.md §30）
    const controller = new AbortController();
    this.#controllers.set(record.id, controller);
    // 执行延迟到微任务：create 保持 queued 语义（创建即返回，AGENTS.md §30）
    queueMicrotask(() => {
      void this.#execute(record.id, agent, input.task, controller).catch(() => {});
    });
    return { ...record, events: [...record.events] };
  }

  list(): RunnerRunListItem[] {
    // Map 保持插入序；倒排即为最新在前（同毫秒创建也稳定）
    // 列表视图不含事件流——响应体积大头，仅 GET /runs/:id 携带
    return [...this.#runs.values()].reverse().map(({ events: _events, ...item }) => item);
  }

  get(id: string): RunnerRunRecord | undefined {
    return this.#runs.get(id);
  }

  cancel(id: string): RunnerRunRecord | undefined {
    const record = this.#runs.get(id);
    if (record === undefined) return undefined;
    if (!TERMINAL_STATUSES.has(record.status)) {
      this.#controllers.get(id)?.abort();
    }
    return this.#runs.get(id);
  }

  /** SSE 订阅：先补发快照，再实时推送；返回退订函数。 */
  subscribe(id: string, subscriber: Subscriber): (() => void) | undefined {
    const record = this.#runs.get(id);
    if (record === undefined) return undefined;
    const set = this.#subscribers.get(id) ?? new Set<Subscriber>();
    set.add(subscriber);
    this.#subscribers.set(id, set);
    for (const event of record.events) subscriber(event);
    if (TERMINAL_STATUSES.has(record.status)) {
      set.delete(subscriber);
    }
    return () => {
      this.#subscribers.get(id)?.delete(subscriber);
    };
  }

  async #execute(
    runId: string,
    agent: Agent,
    task: string,
    controller: AbortController,
  ): Promise<void> {
    const record = this.#runs.get(runId);
    if (record === undefined) return;
    record.status = "running";
    record.startedAt = new Date().toISOString();
    this.#persist(record);

    const emit = (event: AgentEvent): void => {
      record.events.push(event);
      this.#persist(record);
      for (const subscriber of this.#subscribers.get(runId) ?? []) subscriber(event);
    };

    const result = await agent.run(task, {
      runId,
      signal: controller.signal,
      onEvent: emit,
    });

    record.status =
      result.status === "completed"
        ? "completed"
        : result.status === "aborted"
          ? "cancelled"
          : "failed";
    record.finishedAt = new Date().toISOString();
    record.error = result.error;
    this.#controllers.delete(runId);
    this.#persist(record);
  }
}
