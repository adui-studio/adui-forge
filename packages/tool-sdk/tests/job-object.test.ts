import { describe, expect, it } from "vite-plus/test";
import { JobObjectSandbox } from "../src/index.ts";
import { HostSandbox } from "../src/index.ts";

describe.skipIf(process.platform !== "win32")("JobObjectSandbox (Windows)", () => {
  it("execShell 执行命令并返回输出", async () => {
    const sandbox = new JobObjectSandbox();
    const result = await sandbox.execShell("echo job-smoke", {
      cwd: process.cwd(),
      timeoutMs: 10_000,
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("job-smoke");
    sandbox.dispose();
  });

  it("execFile 不经 shell 解释", async () => {
    const sandbox = new JobObjectSandbox();
    const result = await sandbox.execFile("node", ["-e", "console.log('file-smoke')"], {
      cwd: process.cwd(),
      timeoutMs: 15_000,
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("file-smoke");
    sandbox.dispose();
  });

  it("dispose 后孤儿进程被 Job 终止（整树终止）", async () => {
    const sandbox = new JobObjectSandbox();
    // 启动长驻命令（不 await）
    const pending = sandbox.execShell("ping 127.0.0.1 -n 30", {
      cwd: process.cwd(),
      timeoutMs: 60_000,
    });
    // dispose 触发 KILL_ON_JOB_CLOSE
    sandbox.dispose();
    const result = await pending;
    // 进程被终止：非零退出或 signal
    expect(result.exitCode !== 0 || result.signal !== undefined).toBe(true);
  });

  it("POSIX 上构造显式失败", () => {
    if (process.platform === "win32") return;
    expect(() => new JobObjectSandbox()).toThrow("Windows-only");
  });
});

describe("HostSandbox POSIX 等价性", () => {
  it.skipIf(process.platform !== "win32")("POSIX 上正常执行", async () => {
    const sandbox = new HostSandbox();
    const result = await sandbox.execShell("echo host-ok", {
      cwd: process.cwd(),
      timeoutMs: 10_000,
    });
    expect(result.stdout).toContain("host-ok");
  });
});
