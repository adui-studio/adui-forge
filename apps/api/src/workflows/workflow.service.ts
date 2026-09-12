import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { AgentEvent } from "@adui-forge/contracts";
import { AgentRegistry } from "@adui-forge/agent";
import {
  WorkflowRunner,
  graphToSteps,
  type WorkflowGraph,
  type WorkflowStep,
} from "@adui-forge/workflow";
import { DEFAULT_AGENT_NAME } from "../agents/agent.factory";
import type { RunRecord, RunStore } from "../runs/run.types";
import { RUN_STORE } from "../runs/run.tokens";
import { RunService } from "../runs/run.service";

export interface CreateWorkflowRunInput {
  /** 顺序执行的子任务列表；每个任务一个 agent 节点。 */
  tasks: string[];
}

/**
 * Workflow 运行服务：把多任务编排映射为 WorkflowRunner 的 agent 节点序列，
 * 复用 RunStore 持久化与 RunService 的事件订阅通道（SSE）。
 */
@Injectable()
export class WorkflowService {
  readonly #runner = new WorkflowRunner();

  constructor(
    @Inject(RUN_STORE) private readonly store: RunStore,
    @Inject(AgentRegistry) private readonly agents: AgentRegistry,
    // 事件推送复用 RunService 的订阅总线（SSE 通道）
    @Inject(RunService) private readonly runs: RunService,
  ) {}

  async createWorkflowRun(input: CreateWorkflowRunInput): Promise<RunRecord> {
    const agent = this.agents.get(DEFAULT_AGENT_NAME);
    if (agent === undefined) {
      throw new NotFoundException(`unknown agent: "${DEFAULT_AGENT_NAME}"`);
    }

    const record = await this.store.create({
      id: `workflow_${globalThis.crypto.randomUUID()}`,
      agentName: `workflow(${input.tasks.length} steps)`,
      task: input.tasks.join(" → "),
    });

    const steps: WorkflowStep[] = input.tasks.map((task, index) => ({
      id: `step_${index + 1}`,
      type: "agent",
      agent,
      task,
    }));

    void this.#execute(record.id, steps).catch(() => {});

    return record;
  }

  /** 图定义（含条件分支）执行入口：编译为 WorkflowStep[] 后走同一执行通道。 */
  async createWorkflowRunFromGraph(graph: WorkflowGraph): Promise<RunRecord> {
    const agent = this.agents.get(DEFAULT_AGENT_NAME);
    if (agent === undefined) {
      throw new NotFoundException(`unknown agent: "${DEFAULT_AGENT_NAME}"`);
    }

    const agentTasks = graph.nodes.filter((node) => node.type === "agent").map((node) => node.task);
    const record = await this.store.create({
      id: `workflow_${globalThis.crypto.randomUUID()}`,
      agentName: `workflow(${graph.nodes.length} nodes)`,
      task: agentTasks.join(" → "),
    });

    void this.#execute(record.id, graphToSteps(graph, agent)).catch(() => {});

    return record;
  }

  async #execute(runId: string, steps: WorkflowStep[]): Promise<void> {
    await this.store.update(runId, { status: "running", startedAt: new Date().toISOString() });
    const events: AgentEvent[] = [];

    const result = await this.#runner.run(
      { name: "api-workflow", steps },
      {
        runId,
        onEvent: async (event: AgentEvent) => {
          events.push(event);
          await this.store.update(runId, { events: [...events] });
          this.runs.emitEvent(runId, event);
        },
      },
    );

    await this.store.update(runId, {
      status:
        result.status === "completed"
          ? "completed"
          : result.status === "aborted"
            ? "cancelled"
            : "failed",
      finishedAt: new Date().toISOString(),
      error: result.error,
    });
  }
}
