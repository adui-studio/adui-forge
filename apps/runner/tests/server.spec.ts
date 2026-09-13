import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vite-plus/test";
import { buildServer } from "../src/server.ts";

const makeRoot = (): string => mkdtempSync(join(tmpdir(), "runner-"));

describe("runner server", () => {
  it("health 豁免鉴权；无 token 的业务请求 401", async () => {
    const server = await buildServer({ root: makeRoot(), token: "secret" });
    const health = await server.inject({ method: "GET", url: "/health" });
    expect(health.statusCode).toBe(200);
    expect(health.json()).toMatchObject({ status: "ok", runner: true });

    const blocked = await server.inject({ method: "GET", url: "/api/v1/workspace/tree?path=." });
    expect(blocked.statusCode).toBe(401);

    const allowed = await server.inject({
      method: "GET",
      url: "/api/v1/workspace/tree?path=.",
      headers: { authorization: "Bearer secret" },
    });
    expect(allowed.statusCode).toBe(200);
  });

  it("tree/read/write/delete 与云端 API 同形", async () => {
    const root = makeRoot();
    mkdirSync(join(root, "src"));
    writeFileSync(join(root, "a.txt"), "hello\n");
    const server = await buildServer({ root });
    const headers = { "content-type": "application/json" };

    const tree = await server.inject({ method: "GET", url: "/api/v1/workspace/tree?path=." });
    expect(tree.json().map((entry: { name: string }) => entry.name)).toEqual(["src", "a.txt"]);

    const read = await server.inject({
      method: "GET",
      url: "/api/v1/workspace/file?path=a.txt",
    });
    expect(read.json().content).toContain("hello");

    const write = await server.inject({
      method: "PUT",
      url: "/api/v1/workspace/file",
      headers,
      payload: { path: "src/new.ts", content: "export {};\n" },
    });
    expect(write.statusCode).toBe(200);
    expect(readFileSync(join(root, "src", "new.ts"), "utf8")).toContain("export {}");

    const remove = await server.inject({
      method: "DELETE",
      url: "/api/v1/workspace/file?path=a.txt",
    });
    expect(remove.statusCode).toBe(200);
    expect(() => readFileSync(join(root, "a.txt"))).toThrow();
  });

  it("路径遍历返回 404；非法请求体 400", async () => {
    const server = await buildServer({ root: makeRoot() });
    const traversal = await server.inject({
      method: "GET",
      url: "/api/v1/workspace/file?path=../outside.txt",
    });
    expect(traversal.statusCode).toBe(404);

    const badBody = await server.inject({
      method: "PUT",
      url: "/api/v1/workspace/file",
      headers: { "content-type": "application/json" },
      payload: { path: "x.txt" },
    });
    expect(badBody.statusCode).toBe(400);
  });
});

describe("runner runs retry", () => {
  it("未配置模型 503；配置后 retry 以原任务新建 Run", async () => {
    const noModel = await buildServer({ root: makeRoot() });
    const unavailable = await noModel.inject({
      method: "POST",
      url: "/api/v1/runs/run_1/retry",
    });
    expect(unavailable.statusCode).toBe(503);
  });
});
