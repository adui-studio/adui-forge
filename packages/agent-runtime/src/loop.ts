import { createAgentEvent, type AgentEventName } from "@adui-forge/contracts";
import type {
  AgentLoopOptions,
  AgentMessage,
  AgentRunResult,
  AgentRunStatus,
  AgentTool,
  ModelAdapter,
  ModelCallContext,
  ModelTurnResult,
} from "./types.ts";

const describeError = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const stringifyToolOutput = (output: unknown): string => {
  if (typeof output === "string") {
    return output;
  }
  try {
    return JSON.stringify(output);
  } catch {
    return String(output);
  }
};

/**
 * Agent Loop 核心（REQUIREMENTS.md §30）。
 *
 * 硬性保证：maxSteps / timeoutMs / abort / tokenLimit 四个退出机制全部生效，
 * 不存在无界循环；Tool 输入一律经过 Zod 校验；approval 级 Tool 未提供
 * 审批处理器时立即返回 waiting_approval，绝不静默执行。
 */
export const runAgent = async (
  model: ModelAdapter,
  tools: AgentTool[],
  task: string,
  options: AgentLoopOptions,
): Promise<AgentRunResult> => {
  if (options.maxSteps < 1) {
    throw new RangeError("maxSteps must be >= 1");
  }
  if (options.timeoutMs <= 0) {
    throw new RangeError("timeoutMs must be > 0");
  }

  const runId = options.runId ?? `run_${globalThis.crypto.randomUUID()}`;
  const emit = (name: AgentEventName, stepId?: string, payload?: unknown): void => {
    options.onEvent?.(createAgentEvent(name, runId, payload, stepId));
  };

  const timeoutSignal = AbortSignal.timeout(options.timeoutMs);
  const signal = options.signal ? AbortSignal.any([options.signal, timeoutSignal]) : timeoutSignal;

  const messages: AgentMessage[] = [];
  if (options.systemPrompt !== undefined) {
    messages.push({ role: "system", content: options.systemPrompt });
  }
  messages.push({ role: "user", content: task });

  let steps = 0;
  let usedTokens = 0;

  const buildResult = (status: AgentRunStatus, error?: string): AgentRunResult => {
    return error === undefined
      ? { status, runId, steps, messages }
      : { status, runId, steps, messages, error };
  };

  const pushToolMessage = (call: { id: string; name: string }, content: string): void => {
    messages.push({ role: "tool", toolName: call.name, toolCallId: call.id, content });
  };

  emit("run.started");

  try {
    while (steps < options.maxSteps) {
      const stepId = `step_${steps + 1}`;
      emit("step.started", stepId);
      steps += 1;

      // 信号可能已中止（外部取消或超时）；不能依赖适配器自行检查
      if (signal.aborted) {
        emit("run.cancelled", stepId, { reason: timeoutSignal.aborted ? "timeout" : "cancelled" });
        return buildResult("aborted");
      }

      emit("model.started", stepId);
      const callContext: ModelCallContext = {
        signal,
        // token 增量 → model.delta 事件 → SSE → 浏览器实时呈现
        onDelta: (text) => emit("model.delta", stepId, { text }),
      };
      let turn: ModelTurnResult;
      try {
        turn = await model.generate(messages, tools, callContext);
      } catch (error) {
        if (signal.aborted) {
          emit("run.cancelled", stepId, {
            reason: timeoutSignal.aborted ? "timeout" : "cancelled",
          });
          return buildResult("aborted");
        }
        emit("step.failed", stepId, { error: describeError(error) });
        emit("run.failed", undefined, { error: describeError(error) });
        return buildResult("failed", describeError(error));
      }
      emit("model.completed", stepId, {
        inputTokens: turn.inputTokens,
        outputTokens: turn.outputTokens,
      });
      usedTokens += (turn.inputTokens ?? 0) + (turn.outputTokens ?? 0);

      if (options.tokenLimit !== undefined && usedTokens > options.tokenLimit) {
        emit("run.failed", undefined, { error: "token limit reached" });
        return buildResult("token_limit_reached");
      }

      messages.push({
        role: "assistant",
        content: turn.content ?? "",
        // 真实 Provider 要求 assistant 的 tool-call 与后续 tool-result 严格配对
        toolCalls: turn.toolCalls.length > 0 ? turn.toolCalls : undefined,
      });

      if (turn.toolCalls.length === 0) {
        emit("step.completed", stepId);
        emit("run.completed", stepId);
        return buildResult("completed");
      }

      for (const call of turn.toolCalls) {
        const tool = tools.find((candidate) => candidate.name === call.name);
        if (tool === undefined) {
          emit("tool.failed", stepId, { tool: call.name, error: "unknown tool" });
          pushToolMessage(call, `Error: unknown tool "${call.name}"`);
          continue;
        }

        const parsed = tool.inputSchema.safeParse(call.input);
        if (!parsed.success) {
          const error = parsed.error.issues
            .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
            .join("; ");
          emit("tool.failed", stepId, { tool: call.name, error });
          pushToolMessage(call, `Error: invalid tool input — ${error}`);
          continue;
        }

        if (tool.permission === "approval") {
          emit("approval.required", stepId, { tool: call.name, input: call.input });
          if (options.approval === undefined) {
            return buildResult("waiting_approval");
          }
          const decision = await options.approval.requestApproval({
            runId,
            toolName: call.name,
            input: parsed.data,
            reason: `tool "${call.name}" requires approval`,
          });
          emit(decision === "approved" ? "approval.approved" : "approval.rejected", stepId, {
            tool: call.name,
          });
          if (decision === "rejected") {
            pushToolMessage(call, "Error: the user rejected this tool call.");
            continue;
          }
        }

        emit("tool.started", stepId, { tool: call.name });
        try {
          const output = await tool.execute(parsed.data, { runId, signal });
          emit("tool.completed", stepId, { tool: call.name });
          pushToolMessage(call, stringifyToolOutput(output));
        } catch (error) {
          if (signal.aborted) {
            emit("run.cancelled", stepId, {
              reason: timeoutSignal.aborted ? "timeout" : "cancelled",
            });
            return buildResult("aborted");
          }
          emit("tool.failed", stepId, { tool: call.name, error: describeError(error) });
          pushToolMessage(call, `Error: ${describeError(error)}`);
        }
      }

      emit("step.completed", stepId);
    }

    emit("run.failed", undefined, { error: "max steps reached" });
    return buildResult("max_steps_reached");
  } catch (error) {
    // 兜底：未预期异常不允许吞掉，转换为明确的 failed 结果
    emit("run.failed", undefined, { error: describeError(error) });
    return buildResult("failed", describeError(error));
  }
};
