import { describe, expect, it } from "vite-plus/test";
import { PrismaRunStore } from "../src/runs/prisma-run.store";

// 需要 DATABASE_URL 指向可写的 PostgreSQL（infra/docker-compose.yml 提供）；
// 未配置时整组跳过，不阻塞常规验收。
const databaseUrl = process.env.DATABASE_URL;

describe.skipIf(databaseUrl === undefined || databaseUrl === "")("PrismaRunStore", () => {
  it("create / update / get / list roundtrip against a real database", async () => {
    const store = new PrismaRunStore();
    const id = `run_spec_${globalThis.crypto.randomUUID().slice(0, 8)}`;

    const created = await store.create({ id, agentName: "forge-dev", task: "spec" });
    expect(created.status).toBe("queued");

    await store.update(id, {
      status: "completed",
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      events: [{ name: "run.completed", runId: id, timestamp: new Date().toISOString() }],
    });

    const finished = await store.get(id);
    expect(finished?.status).toBe("completed");
    expect(finished?.events).toHaveLength(1);

    const list = await store.list();
    expect(list.some((run) => run.id === id)).toBe(true);

    expect(await store.update("no_such_run", { status: "failed" })).toBeUndefined();
    expect(await store.get("no_such_run")).toBeUndefined();
  });
});
