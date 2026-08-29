import { z } from "zod";
import { defineTool } from "./define.ts";
import { formatExecResult } from "./shell-exec.ts";
import type { Sandbox } from "./sandbox/sandbox.ts";

export interface GitPushToolOptions {
  sandbox: Sandbox;
  workspaceRoot: string;
  timeoutMs?: number;
}

/** 值不允许携带 git 选项（防 option injection，如 --upload-pack / --force）。 */
const assertSafeRef = (kind: string, value: string): void => {
  if (value.startsWith("-") || value.includes("--")) {
    throw new Error(`${kind} must not contain options: ${value}`);
  }
};

/**
 * git push 工具（REQUIREMENTS.md §48/49：push 默认审批、禁止 force）。
 * remote / branch 作为 argv 传递，不经 shell。
 */
export const createGitPushTool = (options: GitPushToolOptions) => {
  const timeoutMs = options.timeoutMs ?? 120_000;

  return defineTool({
    name: "git_push",
    description:
      "Push commits to a remote. Requires human approval. Force push is not supported by design.",
    permission: "approval",
    inputSchema: z.object({
      remote: z.string().min(1).default("origin"),
      branch: z.string().min(1),
    }),
    execute: async (input) => {
      assertSafeRef("remote", input.remote);
      assertSafeRef("branch", input.branch);
      if (/force/i.test(input.branch)) {
        throw new Error("force push is rejected by policy");
      }
      const result = await options.sandbox.execFile("git", ["push", input.remote, input.branch], {
        cwd: options.workspaceRoot,
        timeoutMs,
      });
      return formatExecResult(result);
    },
  });
};
