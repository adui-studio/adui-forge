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

export interface ModelToolCall {
  id: string;
  name: string;
  input: unknown;
}

export interface AgentMessage {
  role: MessageRole;
  content: string;
  toolName?: string;
  toolCallId?: string;
  /** assistant 消息携带的 tool 调用；Provider 适配层用于构造 tool-call/result 配对。 */
  toolCalls?: ModelToolCall[];
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
