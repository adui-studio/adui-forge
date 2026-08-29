import type { AgentEvent } from "@adui-forge/contracts";
import type { AgentTool } from "@adui-forge/contracts";
import type { Agent } from "@adui-forge/agent";

export interface WorkflowContext {
  /** 步骤输出，按 step id 索引。 */
  outputs: Record<string, unknown>;
  /** 工作流入参。 */
  inputs: Record<string, unknown>;
  signal: AbortSignal;
}

export type WorkflowStep =
  | {
      id: string;
      type: "agent";
      agent: Agent;
      /** 任务文本；可用函数从上下文派生（如引用前序步骤输出）。 */
      task: string | ((context: WorkflowContext) => string);
    }
  | {
      id: string;
      type: "tool";
      tool: AgentTool;
      input: unknown;
    }
  | {
      id: string;
      type: "condition";
      when: (context: WorkflowContext) => boolean;
      steps: WorkflowStep[];
    };

export interface WorkflowDefinition {
  /** kebab-case 名字，如 "code-review-pipeline"。 */
  name: string;
  steps: WorkflowStep[];
}

export interface WorkflowRunOptions {
  runId?: string;
  inputs?: Record<string, unknown>;
  signal?: AbortSignal;
  onEvent?: (event: AgentEvent) => void;
}

export type WorkflowRunStatus = "completed" | "failed" | "aborted";

export interface WorkflowRunResult {
  status: WorkflowRunStatus;
  runId: string;
  outputs: Record<string, unknown>;
  error?: string;
}
