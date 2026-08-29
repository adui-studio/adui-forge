import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vite-plus/test";
import { DockerSandbox } from "../src/sandbox/docker-sandbox.ts";

// 本地无 docker 时跳过（CI / 其他环境自动降级）
const { spawn } = await import("node:child_process");
const dockerAvailable = await new Promise<boolean>((resolve) => {
  const child = spawn("docker", ["version", "--format", "ok"], { shell: false });
  child.on("error", () => resolve(false));
  child.on("close", (code) => resolve(code === 0));
});

// 用本地普遍存在的轻量镜像验证机制，避免测试依赖拉取大镜像；
// 生产默认镜像为 node:22-bookworm（含 git），由 FORGE_SANDBOX_IMAGE 配置。
const TEST_IMAGE = "nginx:1.27.4-alpine";

describe.skipIf(!dockerAvailable)("DockerSandbox", () => {
  it("runs a one-off container with the workspace mounted", async () => {
    const workspaceRoot = mkdtempSync(join(tmpdir(), "forge-docker-"));
    const sandbox = new DockerSandbox({ workspaceRoot, image: TEST_IMAGE });

    const result = await sandbox.execShell("echo container-ok", {
      cwd: workspaceRoot,
      timeoutMs: 60_000,
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("container-ok");
  });

  it("maps the workspace into /workspace and runs from the mapped cwd", async () => {
    const workspaceRoot = mkdtempSync(join(tmpdir(), "forge-docker-"));
    const sub = join(workspaceRoot, "sub");
    const { mkdirSync, writeFileSync } = await import("node:fs");
    mkdirSync(sub);
    writeFileSync(join(sub, "marker.txt"), "mount-ok");
    const sandbox = new DockerSandbox({ workspaceRoot, image: TEST_IMAGE });

    const result = await sandbox.execShell("cat /workspace/sub/marker.txt && pwd", {
      cwd: sub,
      timeoutMs: 60_000,
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("mount-ok");
    expect(result.stdout).toContain("/workspace/sub");
  });

  it("blocks network by default", { timeout: 120_000 }, async () => {
    const workspaceRoot = mkdtempSync(join(tmpdir(), "forge-docker-"));
    const sandbox = new DockerSandbox({ workspaceRoot, image: TEST_IMAGE });

    const result = await sandbox.execShell(
      "wget -T 3 -q -O- https://void.cloud && echo REACHABLE || echo BLOCKED",
      {
        cwd: workspaceRoot,
        timeoutMs: 30_000,
      },
    );

    expect(result.stdout).not.toContain("REACHABLE");
  });
});
