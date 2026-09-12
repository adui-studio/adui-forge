import { authHeader } from "./auth.ts";

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
  const response = await fetch(path, {
    headers: { "content-type": "application/json", ...authHeader() },
    ...init,
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? `request failed: ${response.status}`);
  }
  return (await response.json()) as T;
};

export const fetchWorkspaceTree = (path: string): Promise<WorkspaceEntryRecord[]> =>
  workspaceRequest<WorkspaceEntryRecord[]>(
    `/api/v1/workspace/tree?path=${encodeURIComponent(path)}`,
  );

export const fetchWorkspaceFile = (path: string): Promise<WorkspaceFileRecord> =>
  workspaceRequest<WorkspaceFileRecord>(`/api/v1/workspace/file?path=${encodeURIComponent(path)}`);

export const writeWorkspaceFile = (path: string, content: string): Promise<WorkspaceFileRecord> =>
  workspaceRequest<WorkspaceFileRecord>("/api/v1/workspace/file", {
    method: "PUT",
    body: JSON.stringify({ path, content }),
  });
