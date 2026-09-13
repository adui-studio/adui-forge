import { authHeader } from "./auth.ts";
import { getPlatformAdapter } from "../platform/adapter.ts";

/** Desktop 下请求路由到本地 Runner（ADR-005 同形 REST）；web 返回云端相对路径。 */
const workspaceBase = async (): Promise<{ base: string; headers: Record<string, string> }> => {
  const adapter = getPlatformAdapter();
  const runner = await adapter.getRunnerInfo();
  if (runner?.running === true && runner.baseUrl !== null) {
    return { base: runner.baseUrl, headers: { authorization: `Bearer ${runner.token ?? ""}` } };
  }
  return { base: "", headers: {} };
};

/** Workspace 文件 API（ADR-004 阶段 1/2 契约）。 */

export interface WorkspaceEntryRecord {
  name: string;
  type: "file" | "directory";
  size: number;
}

export interface WorkspaceFileRecord {
  path: string;
  content: string;
  size: number;
}

const workspaceRequest = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const { base, headers } = await workspaceBase();
  const response = await fetch(`${base}/api/v1/workspace/${path}`, {
    headers: { "content-type": "application/json", ...authHeader(), ...headers },
    ...init,
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? `request failed: ${response.status}`);
  }
  return (await response.json()) as T;
};

export const fetchWorkspaceTree = (path: string): Promise<WorkspaceEntryRecord[]> =>
  workspaceRequest<WorkspaceEntryRecord[]>(`tree?path=${encodeURIComponent(path)}`);

export const fetchWorkspaceFile = (path: string): Promise<WorkspaceFileRecord> =>
  workspaceRequest<WorkspaceFileRecord>(`file?path=${encodeURIComponent(path)}`);

export const deleteWorkspaceFile = (path: string): Promise<void> =>
  workspaceRequest<void>(`file?path=${encodeURIComponent(path)}`, {
    method: "DELETE",
  });

export interface GitChangeRecord {
  code: string;
  path: string;
}

export interface GitStatusRecord {
  branch: string;
  changes: GitChangeRecord[];
}

export const fetchGitStatus = (): Promise<GitStatusRecord> =>
  workspaceRequest<GitStatusRecord>("/api/v1/workspace/git/status");

export const fetchGitOriginal = (
  path: string,
): Promise<{ path: string; tracked: boolean; content: string }> =>
  workspaceRequest<{ path: string; tracked: boolean; content: string }>(
    `/api/v1/workspace/git/original?path=${encodeURIComponent(path)}`,
  );

export const fetchGitDiff = (path: string): Promise<{ diff: string }> =>
  workspaceRequest<{ diff: string }>(`/api/v1/workspace/git/diff?path=${encodeURIComponent(path)}`);

export const commitGit = (message: string, paths: string[]): Promise<{ commit: string }> =>
  workspaceRequest<{ commit: string }>("/api/v1/workspace/git/commit", {
    method: "POST",
    body: JSON.stringify({ message, paths }),
  });

export const writeWorkspaceFile = (path: string, content: string): Promise<WorkspaceFileRecord> =>
  workspaceRequest<WorkspaceFileRecord>("file", {
    method: "PUT",
    body: JSON.stringify({ path, content }),
  });

/** 附带文件内容的上限（字符）：超出截断并注明，避免任务文本失控。 */
export const AGENT_CONTEXT_MAX_CHARS = 20_000;

/**
 * 组装 Agent 面板的任务文本：用户输入 + 可选的当前文件上下文。
 * 无上下文时原样返回；文件内容超限截断并注明省略。
 */
export const composeAgentTask = (
  userText: string,
  context: { path: string; content: string } | null,
): string => {
  if (context === null || context.content === "") return userText;
  const truncated =
    context.content.length > AGENT_CONTEXT_MAX_CHARS
      ? `${context.content.slice(0, AGENT_CONTEXT_MAX_CHARS)}\n… (truncated)`
      : context.content;
  return `${userText}\n\n[Current file: ${context.path}]\n\`\`\`\n${truncated}\n\`\`\``;
};
