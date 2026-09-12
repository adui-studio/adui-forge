import { Module } from "@nestjs/common";
import { WORKSPACE_ROOT, WorkspaceService } from "./workspace.service";
import { WorkspaceController } from "./workspace.controller";

/** Workspace 模块（ADR-004 阶段 1）：FORGE_WORKSPACE_ROOT 未配置时显式降级为不可用。 */
@Module({
  controllers: [WorkspaceController],
  providers: [
    {
      provide: WORKSPACE_ROOT,
      useFactory: () => process.env.FORGE_WORKSPACE_ROOT ?? null,
    },
    WorkspaceService,
  ],
})
export class WorkspaceModule {}
