import { Module } from "@nestjs/common";
import { AgentsModule } from "../agents/agents.module";
import { SkillsController } from "./skills.controller";

/**
 * Skill 模块（REQUIREMENTS §35）：SKILL_STORE 由 AgentsModule 提供并导出
 * （AgentConfigService 构建系统提示词时需要读取 Skill 池，避免模块循环依赖）。
 */
@Module({
  imports: [AgentsModule],
  controllers: [SkillsController],
})
export class SkillsModule {}
