import { authHeader, getServerAddress } from "./settings.ts";

/** 云端请求层：桌面 UI 无同源反代，全部走用户配置的绝对地址（P1 内嵌）。 */

export const buildUrl = (base: string, path: string): string => {
  const normalized = base.trim().replace(/\/+$/, "");
  if (normalized === "") {
    throw new Error("未配置服务器地址（设置 → 服务器）");
  }
  return `${normalized}${path}`;
};

export interface FetchLike {
  (url: string, init?: RequestInit): Promise<Response>;
}

const request = async <T>(
  path: string,
  init: RequestInit = {},
  fetchImpl: FetchLike = fetch,
): Promise<T> => {
  const response = await fetchImpl(buildUrl(getServerAddress(), path), {
    headers: { "content-type": "application/json", ...authHeader() },
    ...init,
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? `request failed: ${response.status}`);
  }
  return (await response.json()) as T;
};

export interface AuthResult {
  userId: string;
  username: string;
  accessToken: string;
}

export const login = async (
  username: string,
  password: string,
  fetchImpl: FetchLike = fetch,
): Promise<AuthResult> =>
  request<AuthResult>(
    "/api/v1/auth/login",
    { method: "POST", body: JSON.stringify({ username, password }) },
    fetchImpl,
  );

export interface CloudRunListItem {
  id: string;
  agentName: string;
  task: string;
  status: string;
  createdAt: string;
}

export const fetchCloudRuns = (fetchImpl: FetchLike = fetch): Promise<CloudRunListItem[]> =>
  request<CloudRunListItem[]>("/api/v1/runs", { method: "GET" }, fetchImpl);

export interface HealthResult {
  status: string;
  db: string;
}

export const fetchHealth = async (
  base: string,
  fetchImpl: FetchLike = fetch,
): Promise<HealthResult> => {
  const response = await fetchImpl(`${base.replace(/\/+$/, "")}/api/v1/health`);
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? `request failed: ${response.status}`);
  }
  return (await response.json()) as HealthResult;
};
