/** 桌面端本地设置（P1 内嵌：云服务器地址是独立 UI 的一等公民）。 */
const SERVER_KEY = "forge.desktop.serverUrl";
const TOKEN_KEY = "forge.desktop.accessToken";
const USERNAME_KEY = "forge.desktop.username";

export const getServerAddress = (): string => globalThis.localStorage?.getItem(SERVER_KEY) ?? "";

export const saveServerAddress = (address: string): void => {
  const normalized = address.trim().replace(/\/+$/, "");
  globalThis.localStorage?.setItem(SERVER_KEY, normalized);
};

export const getAccessToken = (): string | null =>
  globalThis.localStorage?.getItem(TOKEN_KEY) ?? null;

export const saveToken = (token: string, username: string): void => {
  globalThis.localStorage?.setItem(TOKEN_KEY, token);
  globalThis.localStorage?.setItem(USERNAME_KEY, username);
};

export const clearToken = (): void => {
  globalThis.localStorage?.removeItem(TOKEN_KEY);
  globalThis.localStorage?.removeItem(USERNAME_KEY);
};

export const getUsername = (): string => globalThis.localStorage?.getItem(USERNAME_KEY) ?? "";

export const authHeader = (): Record<string, string> => {
  const token = getAccessToken();
  return token === null || token === "" ? {} : { authorization: `Bearer ${token}` };
};

/** 服务器地址归一：空串视为未配置。 */
export const normalizeAddress = (address: string): string => address.trim().replace(/\/+$/, "");
