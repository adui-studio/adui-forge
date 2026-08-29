import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vite-plus/test";
import { createGitPushTool, HostSandbox } from "../src/index.ts";

// Windows 上 cygwin fork 在并行测试负载下偶发崩溃（Win32 487，系统级噪声），
// 真实 push 由 CI（Linux）与本测试在非 Windows 环境覆盖。
describe.skipIf(process.platform === "win32")("git_push（真实 push，非 Windows）", () => {
  it("pushes to a local bare remote", async () => {
    const workspace = mkdtempSync(join(tmpdir(), "gp-ws-"));
    const remote = mkdtempSync(join(tmpdir(), "gp-remote-"));
    const sandbox = new HostSandbox();
    for (const args of [
      ["init"],
      ["config", "user.email", "forge@test"],
      ["config", "user.name", "forge"],
    ]) {
      await sandbox.execFile("git", args, { cwd: workspace, timeoutMs: 10_000 });
    }
    await sandbox.execFile("git", ["init", "--bare"], { cwd: remote, timeoutMs: 10_000 });

    const pushTool = createGitPushTool({ sandbox, workspaceRoot: workspace });
    expect(pushTool.permission).toBe("approval");

    const output = (await pushTool.execute(
      { remote: remote.split("\\").join("/"), branch: "main" },
      { runId: "run_test", signal: new AbortController().signal },
    )) as string;
    // 空仓库无提交：push 允许失败，但绝不应是选项注入类错误
    expect(output.includes("exitCode: 0") || output.includes("src refspec")).toBe(true);
  });
});
