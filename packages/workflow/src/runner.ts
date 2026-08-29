import { createAgentEvent, type AgentEvent, type AgentEventName } from "@adui-forge/contracts";
import type {
  WorkflowContext,
  WorkflowDefinition,
  WorkflowRunOptions,
  WorkflowRunResult,
  WorkflowRunStatus,
  WorkflowStep,
} from "./types.ts";

const describeError = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * Workflow 引擎（REQUIREMENTS.md §40）：
 * 数据化步骤定义 + 顺序执行；agent / tool / condition 三类节点；
 * 执行不依赖任何图编辑器格式，`WorkflowDefinition` 即运行时格式。
 */
export class WorkflowRunner {
  async run(
    definition: WorkflowDefinition,
    options: WorkflowRunOptions = {},
  ): Promise<WorkflowRunResult> {
    const runId = options.runId ?? `workflow_${globalThis.crypto.randomUUID()}`;
    const emit = (name: AgentEventName, stepId?: string, payload?: unknown): void => {
      options.onEvent?.(createAgentEvent(name, runId, payload, stepId));
    };

    const context: WorkflowContext = {
      outputs: {},
      inputs: options.inputs ?? {},
      signal: options.signal ?? new AbortController().signal,
    };

    emit("workflow.started", undefined, { name: definition.name });

    try {
      await this.#runSteps(definition.steps, context, emit, runId);
      emit("workflow.completed", undefined, { outputs: Object.keys(context.outputs) });
      return { status: "completed", runId, outputs: context.outputs };
    } catch (error) {
      if (context.signal.aborted) {
        emit("run.cancelled", undefined, { reason: "aborted" });
        return { status: "aborted", runId, outputs: context.outputs };
      }
      emit("run.failed", undefined, { error: describeError(error) });
      return {
        status: "failed",
        runId,
        outputs: context.outputs,
        error: describeError(error),
      };
    }
  }

  async #runSteps(
    steps: WorkflowStep[],
    context: WorkflowContext,
    emit: (name: AgentEventName, stepId?: string, payload?: unknown) => void,
    runId: string,
  ): Promise<void> {
    for (const step of steps) {
      if (context.signal.aborted) {
        throw new Error("aborted");
      }
      emit("workflow.step.started", step.id);

      if (step.type === "condition") {
        if (step.when(context)) {
          await this.#runSteps(step.steps, context, emit, runId);
        }
        emit("workflow.step.completed", step.id);
        continue;
      }

      try {
        if (step.type === "agent") {
          const task = typeof step.task === "function" ? step.task(context) : step.task;
          const result = await step.agent.run(task, { runId, signal: context.signal });
          if (result.status !== "completed") {
            throw new Error(
              `agent step "${step.id}" ended with status ${result.status}: ${result.error ?? "no error given"}`,
            );
          }
          const lastMessage = result.messages.at(-1);
          context.outputs[step.id] = lastMessage?.content ?? "";
        } else {
          const input = step.tool.inputSchema.parse(step.input);
          context.outputs[step.id] = await step.tool.execute(input, {
            runId,
            signal: context.signal,
          });
        }
        emit("workflow.step.completed", step.id, { outputs: Object.keys(context.outputs) });
      } catch (error) {
        emit("workflow.step.failed", step.id, { error: describeError(error) });
        throw error;
      }
    }
  }
}
