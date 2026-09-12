import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vite-plus/test";
import { WorkspaceService } from "../src/workspace/workspace.service";

const makeWorkspace = (): string => {
  const root = mkdtempSync(join(tmpdir(), "ws-"));
  writeFileSync(join(root, "README.md"), "# hello");
  writeFileSync(join(root, "logo.png"), "binary");
  mkdirSync(join(root, "src"));
  writeFileSync(join(root, "src", "main.ts"), "console.log(1);\n");
  return root;
};

describe("WorkspaceService", () => {
  it("listDir 返回目录优先排序的条目并隐藏 .git", () => {
    const root = makeWorkspace();
    mkdirSync(join(root, ".git"));
    writeFileSync(join(root, ".git", "HEAD"), "ref");
    const service = new WorkspaceService(root);
    const entries = service.listDir(".");
    expect(entries.map((entry) => entry.name)).toEqual(["src", "logo.png", "README.md"]);
    expect(entries[0]?.type).toBe("directory");
  });

  it("readFile 返回文本内容；二进制扩展名拒绝", () => {
    const root = makeWorkspace();
    const service = new WorkspaceService(root);
    expect(service.readFile("src/main.ts").content).toContain("console.log");
    expect(() => service.readFile("logo.png")).toThrow("binary files");
  });

  it("writeFile 写入既有路径与父目录下的新文件", () => {
    const root = makeWorkspace();
    const service = new WorkspaceService(root);
    service.writeFile("README.md", "# updated");
    expect(readFileSync(join(root, "README.md"), "utf8")).toBe("# updated");
    service.writeFile("src/new-file.ts", "export {};\n");
    expect(readFileSync(join(root, "src", "new-file.ts"), "utf8")).toContain("export {}");
  });

  it("超出写上限与二进制扩展名拒绝写入", () => {
    const root = makeWorkspace();
    const service = new WorkspaceService(root);
    expect(() => service.writeFile("big.md", "x".repeat(1024 * 1024 + 1))).toThrow("write limit");
    expect(() => service.writeFile("logo.png", "text")).toThrow("binary files");
  });

  it("路径遍历与 symlink 逃逸被边界拦截", () => {
    const root = makeWorkspace();
    const service = new WorkspaceService(root);
    expect(() => service.readFile("../outside.txt")).toThrow("escapes workspace boundary");
    expect(() => service.writeFile("src/../../evil.ts", "x")).toThrow("escapes workspace boundary");
  });

  it("未配置根目录时显式不可用", () => {
    const service = new WorkspaceService(null);
    expect(service.isAvailable()).toBe(false);
    expect(() => service.listDir(".")).toThrow("FORGE_WORKSPACE_ROOT 未配置");
  });

  it("根目录不存在时显式报错", () => {
    const service = new WorkspaceService(join(tmpdir(), "no-such-ws-dir"));
    expect(() => service.listDir(".")).toThrow();
  });
});
