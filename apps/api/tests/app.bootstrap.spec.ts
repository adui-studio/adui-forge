import { spawn } from "node:child_process";
import { describe, it } from "vite-plus/test";

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
  it("boots the real API and serves /health", { timeout: 300_000 }, async () => {
    // 端口选择：CI（linux）用默认 3999；Windows 上 winnat 动态保留范围
    // （netsh excludedportrange）可能恰好盖住 3999 导致 EACCES，故 win32
    // 默认换 4460；两者都可经 SMOKE_PORT 显式覆盖。
    const port = Number(process.env.SMOKE_PORT ?? (process.platform === "win32" ? "4460" : "3999"));
    const child = spawn("pnpm exec tsx src/main.ts", {
      cwd: process.cwd(),
      shell: true,
      detached: process.platform !== "win32",
      env: { ...process.env, PORT: String(port) },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdoutText = "";
    let stderrText = "";
    child.stdout?.on("data", (chunk: Buffer) => {
      stdoutText += String(chunk);
    });
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
      for (let attempt = 0; attempt < 240 && !healthy; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        try {
          const response = await fetch(`http://localhost:${port}/api/v1/health`);
          if (response.status === 200) {
            healthy = true;
          }
        } catch {
          // 未就绪，继续轮询
        }
        // 子进程提前退出（装配崩溃）：立即失败并带出输出，不傻等轮询
        if (child.exitCode !== null && !healthy) {
          throw new Error(
            `API process exited early (code ${String(child.exitCode)}). ` +
              `stdout:\n${stdoutText.slice(-1500)}\nstderr:\n${stderrText.slice(-1500)}`,
          );
        }
      }
      if (!healthy) {
        throw new Error(
          `API did not become healthy in 120s. ` +
            `stdout:\n${stdoutText.slice(-1500)}\nstderr:\n${stderrText.slice(-1500)}`,
        );
      }

      // 路由注册冒烟：健康只证明模块装配，以下证明新增域的路由真实可达
      // （200 = 存在且可用；404 = 服务端显式降级语义，同样证明路由已注册；
      //   两者之外的断言失败即路由缺失/装饰器错误）。
      const routeChecks: Array<{ path: string; allowed: number[] }> = [
        { path: "/api/v1/memory/enabled", allowed: [200] },
        { path: "/api/v1/approvals/history", allowed: [200] },
        { path: "/api/v1/skills/usage", allowed: [200] },
        { path: "/api/v1/comparisons/stats", allowed: [200] },
        { path: "/api/v1/workspace/search?q=x", allowed: [200, 404] },
      ];
      for (const route of routeChecks) {
        const response = await fetch(`http://localhost:${port}${route.path}`);
        if (!route.allowed.includes(response.status)) {
          throw new Error(
            `route ${route.path} responded ${String(response.status)} ` +
              `(expected ${route.allowed.join("/")})`,
          );
        }
      }
    } finally {
      cleanup();
    }
  });
});
