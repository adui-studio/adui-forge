import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";
import {
  createGitPushTool,
  createGitTools,
  createShellExecTool,
  HostSandbox,
  type Sandbox,
} from "../src/index.ts";

let workspace: string;
const sandbox: Sandbox = new HostSandbox();

const runTool = async (toolName: string, input: unknown): Promise<unknown> => {
  const tool = gitTools.find((candidate) => candidate.name === toolName);
  if (tool === undefined) {
    throw new Error(`missing tool ${toolName}`);
  }
  // 与真实 Agent Loop 一致：执行前先经过 inputSchema 校验（default 生效）
  const parsed = tool.inputSchema.parse(input);
  return tool.execute(parsed, {
    runId: "run_test",
    signal: new AbortController().signal,
  });
};

let gitTools: ReturnType<typeof createGitTools>;
let shellTool: ReturnType<typeof createShellExecTool>;

beforeAll(async () => {
  workspace = mkdtempSync(join(tmpdir(), "tool-sdk-shell-"));
  writeFileSync(join(workspace, "a.txt"), "hello\n");
  await sandbox.execFile("git", ["init"], { cwd: workspace, timeoutMs: 10_000 });
  await sandbox.execFile("git", ["config", "user.email", "forge@test"], {
    cwd: workspace,
    timeoutMs: 10_000,
  });
  await sandbox.execFile("git", ["config", "user.name", "forge"], {
    cwd: workspace,
    timeoutMs: 10_000,
  });
  gitTools = createGitTools({ sandbox, workspaceRoot: workspace });
  shellTool = createShellExecTool({ sandbox, workspaceRoot: workspace });
});

afterAll(() => {
  // tmpdir 由系统回收
});

describe("HostSandbox", () => {
  it("captures exitCode, stdout and stderr", async () => {
    const result = await sandbox.execFile(process.execPath, ["-e", "console.log('out')"], {
      cwd: workspace,
      timeoutMs: 10_000,
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("out");
  });

  it("truncates output beyond the byte cap and kills the process", async () => {
    const result = await sandbox.execFile(
      process.execPath,
      ["-e", "process.stdout.write('x'.repeat(100000))"],
      { cwd: workspace, timeoutMs: 10_000, maxOutputBytes: 1000 },
    );
    expect(result.truncated).toBe(true);
    expect(result.stdout.length).toBeLessThanOrEqual(1000);
  });

  it("kills processes that exceed the timeout", async () => {
    const result = await sandbox.execFile(
      process.execPath,
      ["-e", "setTimeout(() => {}, 30_000)"],
      { cwd: workspace, timeoutMs: 500 },
    );
    expect(result.signal).toBeDefined();
  });
});

describe("shell_exec", () => {
  it("always requires approval", () => {
    expect(shellTool.permission).toBe("approval");
  });

  it("runs a command inside the workspace and reports the exit code", async () => {
    const output = (await shellTool.execute(
      { command: "echo sandbox-ok", cwd: "." },
      { runId: "run_test", signal: new AbortController().signal },
    )) as string;
    expect(output).toContain("exitCode: 0");
    expect(output).toContain("sandbox-ok");
  });

  it("rejects a cwd outside the workspace", async () => {
    await expect(
      shellTool.execute(
        { command: "echo hi", cwd: "../outside" },
        { runId: "run_test", signal: new AbortController().signal },
      ),
    ).rejects.toThrow("escapes workspace boundary");
  });
});

describe("git tools", () => {
  it("read tools are free, write tools require approval", () => {
    for (const name of ["git_status", "git_log", "git_diff"]) {
      const tool = gitTools.find((candidate) => candidate.name === name);
      expect(tool?.permission).toBe("free");
    }
    for (const name of ["git_add", "git_commit"]) {
      const tool = gitTools.find((candidate) => candidate.name === name);
      expect(tool?.permission).toBe("approval");
    }
  });

  it("status / add / commit / log form a working loop", async () => {
    const statusBefore = (await runTool("git_status", {})) as string;
    expect(statusBefore).toContain("?? a.txt");

    const addResult = (await runTool("git_add", { paths: ["a.txt"] })) as string;
    expect(addResult).toContain("exitCode: 0");

    const commitResult = (await runTool("git_commit", { message: "feat: add a.txt" })) as string;
    expect(commitResult).toContain("exitCode: 0");

    const log = (await runTool("git_log", {})) as string;
    expect(log).toContain("feat: add a.txt");
  });

  it("diff shows unstaged changes", async () => {
    writeFileSync(join(workspace, "a.txt"), "hello world\n");
    const diff = (await runTool("git_diff", {})) as string;
    expect(diff).toContain("hello world");
  });
});

describe("git_push", () => {
  it("requires approval and rejects option injection", async () => {
    const remote = mkdtempSync(join(tmpdir(), "tool-sdk-remote-"));
    const pushTool = createGitPushTool({ sandbox, workspaceRoot: workspace });
    expect(pushTool.permission).toBe("approval");
    await expect(
      pushTool.execute(
        { remote: "--upload-pack=evil", branch: "main" },
        { runId: "run_test", signal: new AbortController().signal },
      ),
    ).rejects.toThrow("must not contain options");
    void remote;
  });
});
