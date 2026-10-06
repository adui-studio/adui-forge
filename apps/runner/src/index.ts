import { buildLocalAgents } from "./agents.ts";
import { RunnerApprovalService } from "./approvals.ts";
import { createSqliteRunPersistence } from "./run-store-sqlite.ts";
import { RunnerRunService } from "./runs.ts";
import { buildServer } from "./server.ts";

/** Local Runner 入口（ADR-005/006）：
 *  - FORGE_WORKSPACE_ROOT / RUNNER_TOKEN / RUNNER_PORT / FORGE_TRUSTED_LOCAL_MODE
 *    由 Desktop Shell 注入；
 *  - 仅监听 127.0.0.1；workspace root 未配置时显式拒绝启动。 */
const root = process.env.FORGE_WORKSPACE_ROOT;
if (root === undefined || root === "") {
  console.error("FORGE_WORKSPACE_ROOT is required; refusing to start (explicit, not silent)");
  process.exit(1);
}

const token = process.env.RUNNER_TOKEN;
const port = Number(process.env.RUNNER_PORT ?? 0);

const trustedLocalMode = process.env.FORGE_TRUSTED_LOCAL_MODE === "1";
if (trustedLocalMode) {
  console.warn("Trusted Local Mode enabled: runner agent has shell/git via HostSandbox (ADR-006)");
}

const approvals = new RunnerApprovalService();
const agents = buildLocalAgents({
  workspaceRoot: root,
  trustedLocalMode,
  createPending: (request) => approvals.createPending(request),
});

// 运行持久化（ADR-010）：FORGE_RUNNER_DB 由 Desktop Shell 注入
// （app_data_dir/runner-runs.db）；未注入或 Node/tsx 开发态回退内存。
const dbPath = process.env.FORGE_RUNNER_DB;
const persistence =
  dbPath === undefined || dbPath === "" ? null : await createSqliteRunPersistence(dbPath);
if (dbPath !== undefined && dbPath !== "" && persistence === null) {
  console.warn("FORGE_RUNNER_DB set but sqlite unavailable (non-Bun runtime); runs are in-memory");
}
const runs = agents === null ? undefined : new RunnerRunService(agents, persistence ?? undefined);
if (runs === undefined) {
  console.warn("FORGE_MODEL_* not configured; local runs disabled (workspace-only mode)");
}

const server = await buildServer({ root, token, runs, approvals });
server.listen({ host: "127.0.0.1", port }, (error, address) => {
  if (error !== null) {
    console.error(`runner failed to start: ${error.message}`);
    process.exit(1);
  }
  console.log(`runner listening on ${address}`);
});
