import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vite-plus/test";
import { WorkspaceGitService } from "../src/workspace/workspace-git.service";

const makeRepo = (): string => {
  const root = mkdtempSync(join(tmpdir(), "git-ws-"));
  const git = (args: string[]): void => {
    execFileSync("git", args, { cwd: root });
  };
  git(["init"]);
  git(["config", "user.email", "test@forge.local"]);
  git(["config", "user.name", "forge-test"]);
  writeFileSync(join(root, "a.txt"), "hello\n");
  git(["add", "a.txt"]);
  git(["commit", "-m", "init"]);
  writeFileSync(join(root, "a.txt"), "hello changed\n");
  writeFileSync(join(root, "b.txt"), "new file\n");
  return root;
};

describe("WorkspaceGitService", () => {
  it("status 返回分支与 porcelain 变更", async () => {
    const service = new WorkspaceGitService(makeRepo());
    const status = await service.status();
    expect(status.branch).toBe("master");
    const paths = status.changes.map((change) => change.path);
    expect(paths).toContain("a.txt");
    expect(paths).toContain("b.txt");
  });

  it("diff 返回已跟踪文件的差异；commit 提交后 status 清空", async () => {
    const root = makeRepo();
    const service = new WorkspaceGitService(root);
    const diff = await service.diff("a.txt");
    expect(diff).toContain("hello changed");

    const result = await service.commit("feat: update a and add b", ["a.txt", "b.txt"]);
    expect(result.commit).toContain("master");
    const status = await service.status();
    expect(status.changes).toHaveLength(0);
  });

  it("空提交信息 / 空路径显式拒绝；逃逸路径被边界拦截", async () => {
    const service = new WorkspaceGitService(makeRepo());
    await expect(service.commit("  ", ["a.txt"])).rejects.toThrow("message is required");
    await expect(service.commit("msg", [])).rejects.toThrow("at least one file");
    await expect(service.commit("msg", ["../outside.txt"])).rejects.toThrow(
      "escapes workspace boundary",
    );
  });

  it("未配置根目录时显式不可用", async () => {
    const service = new WorkspaceGitService(null);
    await expect(service.status()).rejects.toThrow("FORGE_WORKSPACE_ROOT 未配置");
  });
});
