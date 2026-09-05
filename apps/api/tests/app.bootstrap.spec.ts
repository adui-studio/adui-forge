import { spawn } from "node:child_process";
import { describe, expect, it } from "vite-plus/test";

/**
 * 容器装配冒烟：以真实进程启动 API（PORT=3999），断言健康检查可用。
 * 单元测试直接实例化服务会绕过 Nest 模块扫描，抓不住
 * exports / imports / 注入 token 一类装配错误——本测试专门兜底。
 */
describe("AppModule 装配", () => {
  it("boots the real API and serves /health", { timeout: 120_000 }, async () => {
    const child = spawn("pnpm exec tsx src/main.ts", {
      cwd: process.cwd(),
      shell: true,
      env: { ...process.env, PORT: "3999" },
      stdio: "ignore",
    });

    const cleanup = (): void => {
      if (process.platform === "win32") {
        spawn(`taskkill /F /T /PID ${String(child.pid)}`, { shell: true });
      } else {
        child.kill();
      }
    };
    process.on("exit", cleanup);

    try {
      let healthy = false;
      for (let attempt = 0; attempt < 60 && !healthy; attempt += 1) {
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
      expect(healthy).toBe(true);
    } finally {
      cleanup();
    }
  });
});
