export { defineTool, type ToolDefinition } from "./define.ts";
export { ToolRegistry } from "./registry.ts";
export { resolveInWorkspace } from "./fs/boundary.ts";
export { createReadFileTool, type ReadFileToolOptions } from "./fs/read-file.ts";
export { createListFilesTool, type ListFilesToolOptions } from "./fs/list-files.ts";
export { createSearchFilesTool, type SearchFilesToolOptions } from "./fs/search-files.ts";

import { createGitTools } from "./git-tools.ts";
import type { Sandbox } from "./sandbox/sandbox.ts";
import { createListFilesTool } from "./fs/list-files.ts";
import { createReadFileTool } from "./fs/read-file.ts";
import { createSearchFilesTool } from "./fs/search-files.ts";
import { createShellExecTool } from "./shell-exec.ts";

/** 创建内置只读文件工具组（read_file / list_files / search_files），全部限定在 root 内。 */
export const createFileTools = (options: { root: string }) => {
  return [
    createReadFileTool(options),
    createListFilesTool(options),
    createSearchFilesTool(options),
  ];
};

/**
 * 创建文件 + Git 工具组。shell / git 写操作经 Sandbox 执行且 permission 为 approval；
 * sandbox 参数必填——没有 Sandbox 就没有进程执行类工具（Sandbox First）。
 */
export const createWorkspaceTools = (options: {
  root: string;
  sandbox: Sandbox;
  shellTimeoutMs?: number;
  gitTimeoutMs?: number;
}) => {
  return [
    ...createFileTools(options),
    ...createGitTools({
      sandbox: options.sandbox,
      workspaceRoot: options.root,
      timeoutMs: options.gitTimeoutMs,
    }),
    createShellExecTool({
      sandbox: options.sandbox,
      workspaceRoot: options.root,
      defaultTimeoutMs: options.shellTimeoutMs,
    }),
  ];
};

export {
  createGitTools,
  createGitReadTools,
  createGitWriteTools,
  type GitToolsOptions,
} from "./git-tools.ts";
export { createShellExecTool, type ShellExecToolOptions } from "./shell-exec.ts";
export { createGitPushTool, type GitPushToolOptions } from "./git-push.ts";
export {
  HostSandbox,
  type Sandbox,
  type SandboxExecOptions,
  type ExecResult,
} from "./sandbox/sandbox.ts";
export { DockerSandbox, type DockerSandboxOptions } from "./sandbox/docker-sandbox.ts";
