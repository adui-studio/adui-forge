import { readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { resolveInWorkspace } from "./fs/boundary.ts";

/** 单文件写上限（ADR-004 §4：文本写不经过 Sandbox，用大小上限兜底）。 */
export const MAX_WRITE_BYTES = 1024 * 1024;

/** 视为二进制的扩展名：拒绝经文本接口读写。 */
const BINARY_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".ico",
  ".webp",
  ".pdf",
  ".zip",
  ".gz",
  ".tar",
  ".exe",
  ".dll",
  ".so",
  ".dylib",
  ".woff",
  ".woff2",
  ".ttf",
  ".otf",
  ".mp4",
  ".mp3",
]);

export interface WorkspaceEntry {
  name: string;
  type: "file" | "directory";
  size: number;
}

export interface WorkspaceFileContent {
  path: string;
  content: string;
  size: number;
}

const ensureTextFile = (relativePath: string): void => {
  const dot = relativePath.lastIndexOf(".");
  const extension = dot === -1 ? "" : relativePath.slice(dot).toLowerCase();
  if (BINARY_EXTENSIONS.has(extension)) {
    throw new Error(`binary files are not supported via the text API: ${relativePath}`);
  }
};

const readdirEntries = (absolute: string): WorkspaceEntry[] =>
  readdirSync(absolute, { withFileTypes: true })
    .filter((entry) => entry.name !== ".git")
    .map((entry) => {
      const size = entry.isDirectory() ? 0 : statSync(join(absolute, entry.name)).size;
      return {
        name: entry.name,
        type: entry.isDirectory() ? ("directory" as const) : ("file" as const),
        size,
      };
    })
    .sort((a, b) =>
      a.type === b.type ? a.name.localeCompare(b.name) : a.type === "directory" ? -1 : 1,
    );

/**
 * Workspace 纯文件操作（ADR-004/ADR-005）：云端 API 与 Local Runner 共用的唯一实现。
 * 全部以 root 为基准、经 resolveInWorkspace 边界；错误信息即 Error Contract。
 */
export const listWorkspaceDir = (root: string, relativePath: string): WorkspaceEntry[] => {
  const absolute = resolveInWorkspace(root, relativePath);
  if (!statSync(absolute).isDirectory()) {
    throw new Error(`not a directory: ${relativePath}`);
  }
  return readdirEntries(absolute);
};

export const readWorkspaceTextFile = (root: string, relativePath: string): WorkspaceFileContent => {
  ensureTextFile(relativePath);
  const absolute = resolveInWorkspace(root, relativePath);
  if (!statSync(absolute).isFile()) {
    throw new Error(`not a file: ${relativePath}`);
  }
  const content = readFileSync(absolute, "utf8");
  return { path: relativePath, content, size: Buffer.byteLength(content) };
};

export const writeWorkspaceTextFile = (
  root: string,
  relativePath: string,
  content: string,
): WorkspaceFileContent => {
  if (typeof content !== "string") {
    throw new Error("content must be a string");
  }
  if (Buffer.byteLength(content) > MAX_WRITE_BYTES) {
    throw new Error(`file exceeds write limit (${MAX_WRITE_BYTES} bytes)`);
  }
  ensureTextFile(relativePath);
  // 新文件：父目录必须已存在（经边界解析），文件名本身不得含路径分隔符
  if (relativePath.includes("/") || relativePath.includes("\\")) {
    if (basename(relativePath) !== relativePath.split(/[\\/]/).pop()) {
      throw new Error(`invalid file name: ${relativePath}`);
    }
    const parent = resolveInWorkspace(root, dirname(relativePath));
    writeFileSync(join(parent, basename(relativePath)), content, "utf8");
  } else {
    writeFileSync(join(resolveInWorkspace(root, "."), relativePath), content, "utf8");
  }
  return { path: relativePath, content, size: Buffer.byteLength(content) };
};

export const deleteWorkspaceTextFile = (root: string, relativePath: string): void => {
  ensureTextFile(relativePath);
  const absolute = resolveInWorkspace(root, relativePath);
  if (!statSync(absolute).isFile()) {
    throw new Error(`not a file: ${relativePath}`);
  }
  rmSync(absolute);
};
