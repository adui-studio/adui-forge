import { z } from "zod";

/**
 * 统一事件命名（domain.action），见 REQUIREMENTS.md §52。
 * 禁止在业务代码中出现第二套事件命名风格。
 */
export const AGENT_EVENT_NAMES = [
  "run.queued",
  "run.started",
  "run.paused",
  "run.completed",
  "run.failed",
  "run.cancelled",

  "step.started",
  "step.completed",
  "step.failed",

  "model.started",
  "model.delta",
  "model.completed",

  "tool.started",
  "tool.completed",
  "tool.failed",

  "mcp.started",
  "mcp.completed",

  "approval.required",
  "approval.approved",
  "approval.rejected",

  "artifact.created",

  "workflow.started",
  "workflow.step.started",
  "workflow.step.completed",
  "workflow.step.failed",
  "workflow.completed",
] as const;

export type AgentEventName = (typeof AGENT_EVENT_NAMES)[number];

export const agentEventNameSchema = z.enum(AGENT_EVENT_NAMES);

export interface AgentEvent<TPayload = unknown> {
  name: AgentEventName;
  runId: string;
  stepId?: string;
  timestamp: string;
  payload?: TPayload;
}

export const agentEventSchema: z.ZodType<AgentEvent> = z.object({
  name: agentEventNameSchema,
  runId: z.string().min(1),
  stepId: z.string().min(1).optional(),
  timestamp: z.string().min(1),
  payload: z.unknown().optional(),
});

export const createAgentEvent = <TPayload>(
  name: AgentEventName,
  runId: string,
  payload?: TPayload,
  stepId?: string,
): AgentEvent<TPayload> => {
  return {
    name,
    runId,
    stepId,
    timestamp: new Date().toISOString(),
    payload,
  };
};
