import type { AgentEvent } from "@adui-forge/contracts";
import { authHeader, clearToken } from "./auth.ts";

/** Run 记录（与 apps/api 的 RunRecord 对齐，经 contracts 事件协议关联）。 */
export interface RunRecord {
  id: string;
  agentName: string;
  task: string;
  status: string;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  error?: string;
  events: AgentEvent[];
}

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(path, {
    headers: { "content-type": "application/json", ...authHeader() },
    ...init,
  });
  if (response.status === 401) {
    clearToken();
    window.location.href = "/login";
    throw new Error("未登录或令牌已过期");
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? `request failed: ${response.status}`);
  }
  return (await response.json()) as T;
};

export const fetchRuns = (): Promise<RunRecord[]> => request<RunRecord[]>("/api/v1/runs");

export const fetchRun = (id: string): Promise<RunRecord> =>
  request<RunRecord>(`/api/v1/runs/${id}`);

export const cancelRun = (id: string): Promise<RunRecord> =>
  request<RunRecord>(`/api/v1/runs/${id}/cancel`, { method: "POST" });

export const retryRun = (id: string): Promise<RunRecord> =>
  request<RunRecord>(`/api/v1/runs/${id}/retry`, { method: "POST" });

export const createRun = (task: string, agentName?: string): Promise<RunRecord> =>
  request<RunRecord>("/api/v1/runs", {
    method: "POST",
    body: JSON.stringify(agentName === undefined ? { task } : { task, agentName }),
  });

const TERMINAL_EVENTS = new Set(["run.completed", "run.failed", "run.cancelled"]);

/**
 * 订阅 Run 的 SSE 事件流。
 * 返回关闭函数；终态事件后自动关闭连接。
 */
export const streamRunEvents = (
  runId: string,
  onEvent: (event: AgentEvent) => void,
  onComplete: () => void,
): (() => void) => {
  const source = new EventSource(`/api/v1/runs/${runId}/events`);
  source.onmessage = (messageEvent) => {
    const event = JSON.parse(messageEvent.data) as AgentEvent;
    onEvent(event);
    if (TERMINAL_EVENTS.has(event.name)) {
      source.close();
      onComplete();
    }
  };
  source.onerror = () => {
    // 连接异常时关闭，交由上层用轮询/重试兜底
    source.close();
  };
  return () => source.close();
};

export interface AgentSummary {
  name: string;
  description: string;
  tools: string[];
}

export const fetchAgents = async (): Promise<AgentSummary[]> => {
  const response = await fetch("/api/v1/agents");
  if (!response.ok) throw new Error(`request failed: ${response.status}`);
  return (await response.json()) as AgentSummary[];
};

export interface MemoryRecord {
  agentName: string;
  task: string;
  status: string;
  summary: string;
  recordedAt: string;
}

export const fetchMemory = async (agent: string): Promise<MemoryRecord[]> => {
  const response = await fetch(`/api/v1/memory?agent=${encodeURIComponent(agent)}`);
  if (!response.ok) throw new Error(`request failed: ${response.status}`);
  return (await response.json()) as MemoryRecord[];
};

export interface WorkflowDefinitionRecord {
  name: string;
  description: string;
  tasks: string[];
}

export const registerWorkflow = async (input: {
  name: string;
  description: string;
  tasks: string[];
}): Promise<{ ok: boolean; name: string }> => {
  const response = await fetch("/api/v1/workflows", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? `request failed: ${response.status}`);
  }
  return (await response.json()) as { ok: boolean; name: string };
};
