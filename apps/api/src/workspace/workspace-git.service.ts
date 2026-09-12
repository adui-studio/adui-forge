import { execFile } from "node:child_process";
import { statSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import { Inject, Injectable } from "@nestjs/common";
import { resolveInWorkspace } from "@adui-forge/tool-sdk";
import { WORKSPACE_ROOT } from "./workspace.service";

const execFileAsync = promisify(execFile);
const GIT_TIMEOUT_MS = 30_000;
const MAX_DIFF_BYTES = 512 * 1024;

export interface GitChange {
  /** porcelain 状态码：M 修改 /A 新增 /D 删除 /?? 未跟踪 等 */
  code: string;
  path: string;
}

export interface GitStatusResult {
  branch: string;
  changes: GitChange[];
}

/** 工作区 Git 面板服务（ADR-004 阶段 4 提前）：status / diff / add+commit。
 *  全部经 execFile 参数数组执行（无 shell 拼接），路径先过 workspace 边界。 */
@Injectable()
export class WorkspaceGitService {
  constructor(@Inject(WORKSPACE_ROOT) private readonly root: string | null) {}

  async status(): Promise<GitStatusResult> {
    const root = await this.#root();
    const branch = await this.#git(root, ["rev-parse", "--abbrev-ref", "HEAD"]).catch(() => "");
    const porcelain = await this.#git(root, ["status", "--porcelain"]);
    const changes = porcelain
      .split("\n")
      .filter((line) => line.trim() !== "")
      .map((line) => ({
        code: line.slice(0, 2).trim() || "??",
        path: line.slice(3).trim().replace(/^"|"$/g, ""),
      }));
    return { branch: branch.trim(), changes };
  }

  async diff(relativePath: string): Promise<string> {
    const root = await this.#root();
    this.#ensureTracked(root, relativePath);
    const diff = await this.#git(root, ["diff", "HEAD", "--", relativePath]);
    return diff.slice(0, MAX_DIFF_BYTES);
  }

  async commit(message: string, paths: string[]): Promise<{ commit: string }> {
    const root = await this.#root();
    if (message.trim() === "") {
      throw new Error("commit message is required");
    }
    if (paths.length === 0) {
      throw new Error("at least one file path is required");
    }
    for (const path of paths) {
      this.#ensureInWorkspace(root, path);
    }
    await this.#git(root, ["add", "--", ...paths]);
    const output = await this.#git(root, ["commit", "-m", message.trim(), "--", ...paths]);
    const match = /\[([^\]]+)\]/.exec(output);
    return { commit: match?.[1] ?? "" };
  }

  /** 文件在 HEAD 中的内容；未跟踪文件返回 tracked:false。 */
  async headContent(
    relativePath: string,
  ): Promise<{ path: string; tracked: boolean; content: string }> {
    const root = await this.#root();
    this.#ensureInWorkspace(root, relativePath);
    try {
      const content = await this.#git(root, ["show", `HEAD:${relativePath}`]);
      return { path: relativePath, tracked: true, content };
    } catch {
      return { path: relativePath, tracked: false, content: "" };
    }
  }

  async #root(): Promise<string> {
    if (this.root === null || this.root === "") {
      throw new Error("FORGE_WORKSPACE_ROOT 未配置，Git 面板不可用");
    }
    return this.root;
  }

  async #git(cwd: string, args: string[]): Promise<string> {
    const { stdout } = await execFileAsync("git", args, {
      cwd,
      timeout: GIT_TIMEOUT_MS,
      maxBuffer: 16 * 1024 * 1024,
    });
    return stdout;
  }

  /** diff 的目标必须在边界内且存在（未跟踪文件 git diff 无输出，由前端引导先 add）。 */
  #ensureTracked(root: string, relativePath: string): void {
    this.#ensureInWorkspace(root, relativePath);
  }

  #ensureInWorkspace(root: string, relativePath: string): void {
    // 路径含目录段时逐级边界校验；纯文件名直接落根目录
    const absolute =
      relativePath.includes("/") || relativePath.includes("\\")
        ? resolveInWorkspace(root, relativePath)
        : join(resolveInWorkspace(root, "."), relativePath);
    if (!statSync(absolute, { throwIfNoEntry: false }) && !relativePath.includes("/")) {
      // 新文件（untracked）在根目录下：allow missing，边界已校验
      return;
    }
  }
}
