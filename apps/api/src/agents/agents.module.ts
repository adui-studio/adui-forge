import { Module } from "@nestjs/common";
import { AgentRegistry } from "@adui-forge/agent";
import { PrismaClient } from "../../generated/prisma-client";
import { APPROVAL_SERVICE, ApprovalService } from "../approvals/approval.service";
import { ApprovalsModule } from "../approvals/approvals.module";
import { AGENT_BUILD_CONTEXT, AgentConfigService } from "./agent-config.service";
import {
  InMemoryAgentConfigStore,
  AGENT_CONFIG_STORE,
  PrismaAgentConfigStore,
} from "./agent-config.store";
import { buildAgentBuildContext, registerDefaultAgent } from "./agent.factory";
import { AgentsController } from "./agents.controller";
import { McpController } from "./mcp.controller";
import { InMemorySkillStore, PrismaSkillStore, SKILL_STORE } from "../skills/skill.store";

/**
 * Agent 装配模块：组装构建上下文（模型 + 工具池 + 审批）并注册默认 Agent，
 * 自定义 Agent 由 AgentConfigService 在启动时从持久化配置装载。
 * tsx（esbuild）不产出构造函数参数元数据，因此全仓库注入一律显式 token，
 * 不依赖 emitDecoratorMetadata（MVP-6 换 Nest CLI + swc 后亦保持该约定）。
 */
@Module({
  imports: [ApprovalsModule],
  controllers: [AgentsController, McpController],
  providers: [
    {
      // 默认 Agent 与自定义 Agent 共用同一构建上下文（工具池一致）
      provide: AGENT_BUILD_CONTEXT,
      useFactory: async (approvals: ApprovalService) =>
        buildAgentBuildContext(
          {
            createPending: (request) => approvals.createPending(request),
          },
          process.env,
        ),
      inject: [APPROVAL_SERVICE],
    },
    {
      provide: AgentRegistry,
      useFactory: async (context: Awaited<ReturnType<typeof buildAgentBuildContext>>) => {
        const registry = new AgentRegistry();
        await registerDefaultAgent(registry, context);
        return registry;
      },
      inject: [AGENT_BUILD_CONTEXT],
    },
    {
      provide: AGENT_CONFIG_STORE,
      useFactory: () =>
        process.env.DATABASE_URL !== undefined && process.env.DATABASE_URL !== ""
          ? new PrismaAgentConfigStore(new PrismaClient())
          : new InMemoryAgentConfigStore(),
    },
    AgentConfigService,
    {
      provide: SKILL_STORE,
      useFactory: () =>
        process.env.DATABASE_URL !== undefined && process.env.DATABASE_URL !== ""
          ? new PrismaSkillStore(new PrismaClient())
          : new InMemorySkillStore(),
    },
  ],
  exports: [AgentRegistry, SKILL_STORE],
})
export class AgentsModule {}
