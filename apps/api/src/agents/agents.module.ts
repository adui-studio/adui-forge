import { Module } from "@nestjs/common";
import { AgentRegistry } from "@adui-forge/agent";
import { registerDefaultAgent } from "./agent.factory";

/**
 * Agent 装配模块：组装并注册默认 Agent。
 * tsx（esbuild）不产出构造函数参数元数据，因此全仓库注入一律显式 token，
 * 不依赖 emitDecoratorMetadata（MVP-6 换 Nest CLI + swc 后亦保持该约定）。
 */
@Module({
  providers: [
    {
      provide: AgentRegistry,
      useFactory: () => {
        const registry = new AgentRegistry();
        registerDefaultAgent(registry);
        return registry;
      },
    },
  ],
  exports: [AgentRegistry],
})
export class AgentsModule {}
