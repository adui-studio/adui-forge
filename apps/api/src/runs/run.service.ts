import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Inject } from "@nestjs/common";
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

  constructor(
    @Inject(RUN_STORE) private readonly store: RunStore,
    @Inject(AgentRegistry) private readonly agents: AgentRegistry,
  ) {}

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

    // AGENTS.md §30：API 请求不阻塞等待 Agent Run，创建即返回，执行在后台推进
    void this.#execute(record.id, agent, input.task).catch((error: unknown) => {
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

  async #execute(runId: string, agent: Agent, task: string): Promise<void> {
    await this.store.update(runId, { status: "running", startedAt: new Date().toISOString() });
    const events: AgentEvent[] = [];

    const result = await agent.run(task, {
      runId,
      onEvent: async (event: AgentEvent) => {
        events.push(event);
        await this.store.update(runId, { events: [...events] });
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
  }
}
