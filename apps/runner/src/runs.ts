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

const TERMINAL_STATUSES = new Set(["completed", "failed", "cancelled"]);

/** Runner 本地 Runs 服务：内存存储 + 后台执行 + SSE 订阅（与云端 API 同形语义）。 */
export class RunnerRunService {
  readonly #runs = new Map<string, RunnerRunRecord>();
  readonly #subscribers = new Map<string, Set<Subscriber>>();
  readonly #controllers = new Map<string, AbortController>();

  constructor(private readonly registry: AgentRegistry) {}

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

    // 创建即返回，执行在后台推进（AGENTS.md §30）
    const controller = new AbortController();
    this.#controllers.set(record.id, controller);
    // 执行延迟到微任务：create 保持 queued 语义（创建即返回，AGENTS.md §30）
    queueMicrotask(() => {
      void this.#execute(record.id, agent, input.task, controller).catch(() => {});
    });
    return { ...record, events: [...record.events] };
  }

  list(): RunnerRunRecord[] {
    // Map 保持插入序；倒排即为最新在前（同毫秒创建也稳定）
    return [...this.#runs.values()].reverse();
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

    const emit = (event: AgentEvent): void => {
      record.events.push(event);
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
  }
}
