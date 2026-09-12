import i18next from "i18next";
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
    throw new Error(i18next.t("common.unauthorized"));
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

export interface TaskRecord {
  id: string;
  title: string;
  runId: string;
  status: string;
  createdAt: string;
}

export const fetchTasks = (): Promise<TaskRecord[]> => request<TaskRecord[]>("/api/v1/tasks");

export const createTask = (input: {
  title: string;
  task: string;
  agentName?: string;
}): Promise<TaskRecord> =>
  request<TaskRecord>("/api/v1/tasks", {
    method: "POST",
    body: JSON.stringify(input),
  });

export interface AgentModelInfo {
  name: string;
  provider: string;
  modelId: string;
}

export interface AgentDetailRecord {
  name: string;
  description: string;
  systemPrompt: string;
  tools: string[];
  /** 命名模型；空串 = 默认模型。 */
  model: string;
  skills?: string[];
  loop: { maxSteps: number; timeoutMs: number; tokenLimit: number | null };
  source: "builtin" | "custom";
  availableTools: string[];
  modelCatalog: AgentModelInfo[];
}

export const fetchAgent = (name: string): Promise<AgentDetailRecord> =>
  request<AgentDetailRecord>(`/api/v1/agents/${encodeURIComponent(name)}`);

export const fetchAgentModels = async (): Promise<{
  default: string | null;
  models: AgentModelInfo[];
}> => request<{ default: string | null; models: AgentModelInfo[] }>("/api/v1/agents/models");

export const upsertAgent = (input: {
  name: string;
  description: string;
  systemPrompt: string;
  tools: string[];
  skills?: string[];
  model?: string;
  maxSteps: number;
  timeoutMs: number;
  tokenLimit?: number;
}): Promise<{ name: string }> =>
  request<{ name: string }>("/api/v1/agents", {
    method: "POST",
    body: JSON.stringify(input),
  });

export const deleteAgent = (name: string): Promise<{ ok: boolean }> =>
  request<{ ok: boolean }>(`/api/v1/agents/${encodeURIComponent(name)}`, { method: "DELETE" });

export interface ToolMetaRecord {
  name: string;
  description: string;
  permission: string;
}

export const fetchTools = (): Promise<ToolMetaRecord[]> =>
  request<{ tools: ToolMetaRecord[] }>("/api/v1/agents/tools").then((detail) => detail.tools);

export interface ConversationMessageRecord {
  role: "user" | "assistant";
  text: string;
  runId?: string;
  status: "streaming" | "completed" | "failed" | "cancelled";
  error?: string;
  tools?: string[];
}

export interface ConversationRecord {
  id: string;
  title: string;
  agentName: string;
  messages: ConversationMessageRecord[];
  createdAt: string;
  updatedAt?: string;
}

export interface ConversationSummaryRecord {
  id: string;
  title: string;
  agentName: string;
  messageCount: number;
  createdAt: string;
  updatedAt?: string;
}

export const createConversation = (input: {
  agentName: string;
  title?: string;
}): Promise<ConversationRecord> =>
  request<ConversationRecord>("/api/v1/conversations", {
    method: "POST",
    body: JSON.stringify(input),
  });

export const fetchConversations = (): Promise<ConversationSummaryRecord[]> =>
  request<ConversationSummaryRecord[]>("/api/v1/conversations");

export const fetchConversation = (id: string): Promise<ConversationRecord> =>
  request<ConversationRecord>(`/api/v1/conversations/${encodeURIComponent(id)}`);

export const appendConversationMessage = (
  id: string,
  message: ConversationMessageRecord,
): Promise<ConversationRecord> =>
  request<ConversationRecord>(`/api/v1/conversations/${encodeURIComponent(id)}/messages`, {
    method: "POST",
    body: JSON.stringify(message),
  });

