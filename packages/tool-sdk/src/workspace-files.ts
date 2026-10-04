import { readdirSync, readFileSync, rmSync, statSync, writeFileSync, type Dirent } from "node:fs";
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

/** 搜索时跳过的目录（依赖与版本库元数据规模过大且无检索价值）。 */
const SEARCH_SKIP_DIRECTORIES = new Set([".git", "node_modules"]);
const MAX_SEARCH_FILE_BYTES = 512 * 1024;
const MAX_SEARCH_FILES = 2000;
const MAX_SEARCH_MATCHES = 100;
const MAX_SEARCH_LINE_CHARS = 200;

export interface WorkspaceSearchMatch {
  path: string;
  kind: "filename" | "content";
  /** content 命中时的 1-based 行号。 */
  line?: number;
  /** content 命中时的行文本（trim 后截断）。 */
  text?: string;
}

export interface WorkspaceSearchResult {
  query: string;
  matches: WorkspaceSearchMatch[];
  /** 命中数或扫描文件数达到上限时为 true。 */
  truncated: boolean;
}

/**
 * Workspace 内容/文件名搜索（ADR-004）：文件名不区分大小写包含匹配，
 * 文本文件逐行内容匹配（跳过二进制扩展名、.git/node_modules、超大文件）。
 * 同步实现与同文件其余助手一致；上限兜底防止大工作区拖垮请求。
 */
export const searchWorkspace = (root: string, rawQuery: string): WorkspaceSearchResult => {
  const query = rawQuery.trim();
  if (query === "") {
    return { query, matches: [], truncated: false };
  }
  const lowerQuery = query.toLowerCase();
  const rootAbsolute = resolveInWorkspace(root, ".");
  const matches: WorkspaceSearchMatch[] = [];
  let truncated = false;
  let scanned = 0;

  const walk = (relativeDir: string): void => {
    let entries: Dirent<string>[];
    try {
      entries = readdirSync(join(rootAbsolute, relativeDir), { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (matches.length >= MAX_SEARCH_MATCHES) {
        truncated = true;
        return;
      }
      const relativePath = relativeDir === "" ? entry.name : `${relativeDir}/${entry.name}`;
      if (entry.isDirectory()) {
        if (!SEARCH_SKIP_DIRECTORIES.has(entry.name)) {
          walk(relativePath);
        }
        continue;
      }
      if (scanned >= MAX_SEARCH_FILES) {
        truncated = true;
        return;
      }
      scanned += 1;
      const dot = entry.name.lastIndexOf(".");
      const extension = dot === -1 ? "" : entry.name.slice(dot).toLowerCase();
      if (BINARY_EXTENSIONS.has(extension)) continue;
      if (entry.name.toLowerCase().includes(lowerQuery)) {
        matches.push({ path: relativePath, kind: "filename" });
      }
      const absolute = join(rootAbsolute, relativePath);
      if (statSync(absolute).size > MAX_SEARCH_FILE_BYTES) continue;
      let content: string;
      try {
        content = readFileSync(absolute, "utf8");
      } catch {
        continue;
      }
      const lines = content.split("\n");
      for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index] ?? "";
        if (line.toLowerCase().includes(lowerQuery)) {
          matches.push({
            path: relativePath,
            kind: "content",
            line: index + 1,
            text: line.trim().slice(0, MAX_SEARCH_LINE_CHARS),
          });
          if (matches.length >= MAX_SEARCH_MATCHES) {
            truncated = true;
            return;
          }
        }
      }
    }
  };

  walk("");
  return { query, matches, truncated };
};
