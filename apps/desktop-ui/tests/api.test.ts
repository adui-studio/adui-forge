import { afterEach, describe, expect, it } from "vite-plus/test";
import {
  buildUrl,
  decideLocalApproval,
  fetchCloudRuns,
  fetchHealth,
  fetchLocalPendingApprovals,
  fetchLocalRuns,
  login,
} from "../src/lib/api.ts";
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

describe("本地 Runner 请求（127.0.0.1 + Bearer）", () => {
  afterEach(() => {
    globalThis.localStorage?.clear();
  });

  it("fetchLocalRuns 命中 Runner baseUrl 的 /runs 并带 Bearer", async () => {
    const { impl, calls } = fetchStub(200, [
      { id: "run_1", agentName: "forge-local", task: "t", status: "completed", createdAt: "x" },
    ]);
    const runs = await fetchLocalRuns({ baseUrl: "http://127.0.0.1:52133/", token: "rt-1" }, impl);
    expect(runs).toHaveLength(1);
    expect(calls[0]?.url).toBe("http://127.0.0.1:52133/api/v1/runs");
    expect((calls[0]!.init!.headers as Record<string, string>).authorization).toBe("Bearer rt-1");
  });

  it("无 token 时省略 authorization；非 2xx 读 body.message", async () => {
    const ok = fetchStub(200, []);
    await fetchLocalRuns({ baseUrl: "http://127.0.0.1:1", token: null }, ok.impl);
    expect(ok.calls[0]?.init?.headers).not.toHaveProperty("authorization");

    const bad = fetchStub(503, { message: "local runs unavailable" });
    await expect(
      fetchLocalRuns({ baseUrl: "http://127.0.0.1:1", token: null }, bad.impl),
    ).rejects.toThrow("local runs unavailable");
  });
});

describe("本地审批请求（Trusted Local Mode）", () => {
  afterEach(() => {
    globalThis.localStorage?.clear();
  });

  it("fetchLocalPendingApprovals 命中 /approvals/pending 并带 Bearer", async () => {
    const { impl, calls } = fetchStub(200, [
      {
        id: "appr_1",
        runId: "run_1",
        toolName: "shell_exec",
        input: { command: "echo hi" },
        reason: "requires approval",
        createdAt: "x",
      },
    ]);
    const list = await fetchLocalPendingApprovals(
      { baseUrl: "http://127.0.0.1:52133", token: "rt-1" },
      impl,
    );
    expect(list).toHaveLength(1);
    expect(calls[0]?.url).toBe("http://127.0.0.1:52133/api/v1/approvals/pending");
    expect((calls[0]!.init!.headers as Record<string, string>).authorization).toBe("Bearer rt-1");
  });

  it("decideLocalApproval POST 决策（含 id 编码）", async () => {
    const { impl, calls } = fetchStub(200, { ok: true, decision: "approved" });
    const result = await decideLocalApproval(
      { baseUrl: "http://127.0.0.1:1", token: null },
      "appr x/1",
      "approved",
      impl,
    );
    expect(result.ok).toBe(true);
    expect(calls[0]?.url).toBe("http://127.0.0.1:1/api/v1/approvals/appr%20x%2F1/decision");
    expect(calls[0]?.init?.method).toBe("POST");
    expect(calls[0]?.init?.body).toBe(JSON.stringify({ decision: "approved" }));
  });

  it("503（未启用 Trusted Local Mode）抛出 Runner 的降级消息", async () => {
    const bad = fetchStub(503, { message: "approvals unavailable: trusted local mode disabled" });
    await expect(
      fetchLocalPendingApprovals({ baseUrl: "http://127.0.0.1:1", token: null }, bad.impl),
    ).rejects.toThrow("approvals unavailable");
  });
});
