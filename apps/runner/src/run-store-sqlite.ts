import type { RunnerRunPersistence, RunnerRunRecord } from "./runs.ts";

const isBun = (): boolean => typeof (globalThis as { Bun?: unknown }).Bun !== "undefined";

/**
 * SQLite 持久化工厂（ADR-010）：bun:sqlite 仅存在于 Bun 运行时——
 * sidecar（bun build --compile）下返回真实实现；Node/tsx 开发态返回 null
 * （调用方回退内存，显式降级不静默）。动态 import 避免在 Node 下解析
 * bun: 模块协议失败。
 */
export const createSqliteRunPersistence = async (
  file: string,
): Promise<RunnerRunPersistence | null> => {
  if (!isBun()) {
    return null;
  }
  const moduleId = "bun:sqlite";
  const { Database } = (await import(/* @vite-ignore */ moduleId)) as {
    Database: new (path: string) => {
      exec(sql: string): void;
      prepare(sql: string): {
        run(...params: unknown[]): unknown;
        all(...params: unknown[]): unknown[];
      };
      close(): void;
    };
  };
  const db = new Database(file);
  db.exec(`
    CREATE TABLE IF NOT EXISTS runner_runs (
      id         TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      payload    TEXT NOT NULL
    )
  `);

  return {
    upsert(record: RunnerRunRecord): void {
      db.prepare(
        `INSERT INTO runner_runs (id, created_at, payload) VALUES (?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET payload = excluded.payload`,
      ).run(record.id, record.createdAt, JSON.stringify(record));
    },
    loadAll(): RunnerRunRecord[] {
      const rows = db.prepare("SELECT payload FROM runner_runs ORDER BY created_at DESC").all();
      return rows
        .map((row) => JSON.parse((row as { payload: string }).payload) as RunnerRunRecord)
        .filter((record) => typeof record?.id === "string");
    },
    close(): void {
      db.close();
    },
  };
};
