import { z } from "zod";
import { defineTool } from "./define.ts";
import { resolveInWorkspace } from "./fs/boundary.ts";
import type { ExecResult, Sandbox } from "./sandbox/sandbox.ts";

export interface ShellExecToolOptions {
  sandbox: Sandbox;
  workspaceRoot: string;
  /** 单命令超时上限，默认 60s，最大 600s。 */
  defaultTimeoutMs?: number;
  maxOutputBytes?: number;
}

export const formatExecResult = (result: ExecResult): string => {
  const parts = [
    `exitCode: ${result.exitCode}${result.signal ? ` (signal: ${result.signal})` : ""}`,
    `stdout:\n${result.stdout}`,
  ];
  if (result.stderr.length > 0) {
    parts.push(`stderr:\n${result.stderr}`);
  }
  if (result.truncated) {
    parts.push("(output truncated)");
  }
  return parts.join("\n");
};

/**
 * Shell 执行工具。
 *
 * permission 恒为 approval（REQUIREMENTS.md §48：高风险 Shell 必须人工审批），
 * 执行必须经由 Sandbox——构造方未提供 Sandbox 就不会有这个工具。
 */
export const createShellExecTool = (options: ShellExecToolOptions) => {
  const defaultTimeoutMs = options.defaultTimeoutMs ?? 60_000;

  return defineTool({
    name: "shell_exec",
    description:
      "Run a shell command inside the workspace sandbox. Returns exitCode, stdout and stderr. " +
      "Requires human approval before execution.",
    permission: "approval",
    inputSchema: z.object({
      command: z.string().min(1).max(4_000).describe("shell command to run"),
      cwd: z.string().min(1).default(".").describe("workspace-relative working directory"),
      timeoutMs: z
        .number()
        .int()
        .positive()
        .max(600_000)
        .optional()
        .describe("per-command timeout in milliseconds"),
    }),
    execute: async (input, context) => {
      const cwd = resolveInWorkspace(options.workspaceRoot, input.cwd);
      const result = await options.sandbox.execShell(input.command, {
        cwd,
        timeoutMs: input.timeoutMs ?? defaultTimeoutMs,
        signal: context.signal,
        maxOutputBytes: options.maxOutputBytes,
      });
      return formatExecResult(result);
    },
  });
};
