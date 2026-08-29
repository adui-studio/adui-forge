export interface AuthResult {
  userId: string;
  username: string;
  accessToken: string;
}

const TOKEN_KEY = "forge.accessToken";

export const getAccessToken = (): string | null => localStorage.getItem(TOKEN_KEY);

export const authHeader = (): Record<string, string> => {
  const token = getAccessToken();
  return token === null ? {} : { authorization: `Bearer ${token}` };
};

export const saveToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const clearToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

const request = async (
  path: string,
  body: { username: string; password: string },
): Promise<AuthResult> => {
  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(detail?.message ?? `request failed: ${response.status}`);
  }
  return (await response.json()) as AuthResult;
};

export const register = (username: string, password: string): Promise<AuthResult> =>
  request("/api/v1/auth/register", { username, password });

export const login = (username: string, password: string): Promise<AuthResult> =>
  request("/api/v1/auth/login", { username, password });
