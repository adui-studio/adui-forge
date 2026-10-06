import { afterEach, describe, expect, it } from "vite-plus/test";
import { buildUrl, fetchCloudRuns, fetchHealth, login } from "../src/lib/api.ts";
import {
  authHeader,
  clearToken,
  getServerAddress,
  normalizeAddress,
  saveServerAddress,
  saveToken,
} from "../src/lib/settings.ts";

const fetchStub = (status: number, body: unknown) => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const impl = async (url: string, init?: RequestInit): Promise<Response> => {
    calls.push({ url, init });
    return new Response(JSON.stringify(body), { status });
  };
  return { impl, calls };
};

describe("settings（本地设置）", () => {
  afterEach(() => {
    globalThis.localStorage?.clear();
  });

  it("服务器地址保存时归一（去首尾空格与尾斜杠）", () => {
    saveServerAddress(" http://srv:3000/// ");
    expect(getServerAddress()).toBe("http://srv:3000");
    expect(normalizeAddress("  http://x/ ")).toBe("http://x");
  });

  it("token 保存后 authHeader 携带 Bearer，清除后为空", () => {
    saveToken("jwt-1", "adui");
    expect(authHeader()).toEqual({ authorization: "Bearer jwt-1" });
    clearToken();
    expect(authHeader()).toEqual({});
  });
});

describe("云端请求层（绝对基址）", () => {
  afterEach(() => {
    globalThis.localStorage?.clear();
  });

  it("buildUrl 拼接基址与路径；未配置时显式报错", () => {
    expect(buildUrl("http://srv:3000/", "/api/v1/runs")).toBe("http://srv:3000/api/v1/runs");
    expect(() => buildUrl("  ", "/api/v1/runs")).toThrow("未配置服务器地址");
  });

  it("login 走 POST /auth/login 并返回结果", async () => {
    saveServerAddress("http://srv");
    const { impl, calls } = fetchStub(200, {
      userId: "u1",
      username: "adui",
      accessToken: "jwt-2",
    });
    const result = await login("adui", "pw", impl);
    expect(result.accessToken).toBe("jwt-2");
    expect(calls[0]?.url).toBe("http://srv/api/v1/auth/login");
    expect(calls[0]?.init?.method).toBe("POST");
  });

  it("fetchHealth 命中 /health；非 2xx 抛错", async () => {
    const ok = fetchStub(200, { status: "ok", db: "postgres" });
    const health = await fetchHealth("http://srv/", ok.impl);
    expect(health.db).toBe("postgres");
    expect(ok.calls[0]?.url).toBe("http://srv/api/v1/health");

    const bad = fetchStub(503, { message: "down" });
    await expect(fetchHealth("http://srv", bad.impl)).rejects.toThrow("down");
  });

  it("token 存在时请求自动带 authorization", async () => {
    saveServerAddress("http://srv");
    saveToken("jwt-3", "adui");
    const { impl, calls } = fetchStub(200, []);
    await fetchCloudRuns(impl);
    const headers = calls[0]?.init?.headers as Record<string, string>;
    expect(headers.authorization).toBe("Bearer jwt-3");
    expect(calls[0]?.url).toBe("http://srv/api/v1/runs");
  });
});
