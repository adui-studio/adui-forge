import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";
import { createFileTools, resolveInWorkspace } from "../src/index.ts";
import { ToolRegistry } from "../src/registry.ts";

let workspace: string;
let outside: string;
let tools: ReturnType<typeof createFileTools>;

const runTool = async (name: string, input: unknown): Promise<unknown> => {
  const tool = tools.find((candidate) => candidate.name === name);
  if (tool === undefined) {
    throw new Error(`missing tool ${name}`);
  }
  return tool.execute(input as never, { runId: "run_test", signal: new AbortController().signal });
};

const expectToolError = async (name: string, input: unknown, messagePart: string) => {
  await expect(runTool(name, input)).rejects.toThrow(messagePart);
};

beforeAll(() => {
  workspace = mkdtempSync(join(tmpdir(), "tool-sdk-ws-"));
  outside = mkdtempSync(join(tmpdir(), "tool-sdk-out-"));
  mkdirSync(join(workspace, "src"));
  writeFileSync(join(workspace, "src", "index.ts"), 'export const answer = "forge";\n');
  writeFileSync(join(workspace, "README.md"), "# demo workspace\nsearchable token here\n");
  // 外部敏感文件：任何路径都不允许读到它
  writeFileSync(join(outside, "secret.txt"), "TOPSECRET");

  tools = createFileTools({ root: workspace });
});

afterAll(() => {
  // tmpdir 由系统回收，无需精确清理
});

describe("resolveInWorkspace", () => {
  it("resolves paths inside the workspace", () => {
    expect(resolveInWorkspace(workspace, "src/index.ts")).toContain("src");
  });

  it("rejects ../ traversal outside the workspace", () => {
    const outsideRelative = join("..", outside.split(/[\\/]/).at(-1) ?? "out", "secret.txt");
    expect(() => resolveInWorkspace(workspace, outsideRelative)).toThrow(
      "escapes workspace boundary",
    );
  });

  it("rejects deep traversal that lands back inside is allowed only if it stays inside", () => {
    // src/../../<ws-name>/README.md 真实落点仍在 workspace 内 → 放行
    expect(() => resolveInWorkspace(workspace, "src/../README.md")).not.toThrow();
  });

  it("rejects symlink/junction escape to outside", () => {
    const link = join(workspace, "leak");
    try {
      symlinkSync(outside, link, process.platform === "win32" ? "junction" : "dir");
    } catch {
      // 无 symlink/junction 权限的环境跳过该用例
      return;
    }
    expect(() => resolveInWorkspace(workspace, "leak/secret.txt")).toThrow(
      "escapes workspace boundary",
    );
  });

  it("rejects non-existent paths", () => {
    expect(() => resolveInWorkspace(workspace, "nope/missing.txt")).toThrow("path does not exist");
  });
});

describe("read_file", () => {
  it("reads a file inside the workspace", async () => {
    const content = (await runTool("read_file", { path: "src/index.ts" })) as string;
    expect(content).toContain("forge");
  });

  it("rejects traversal attempts", async () => {
    await expectToolError("read_file", { path: "../secret.txt" }, "escapes workspace boundary");
  });

  it("rejects directories", async () => {
    await expectToolError("read_file", { path: "src" }, "not a file");
  });
});

describe("list_files", () => {
  it("lists workspace files recursively", async () => {
    const listing = (await runTool("list_files", { path: "." })) as string;
    expect(listing).toContain("src/");
    expect(listing).toContain("src/index.ts");
    expect(listing).toContain("README.md");
    expect(listing).not.toContain("secret.txt");
  });
});

describe("search_files", () => {
  it("finds case-insensitive matches with path:line format", async () => {
    const result = (await runTool("search_files", { query: "SEARCHABLE", path: "." })) as string;
    expect(result).toContain("README.md:2:");
  });

  it("treats query as plain text, not regex", async () => {
    writeFileSync(join(workspace, "regex.txt"), "a.value( here\n");
    const result = (await runTool("search_files", { query: ".value(", path: "." })) as string;
    expect(result).toContain("regex.txt:1:");
  });
});

describe("ToolRegistry", () => {
  it("registers, lists and rejects duplicates", () => {
    const registry = new ToolRegistry();
    registry.registerAll(tools);
    expect(registry.list()).toHaveLength(3);
    expect(registry.get("read_file")?.name).toBe("read_file");
    expect(() => registry.register(tools[0])).toThrow("already registered");
  });
});
