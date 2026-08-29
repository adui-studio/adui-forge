import { z } from "zod";
import type { AgentTool } from "@adui-forge/contracts";
import { defineTool } from "./define.ts";
import { resolveInWorkspace } from "./fs/boundary.ts";
import { formatExecResult } from "./shell-exec.ts";
import type { Sandbox } from "./sandbox/sandbox.ts";

export interface GitToolsOptions {
  sandbox: Sandbox;
  workspaceRoot: string;
  timeoutMs?: number;
}

const GIT = "git";

const execGit = async (
  sandbox: Sandbox,
  workspaceRoot: string,
  args: string[],
  timeoutMs: number,
): Promise<string> => {
  const result = await sandbox.execFile(GIT, args, { cwd: workspaceRoot, timeoutMs });
  return formatExecResult(result);
};

/**
 * Git 只读工具（status / log / diff）。
 * 只读、无副作用，permission 为 free；全部经 Sandbox execFile（argv 数组，无 shell）。
 */
export const createGitReadTools = (options: GitToolsOptions): AgentTool[] => {
  const timeoutMs = options.timeoutMs ?? 30_000;
  const root = options.workspaceRoot;

  return [
    defineTool({
      name: "git_status",
      description: "Show the working tree status of the workspace repository (porcelain format).",
      permission: "free",
      inputSchema: z.object({}),
      execute: async () =>
        execGit(options.sandbox, root, ["status", "--porcelain=v1", "-b"], timeoutMs),
    }),
    defineTool({
      name: "git_log",
      description: "Show the latest commits (oneline format, newest first).",
      permission: "free",
      inputSchema: z.object({
        limit: z.number().int().positive().max(100).default(20),
      }),
      execute: async (input) =>
        execGit(options.sandbox, root, ["log", "--oneline", `-n`, String(input.limit)], timeoutMs),
    }),
    defineTool({
      name: "git_diff",
      description: "Show unstaged changes, or staged changes with staged: true.",
      permission: "free",
      inputSchema: z.object({
        staged: z.boolean().default(false),
      }),
      execute: async (input) =>
        execGit(options.sandbox, root, ["diff", ...(input.staged ? ["--cached"] : [])], timeoutMs),
    }),
  ];
};

/**
 * Git 写工具（add / commit）。
 * permission 为 approval：写入版本历史属于高风险操作（REQUIREMENTS.md §48/49），
 * 消息与路径一律作为 argv 传递，不经 shell 解释。
 */
export const createGitWriteTools = (options: GitToolsOptions): AgentTool[] => {
  const timeoutMs = options.timeoutMs ?? 30_000;
  const root = options.workspaceRoot;

  return [
    defineTool({
      name: "git_add",
      description: "Stage workspace files for the next commit. Requires human approval.",
      permission: "approval",
      inputSchema: z.object({
        paths: z.array(z.string().min(1)).min(1).max(50).describe("workspace-relative paths"),
      }),
      execute: async (input) => {
        for (const relativePath of input.paths) {
          resolveInWorkspace(root, relativePath);
        }
        return execGit(options.sandbox, root, ["add", "--", ...input.paths], timeoutMs);
      },
    }),
    defineTool({
      name: "git_commit",
      description: "Commit the staged changes with the given message. Requires human approval.",
      permission: "approval",
      inputSchema: z.object({
        message: z.string().min(1).max(2_000),
      }),
      execute: async (input) =>
        execGit(options.sandbox, root, ["commit", "-m", input.message], timeoutMs),
    }),
  ];
};

export const createGitTools = (options: GitToolsOptions): AgentTool[] => {
  return [...createGitReadTools(options), ...createGitWriteTools(options)];
};
