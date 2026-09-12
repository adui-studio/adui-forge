import { buildServer } from "./server.ts";

/** Local Runner 入口（ADR-005）：
 *  - FORGE_WORKSPACE_ROOT / RUNNER_TOKEN / RUNNER_PORT 由 Desktop Shell 注入；
 *  - 仅监听 127.0.0.1；workspace root 未配置时显式拒绝启动。 */
const root = process.env.FORGE_WORKSPACE_ROOT;
if (root === undefined || root === "") {
  console.error("FORGE_WORKSPACE_ROOT is required; refusing to start (explicit, not silent)");
  process.exit(1);
}

const token = process.env.RUNNER_TOKEN;
const port = Number(process.env.RUNNER_PORT ?? 0);

const server = buildServer({ root, token });
server.listen({ host: "127.0.0.1", port }, (error, address) => {
  if (error !== null) {
    console.error(`runner failed to start: ${error.message}`);
    process.exit(1);
  }
  console.log(`runner listening on ${address}`);
});
