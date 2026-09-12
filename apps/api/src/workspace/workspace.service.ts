import { readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { Inject, Injectable } from "@nestjs/common";
import { resolveInWorkspace } from "@adui-forge/tool-sdk";

export const WORKSPACE_ROOT = Symbol("WORKSPACE_ROOT");

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

/** Workspace 文件服务（ADR-004 阶段 1）：tree / read / write，全部经 tool-sdk 边界。 */
@Injectable()
export class WorkspaceService {
  constructor(@Inject(WORKSPACE_ROOT) private readonly root: string | null) {}

  /** 未配置 FORGE_WORKSPACE_ROOT 时显式不可用。 */
  isAvailable(): boolean {
    return this.root !== null && this.root !== "";
  }

  listDir(relativePath: string): WorkspaceEntry[] {
    const root = this.#root();
    const absolute = resolveInWorkspace(root, relativePath);
    if (!statSync(absolute).isDirectory()) {
      throw new Error(`not a directory: ${relativePath}`);
    }
    return readdirEntries(absolute);
  }

  readFile(relativePath: string): WorkspaceFileContent {
    const root = this.#root();
    ensureTextFile(relativePath);
    const absolute = resolveInWorkspace(root, relativePath);
    if (!statSync(absolute).isFile()) {
      throw new Error(`not a file: ${relativePath}`);
    }
    const content = readFileSync(absolute, "utf8");
    return { path: relativePath, content, size: Buffer.byteLength(content) };
  }

  writeFile(relativePath: string, content: string): WorkspaceFileContent {
    const root = this.#root();
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
  }

  /** 删除单个文件（目录拒绝）；文件必须存在于边界内。 */
  deleteFile(relativePath: string): void {
    const root = this.#root();
    ensureTextFile(relativePath);
    const absolute = resolveInWorkspace(root, relativePath);
    if (!statSync(absolute).isFile()) {
      throw new Error(`not a file: ${relativePath}`);
    }
    rmSync(absolute);
  }

  #root(): string {
    if (this.root === null || this.root === "") {
      throw new Error("FORGE_WORKSPACE_ROOT 未配置，Workspace 不可用（显式降级，不静默）");
    }
    return this.root;
  }
}
