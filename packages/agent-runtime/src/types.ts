import type { AgentEvent, AgentEventName, AgentMessage } from "@adui-forge/contracts";

// 模型与工具的运行时协议统一定义在 contracts，此处再导出保持兼容
export type {
  AgentMessage,
  AgentTool,
  ModelCallContext,
  MessageRole,
  ModelAdapter,
  ModelToolCall,
  ModelTurnResult,
  ToolContext,
  ToolPermission,
} from "@adui-forge/contracts";

export type { AgentEvent, AgentEventName };

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
