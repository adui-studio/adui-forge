import { spawn } from "node:child_process";
import { describe, expect, it } from "vite-plus/test";

/**
 * 容器装配冒烟：以真实进程启动 API（PORT=3999），断言健康检查可用。
 * 单元测试直接实例化服务会绕过 Nest 模块扫描，抓不住
 * exports / imports / 注入 token 一类装配错误——本测试专门兜底。
 *
 * CI 教训：shell:true 下 child.kill() 只杀 shell,tsx 孙进程变孤儿
 * 持有 stdio/端口 —— POSIX 需按进程组树杀(必须 detached 才有独立组)。
 * CI 冷启动慢（pnpm exec tsx 解析 + Nest bootstrap 可超 30s），轮询窗口放宽到 60s，
 * 且 stderr 收集到失败时输出（否则启动崩溃无从诊断）。
 */
describe("AppModule 装配", () => {
  it("boots the real API and serves /health", { timeout: 180_000 }, async () => {
    const child = spawn("pnpm exec tsx src/main.ts", {
      cwd: process.cwd(),
      shell: true,
      detached: process.platform !== "win32",
      env: { ...process.env, PORT: "3999" },
      stdio: ["ignore", "ignore", "pipe"],
    });
    let stderrText = "";
    child.stderr?.on("data", (chunk: Buffer) => {
      stderrText += String(chunk);
    });

    const cleanup = (): void => {
      if (child.pid === undefined) return;
      if (process.platform === "win32") {
        spawn(`taskkill /F /T /PID ${String(child.pid)}`, { shell: true });
      } else {
        try {
          process.kill(-child.pid, "SIGKILL");
        } catch {
          /* 进程组已退出 */
        }
      }
    };
    process.on("exit", cleanup);

    try {
      let healthy = false;
      for (let attempt = 0; attempt < 120 && !healthy; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        try {
          const response = await fetch("http://localhost:3999/api/v1/health");
          if (response.status === 200) {
            healthy = true;
          }
        } catch {
          // 未就绪，继续轮询
        }
      }
      if (!healthy) {
        console.error(`API failed to boot; stderr:\n${stderrText.slice(-2000)}`);
      }
      expect(healthy).toBe(true);
    } finally {
      cleanup();
    }
  });
});
