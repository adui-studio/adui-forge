import { Body, Controller, Get, Inject, NotFoundException, Put, Query } from "@nestjs/common";
import { z } from "zod";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import {
  WorkspaceService,
  type WorkspaceEntry,
  type WorkspaceFileContent,
} from "./workspace.service";

const pathSchema = z.object({ path: z.string().min(1).max(500) });

const writeFileSchema = z.object({
  path: z.string().min(1).max(500),
  content: z.string().max(1024 * 1024),
});

@Controller("workspace")
export class WorkspaceController {
  constructor(@Inject(WorkspaceService) private readonly workspace: WorkspaceService) {}

  @Get("tree")
  tree(@Query(new ZodValidationPipe(pathSchema)) query: { path: string }): WorkspaceEntry[] {
    return this.#call(() => this.workspace.listDir(query.path));
  }

  @Get("file")
  file(@Query(new ZodValidationPipe(pathSchema)) query: { path: string }): WorkspaceFileContent {
    return this.#call(() => this.workspace.readFile(query.path));
  }

  @Put("file")
  write(
    @Body(new ZodValidationPipe(writeFileSchema))
    input: { path: string; content: string },
  ): WorkspaceFileContent {
    return this.#call(() => this.workspace.writeFile(input.path, input.content));
  }

  /** Workspace 错误统一收敛为 404/400 语义的 Error Contract，不泄露栈与绝对路径。 */
  #call<T>(operation: () => T): T {
    try {
      return operation();
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
