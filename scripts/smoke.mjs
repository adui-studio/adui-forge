// 部署后冒烟：对已启动的 API（默认 http://localhost:3000）做核心端点断言。
// 用法：先启动 api（pnpm --filter @adui-forge/api start），再执行 pnpm run smoke
const base = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
let failures = 0;

const check = async (name, fn) => {
  try {
    await fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`✗ ${name}: ${error.message}`);
  }
};

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

await check("health 返回 ok", async () => {
  const response = await fetch(`${base}/api/v1/health`);
  const body = await response.json();
  assert(response.status === 200 && body.status === "ok", `status=${response.status}`);
});

await check("openapi.json 可用", async () => {
  const response = await fetch(`${base}/api/v1/openapi.json`);
  const body = await response.json();
  assert(response.status === 200 && body.openapi?.startsWith("3."), `status=${response.status}`);
});

await check("GET /runs 返回数组", async () => {
  const response = await fetch(`${base}/api/v1/runs`);
  const body = await response.json();
  assert(Array.isArray(body), "not an array");
});

await check("未知 Run 显式 404", async () => {
  const response = await fetch(`${base}/api/v1/runs/run_missing`);
  assert(response.status === 404, `status=${response.status}`);
});

await check("未知 agent 的 Run 显式 404（不静默）", async () => {
  const response = await fetch(`${base}/api/v1/runs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ task: "smoke" }),
  });
  assert(response.status === 404, `status=${response.status}`);
});

if (failures > 0) {
  console.error(`\n冒烟失败：${failures} 项`);
  process.exit(1);
}
console.log("\n冒烟全部通过。");
