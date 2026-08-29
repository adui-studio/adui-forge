import type { AgentTool, ModelAdapter } from "@adui-forge/contracts";
import {
  runAgent,
  type AgentLoopOptions,
  type AgentRunResult,
  type ApprovalHandler,
} from "@adui-forge/agent-runtime";

/** Loop 运行参数中必须由定义给定的部分。 */
export type AgentLoopDefaults = Pick<AgentLoopOptions, "maxSteps" | "timeoutMs"> &
  Partial<Pick<AgentLoopOptions, "tokenLimit">>;

export interface AgentDefinition {
  /** kebab-case 全局唯一名，如 "repo-coder"。 */
  name: string;
  description: string;
  systemPrompt: string;
  model: ModelAdapter;
  tools: AgentTool[];
  loop: AgentLoopDefaults;
  /** 运行中审批处理器；approval 级工具触发时由 Loop 调用（REQUIREMENTS §48）。 */
  approval?: ApprovalHandler;
}

/** 单次运行可覆盖的部分；定义级默认值始终兜底。 */
export interface AgentRunOverrides extends Partial<
  Pick<AgentLoopOptions, "runId" | "signal" | "approval" | "onEvent" | "systemPrompt">
> {}

export interface Agent extends AgentDefinition {
  run(task: string, overrides?: AgentRunOverrides): Promise<AgentRunResult>;
}

/**
 * Agent 定义组装（REQUIREMENTS.md §29）：把 model + tools + system prompt + Loop 默认值
 * 组装成一个可运行的 Agent。执行委托给 agent-runtime 的 runAgent，本层不重复实现 Loop。
 */
export const defineAgent = (definition: AgentDefinition): Agent => {
  return {
    ...definition,
    run(task: string, overrides: AgentRunOverrides = {}): Promise<AgentRunResult> {
      return runAgent(definition.model, definition.tools, task, {
        systemPrompt: definition.systemPrompt,
        maxSteps: definition.loop.maxSteps,
        timeoutMs: definition.loop.timeoutMs,
        tokenLimit: definition.loop.tokenLimit,
        approval: definition.approval,
        ...overrides,
      });
    },
  };
};