export const renameConversation = (id: string, title: string): Promise<ConversationRecord> =>
  request<ConversationRecord>(`/api/v1/conversations/${encodeURIComponent(id)}/title`, {
    method: "PATCH",
    body: JSON.stringify({ title }),
  });

export const deleteConversation = (id: string): Promise<{ ok: boolean }> =>
  request<{ ok: boolean }>(`/api/v1/conversations/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });

export interface McpServerStatusRecord {
  name: string;
  command: string;
  args?: string[];
  status: "connected" | "failed";
  toolNames: string[];
  error?: string;
}

export const fetchMcpServers = (): Promise<McpServerStatusRecord[]> =>
  request<McpServerStatusRecord[]>("/api/v1/mcp/servers");

export const testMcpServer = (
  name: string,
): Promise<{ ok: boolean; toolNames?: string[]; error?: string }> =>
  request<{ ok: boolean; toolNames?: string[]; error?: string }>(
    `/api/v1/mcp/servers/${encodeURIComponent(name)}/test`,
    { method: "POST", body: JSON.stringify({ name }) },
  );

export interface SkillRecord {
  name: string;
  description: string;
  instructions: string;
  enabled: boolean;
  createdAt: string;
  updatedAt?: string;
}

export const fetchSkills = (): Promise<SkillRecord[]> => request<SkillRecord[]>("/api/v1/skills");

export const upsertSkill = (input: {
  name: string;
  description: string;
  instructions: string;
  enabled: boolean;
}): Promise<{ ok: boolean; name: string }> =>
  request<{ ok: boolean; name: string }>("/api/v1/skills", {
    method: "POST",
    body: JSON.stringify(input),
  });

export const setSkillEnabled = (name: string, enabled: boolean): Promise<{ ok: boolean }> =>
  request<{ ok: boolean }>(`/api/v1/skills/${encodeURIComponent(name)}/enabled`, {
    method: "PATCH",
    body: JSON.stringify({ enabled }),
  });

export interface SkillImportResult {
  ok: boolean;
  imported?: string[];
  skipped?: Array<{ name: string; reason: string }>;
  message?: string;
}

export const importSkills = (): Promise<SkillImportResult> =>
  request<SkillImportResult>("/api/v1/skills/import", { method: "POST" });

export const exportSkill = (
  name: string,
): Promise<{ name: string; filename: string; content: string }> =>
  request<{ name: string; filename: string; content: string }>(
    `/api/v1/skills/${encodeURIComponent(name)}/export`,
  );

export const deleteSkill = (name: string): Promise<{ ok: boolean }> =>
  request<{ ok: boolean }>(`/api/v1/skills/${encodeURIComponent(name)}`, {
    method: "DELETE",
  });

export interface ComparisonSummaryRecord {
  id: string;
  task: string;
  items: Array<{ agentName: string; runId: string }>;
  createdAt: string;
}

export interface ComparisonResultRecord {
  agentName: string;
  runId: string;
  status: string;
  text: string;
  tools: string[];
  error?: string;
  durationMs: number | null;
}

export const createComparison = (input: {
  task: string;
  items: Array<{ agentName: string; runId: string }>;
}): Promise<{ id: string }> =>
  request<{ id: string }>("/api/v1/comparisons", {
    method: "POST",
    body: JSON.stringify(input),
  });

export const fetchComparisons = (): Promise<ComparisonSummaryRecord[]> =>
  request<ComparisonSummaryRecord[]>("/api/v1/comparisons");

export const fetchComparison = (
  id: string,
): Promise<{ record: ComparisonSummaryRecord; results: ComparisonResultRecord[] }> =>
  request<{ record: ComparisonSummaryRecord; results: ComparisonResultRecord[] }>(
    `/api/v1/comparisons/${encodeURIComponent(id)}`,
  );

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
  /** 线性定义与图定义二选一；graph 存在时优先生效。 */
  tasks?: string[];
  graph?: import("@adui-forge/workflow").WorkflowGraph;
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
