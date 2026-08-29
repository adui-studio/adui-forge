import type { AgentEvent, AgentEventName } from "@adui-forge/contracts";
import type { ZodType } from "zod";

/** Tool 权限级别：free 直接执行；approval 需要人工审批（REQUIREMENTS.md §48）。 */
export type ToolPermission = "free" | "approval";

export interface ToolContext {
  runId: string;
  signal: AbortSignal;
}

/** Agent 可执行的原子能力，见 REQUIREMENTS.md §33。 */
export interface AgentTool<TInput = unknown> {
  name: string;
  description: string;
  permission: ToolPermission;
  inputSchema: ZodType<TInput>;
  execute(input: TInput, context: ToolContext): Promise<unknown>;
}

export type MessageRole = "system" | "user" | "assistant" | "tool";

export interface AgentMessage {
  role: MessageRole;
  content: string;
  toolName?: string;
  toolCallId?: string;
}

export interface ModelToolCall {
  id: string;
  name: string;
  input: unknown;
}

export interface ModelTurnResult {
  content: string | null;
  toolCalls: ModelToolCall[];
  inputTokens?: number;
  outputTokens?: number;
}

/**
 * Provider 无关的模型适配接口。
 * 业务代码禁止直接依赖 OpenAI / Anthropic SDK，一律实现本接口（REQUIREMENTS.md §31）。
 */
export interface ModelAdapter {
  generate(
    messages: AgentMessage[],
    tools: AgentTool[],
    signal: AbortSignal,
  ): Promise<ModelTurnResult>;
}

export interface ApprovalRequest {
  runId: string;
  toolName: string;
  input: unknown;
  reason: string;
}

export type ApprovalDecision = "approved" | "rejected";

export interface ApprovalHandler {
  requestApproval(request: ApprovalRequest): Promise<ApprovalDecision>;
}

export type AgentRunStatus =
  | "completed"
  | "max_steps_reached"
  | "token_limit_reached"
  | "waiting_approval"
  | "aborted"
  | "failed";

export interface AgentRunResult {
  status: AgentRunStatus;
  runId: string;
  steps: number;
  messages: AgentMessage[];
  error?: string;
}

export interface AgentLoopOptions {
  runId?: string;
  systemPrompt?: string;
  /** 最大模型轮数，必须 > 0（REQUIREMENTS.md §30）。 */
  maxSteps: number;
  /** 单次 Run 的总超时（毫秒）。 */
  timeoutMs: number;
  /** 累计 token 上限，超限即停。 */
  tokenLimit?: number;
  /** 外部取消信号；与 timeoutMs 组合使用。 */
  signal?: AbortSignal;
  approval?: ApprovalHandler;
  onEvent?: (event: AgentEvent) => void;
}

export type { AgentEvent, AgentEventName };
