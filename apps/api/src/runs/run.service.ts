import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import type { MessageEvent } from "@nestjs/common";
import { Observable } from "rxjs";
import type { AgentEvent, RunStatus } from "@adui-forge/contracts";
import { AgentRegistry, type Agent } from "@adui-forge/agent";
import type { RunRecord, RunStore } from "./run.types";
import { RUN_STORE } from "./run.tokens";

const TERMINAL_STATUSES: ReadonlySet<RunStatus> = new Set<RunStatus>([
  "completed",
  "failed",
  "cancelled",
  "timeout",
]);

const TERMINAL_EVENTS: ReadonlySet<string> = new Set<string>([
  "run.completed",
  "run.failed",
  "run.cancelled",
]);

const toRunStatus = (result: string): RunStatus => {
  switch (result) {
    case "completed":
      return "completed";
    case "aborted":
      return "cancelled";
    case "waiting_approval":
      return "waiting_approval";
    default:
      // max_steps_reached / token_limit_reached / failed 都视为失败收场
      return "failed";
  }
};

export interface CreateRunInput {
  agentName: string;
  task: string;
}

/** Run 领域服务：创建、执行与查询。存储与 Agent 解析均通过注入，不在本层写死。 */
@Injectable()
export class RunService {
  private readonly logger = new Logger(RunService.name);
  readonly #subscribers = new Map<string, Set<(event: AgentEvent) => void>>();

  constructor(
    @Inject(RUN_STORE) private readonly store: RunStore,
    @Inject(AgentRegistry) private readonly agents: AgentRegistry,
  ) {}

  private memory?: {
    record(input: { agentName: string; task: string; status: RunStatus; summary: string }): void;
    recent(
      agentName: string,
      limit?: number,
    ): Array<{ task: string; status: string; summary: string }>;
  };
  private artifactRegistrar?: (input: {
    runId: string;
    name: string;
    type: string;
    content: string;
  }) => void;

  setMemory(memory: NonNullable<RunService["memory"]>): void {
    this.memory = memory;
  }

  setArtifactRegistrar(
    fn: (input: { runId: string; name: string; type: string; content: string }) => void,
  ): void {
    this.artifactRegistrar = fn;
  }

  /** 供 WorkflowService 等复用的事件推送通道。 */
  emitEvent = (runId: string, event: AgentEvent): void => {
    this.#emit(runId, event);
  };

  /** 订阅某个 Run 的实时事件（SSE 用）；返回取消订阅函数。 */
  subscribe(runId: string, listener: (event: AgentEvent) => void): () => void {
    let listeners = this.#subscribers.get(runId);
    if (listeners === undefined) {
      listeners = new Set();
      this.#subscribers.set(runId, listeners);
    }
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.#subscribers.delete(runId);
      }
    };
  }

  #emit(runId: string, event: AgentEvent): void {
    for (const listener of this.#subscribers.get(runId) ?? []) {
      try {
        listener(event);
      } catch (error) {
        this.logger.warn(
          `event listener for ${runId} threw: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  /**
   * SSE 事件流：先补发快照事件，再推送实时事件，终态事件后完成。
   * 订阅先于快照建立并缓冲，避免快照读取与订阅之间的事件竞态。
   */
  streamEvents(runId: string): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
      let buffer: AgentEvent[] = [];
      let snapshotSent = false;
      let finished = false;

      const complete = (): void => {
        if (!finished) {
          finished = true;
          subscriber.complete();
        }
      };

      const unsubscribe = this.subscribe(runId, (event) => {
        if (!snapshotSent) {
          buffer.push(event);
          return;
        }
        subscriber.next({ data: event });
        if (TERMINAL_EVENTS.has(event.name)) {
          complete();
        }
      });

      void this.getRun(runId)
        .then((record) => {
          for (const event of record.events) {
            subscriber.next({ data: event });
          }
          snapshotSent = true;
          for (const event of buffer) {
            subscriber.next({ data: event });
            if (TERMINAL_EVENTS.has(event.name)) {
              complete();
            }
          }
          if (TERMINAL_STATUSES.has(record.status)) {
            complete();
          }
        })
        .catch((error: unknown) => {
          subscriber.error(error);
        });

      return () => {
        unsubscribe();
        complete();
      };
    });
  }

  async createRun(input: CreateRunInput): Promise<RunRecord> {
    const agent: Agent | undefined = this.agents.get(input.agentName);
    if (agent === undefined) {
      throw new NotFoundException(`unknown agent: "${input.agentName}"`);
    }

    const record = await this.store.create({
      id: `run_${globalThis.crypto.randomUUID()}`,
      agentName: agent.name,
      task: input.task,
    });

    // Session Memory：把同 Agent 最近几次任务的摘要注入系统提示，形成会话连续性
    const memoryLines = this.memory
      ?.recent(input.agentName)
      .map((entry) => `- [${entry.status}] ${entry.task} → ${entry.summary.slice(0, 200)}`);
    const systemPrompt =
      memoryLines !== undefined && memoryLines.length > 0
        ? `${agent.systemPrompt}\n\n# Recent session memory\n${memoryLines.join("\n")}`
        : agent.systemPrompt;

    // AGENTS.md §30：API 请求不阻塞等待 Agent Run，创建即返回，执行在后台推进
    void this.#execute(record.id, agent, input.task, systemPrompt).catch((error: unknown) => {
      this.logger.error(
        `run ${record.id} crashed`,
        error instanceof Error ? error.stack : String(error),
      );
    });

    return record;
  }

  async getRun(id: string): Promise<RunRecord> {
    const record = await this.store.get(id);
    if (record === undefined) {
      throw new NotFoundException(`unknown run: "${id}"`);
    }
    return record;
  }

  async listRuns(): Promise<RunRecord[]> {
    return this.store.list();
  }

  async #execute(runId: string, agent: Agent, task: string, systemPrompt?: string): Promise<void> {
    await this.store.update(runId, { status: "running", startedAt: new Date().toISOString() });
    const events: AgentEvent[] = [];

    const result = await agent.run(task, {
      runId,
      systemPrompt: systemPrompt ?? agent.systemPrompt,
      onEvent: async (event: AgentEvent) => {
        events.push(event);
        // 运行中审批的状态投影：等待审批 / 审批后回到执行中
        const statusPatch: Partial<RunRecord> =
          event.name === "approval.required"
            ? { status: "waiting_approval" }
            : event.name === "approval.approved" || event.name === "approval.rejected"
              ? { status: "running" }
              : {};
        await this.store.update(runId, { events: [...events], ...statusPatch });
        this.#emit(runId, event);
      },
    });

    const status = toRunStatus(result.status);
    await this.store.update(runId, {
      status,
      finishedAt: TERMINAL_STATUSES.has(status) ? new Date().toISOString() : undefined,
      error: result.error,
    });

    if (status === "failed" && result.error !== undefined) {
      this.logger.warn(`run ${runId} failed: ${result.error}`);
    }

    if (this.memory !== undefined) {
      this.memory.record({
        agentName: agent.name,
        task,
        status,
        summary:
          result.messages.filter((message) => message.role === "assistant").at(-1)?.content ?? "",
      });
    }

    if (this.artifactRegistrar !== undefined && status === "completed") {
      const summary = result.messages.filter((m) => m.role === "assistant").at(-1)?.content ?? "";
      this.artifactRegistrar({
        runId,
        name: "execution-summary",
        type: "report",
        content: summary,
      });
    }
  }
}
