import { realpathSync } from "node:fs";
import { resolve, sep } from "node:path";

const isWindows = process.platform === "win32";

const normalizeForCompare = (path: string): string => (isWindows ? path.toLowerCase() : path);

const withTrailingSep = (path: string): string => (path.endsWith(sep) ? path : path + sep);

/**
 * 把 Tool 输入的相对路径解析为 Workspace 内的绝对路径。
 *
 * 三层防御（AGENTS.md §40 / REQUIREMENTS.md §46）：
 * 1. `../` 路径遍历 —— resolve 后立即做包含性检查（目标不存在也拦截）；
 * 2. symlink / junction 指向 Workspace 外 —— realpath 解析后再次检查；
 * 3. 不存在的路径 —— 明确报错，不泄露 Workspace 外文件系统信息。
 */
export const resolveInWorkspace = (root: string, relativePath: string): string => {
  if (typeof relativePath !== "string" || relativePath.length === 0) {
    throw new Error("path must be a non-empty string");
  }

  const rootReal = realpathSync.native(root);
  const rootCompare = normalizeForCompare(withTrailingSep(rootReal));

  const candidate = resolve(rootReal, relativePath);
  if (!normalizeForCompare(withTrailingSep(candidate)).startsWith(rootCompare)) {
    throw new Error(`path escapes workspace boundary: ${relativePath}`);
  }

  let candidateReal: string;
  try {
    candidateReal = realpathSync.native(candidate);
  } catch {
    throw new Error(`path does not exist in workspace: ${relativePath}`);
  }

  if (!normalizeForCompare(withTrailingSep(candidateReal)).startsWith(rootCompare)) {
    throw new Error(`path escapes workspace boundary: ${relativePath}`);
  }

  return candidateReal;
};
