import { Inject, Injectable } from "@nestjs/common";
import {
  deleteWorkspaceTextFile,
  listWorkspaceDir,
  readWorkspaceTextFile,
  writeWorkspaceTextFile,
  type WorkspaceEntry,
  type WorkspaceFileContent,
} from "@adui-forge/tool-sdk";

export const WORKSPACE_ROOT = Symbol("WORKSPACE_ROOT");

/** Workspace 文件服务（ADR-004 阶段 1）：委托 tool-sdk 的共享纯实现（云端/Runner 单一边界）。 */
@Injectable()
export class WorkspaceService {
  constructor(@Inject(WORKSPACE_ROOT) private readonly root: string | null) {}

  /** 未配置 FORGE_WORKSPACE_ROOT 时显式不可用。 */
  isAvailable(): boolean {
    return this.root !== null && this.root !== "";
  }

  listDir(relativePath: string): WorkspaceEntry[] {
    return listWorkspaceDir(this.#root(), relativePath);
  }

  readFile(relativePath: string): WorkspaceFileContent {
    return readWorkspaceTextFile(this.#root(), relativePath);
  }

  writeFile(relativePath: string, content: string): WorkspaceFileContent {
    return writeWorkspaceTextFile(this.#root(), relativePath, content);
  }

  /** 删除单个文件（目录拒绝）；文件必须存在于边界内。 */
  deleteFile(relativePath: string): void {
    deleteWorkspaceTextFile(this.#root(), relativePath);
  }

  #root(): string {
    if (this.root === null || this.root === "") {
      throw new Error("FORGE_WORKSPACE_ROOT 未配置，Workspace 不可用（显式降级，不静默）");
    }
    return this.root;
  }
}
