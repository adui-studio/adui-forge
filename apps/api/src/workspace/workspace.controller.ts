import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Post,
  NotFoundException,
  Put,
  Query,
} from "@nestjs/common";
import { z } from "zod";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import {
  WorkspaceService,
  type WorkspaceEntry,
  type WorkspaceFileContent,
} from "./workspace.service";
import { WorkspaceGitService, type GitStatusResult } from "./workspace-git.service";

const pathSchema = z.object({ path: z.string().min(1).max(500) });

const commitSchema = z.object({
  message: z.string().min(1).max(500),
  paths: z.array(z.string().min(1).max(500)).min(1).max(200),
});

const writeFileSchema = z.object({
  path: z.string().min(1).max(500),
  content: z.string().max(1024 * 1024),
});

@Controller("workspace")
export class WorkspaceController {
  constructor(
    @Inject(WorkspaceService) private readonly workspace: WorkspaceService,
    private readonly git: WorkspaceGitService,
  ) {}

  @Get("tree")
  async tree(
    @Query(new ZodValidationPipe(pathSchema)) query: { path: string },
  ): Promise<WorkspaceEntry[]> {
    return this.#call(() => this.workspace.listDir(query.path));
  }

  @Get("file")
  async file(
    @Query(new ZodValidationPipe(pathSchema)) query: { path: string },
  ): Promise<WorkspaceFileContent> {
    return this.#call(() => this.workspace.readFile(query.path));
  }

  @Put("file")
  write(
    @Body(new ZodValidationPipe(writeFileSchema))
    input: { path: string; content: string },
  ): Promise<WorkspaceFileContent> {
    return this.#call(() => this.workspace.writeFile(input.path, input.content));
  }

  @Get("git/status")
  async gitStatus(): Promise<GitStatusResult> {
    return this.#call(() => this.git.status());
  }

  @Get("git/diff")
  async gitDiff(
    @Query(new ZodValidationPipe(pathSchema)) query: { path: string },
  ): Promise<{ diff: string }> {
    const diff = await this.#call(() => this.git.diff(query.path));
    return { diff };
  }

  @Post("git/commit")
  async gitCommit(
    @Body(new ZodValidationPipe(commitSchema))
    input: { message: string; paths: string[] },
  ): Promise<{ commit: string }> {
    return this.#call(() => this.git.commit(input.message, input.paths));
  }

  @Delete("file")
  async remove(@Query(new ZodValidationPipe(pathSchema)) query: { path: string }): Promise<void> {
    await this.#call(() => this.workspace.deleteFile(query.path));
  }

  /** Workspace 错误统一收敛为 404/400 语义的 Error Contract，不泄露栈与绝对路径。 */
  async #call<T>(operation: () => T | Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("未配置 FORGE_WORKSPACE_ROOT")) {
        throw new NotFoundException(message);
      }
      if (message.includes("escapes workspace boundary") || message.includes("not exist")) {
        throw new NotFoundException(message);
      }
      throw error instanceof Error ? error : new Error(message);
    }
  }
}
