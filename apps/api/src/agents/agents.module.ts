import { Module } from "@nestjs/common";
import { AgentRegistry } from "@adui-forge/agent";
import { APPROVAL_SERVICE, ApprovalService } from "../approvals/approval.service";
import { ApprovalsModule } from "../approvals/approvals.module";
import { registerDefaultAgent } from "./agent.factory";
import { AgentsController } from "./agents.controller";

/**
 * Agent 装配模块：组装并注册默认 Agent（含运行中审批处理器）。
 * tsx（esbuild）不产出构造函数参数元数据，因此全仓库注入一律显式 token，
 * 不依赖 emitDecoratorMetadata（MVP-6 换 Nest CLI + swc 后亦保持该约定）。
 */
@Module({
  imports: [ApprovalsModule],
  controllers: [AgentsController],
  providers: [
    {
      provide: AgentRegistry,
      useFactory: async (approvals: ApprovalService) => {
        const registry = new AgentRegistry();
        await registerDefaultAgent(registry, approvals);
        return registry;
      },
      inject: [APPROVAL_SERVICE],
    },
  ],
  exports: [AgentRegistry],
})
export class AgentsModule {}
