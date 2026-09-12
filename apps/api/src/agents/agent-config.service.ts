import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import { AgentRegistry } from "@adui-forge/agent";
import { composeSystemPrompt, resolveSkills } from "@adui-forge/skill-sdk";
import {
  buildAgentFromDefinition,
  DEFAULT_AGENT_NAME,
  type AgentBuildContext,
  type AgentConfigDefinition,
} from "./agent.factory";
import {
  AGENT_CONFIG_STORE,
  type AgentConfigRecord,
  type AgentConfigStore,
} from "./agent-config.store";
import { SKILL_STORE, toSkill, type SkillStore } from "../skills/skill.store";

export const AGENT_BUILD_CONTEXT = Symbol("AGENT_BUILD_CONTEXT");

/** 自定义 Agent 服务：持久化配置 ↔ 运行时注册表的双向同步；启用的 Skill 指令注入系统提示词。 */
@Injectable()
export class AgentConfigService implements OnModuleInit {
  constructor(
    @Inject(AGENT_CONFIG_STORE) private readonly store: AgentConfigStore,
    @Inject(AgentRegistry) private readonly registry: AgentRegistry,
    @Inject(AGENT_BUILD_CONTEXT) private readonly context: AgentBuildContext,
    @Inject(SKILL_STORE) private readonly skills: SkillStore,
  ) {}

  /** 启动时把持久化的自定义 Agent 注册进运行时（模型未配置时显式告警跳过）。 */
  async onModuleInit(): Promise<void> {
    if (this.context.config === null) return;
    for (const record of await this.store.list()) {
      await this.#register(record);
    }
  }

  async list(): Promise<AgentConfigRecord[]> {
    return this.store.list();
  }

  async get(name: string): Promise<AgentConfigRecord> {
    const record = await this.store.get(name);
    if (record === null) {
      throw new NotFoundException(`unknown agent config: "${name}"`);
    }
    return record;
  }

  async createOrUpdate(input: AgentConfigDefinition): Promise<AgentConfigRecord> {
    if (input.name === DEFAULT_AGENT_NAME) {
      throw new ConflictException(`"${DEFAULT_AGENT_NAME}" 是内置 Agent，不可覆盖`);
    }
    if (this.context.config === null) {
      throw new ConflictException(
        "FORGE_MODEL_BASE_URL / FORGE_MODEL_ID 未配置，无法创建自定义 Agent",
      );
    }
    const record: AgentConfigRecord = {
      name: input.name,
      description: input.description,
      systemPrompt: input.systemPrompt,
      model: input.model ?? "",
      skills: input.skills ?? [],
      tools: input.tools,
      maxSteps: input.maxSteps,
      timeoutMs: input.timeoutMs,
      createdAt: new Date().toISOString(),
    };
    // 先构建再落库：引用未知工具名/模型名/Skill 名时显式失败，不留下半生效配置
    await this.#register(record);
    await this.store.upsert(record);
    return record;
  }

  async delete(name: string): Promise<void> {
    if (name === DEFAULT_AGENT_NAME) {
      throw new ConflictException(`"${DEFAULT_AGENT_NAME}" 是内置 Agent，不可删除`);
    }
    const record = await this.store.get(name);
    if (record === null) {
      throw new NotFoundException(`unknown agent config: "${name}"`);
    }
    await this.store.delete(name);
    this.registry.remove(name);
  }

  /** Skill 变更后重建全部自定义 Agent，使新指令立即生效。 */
  async rebuildAll(): Promise<void> {
    for (const record of await this.store.list()) {
      await this.#register(record);
    }
  }

  async #register(record: AgentConfigRecord): Promise<void> {
    const pool = (await this.skills.list()).map(toSkill);
    // 解析选中的 Skill（未知名显式报错），把启用 Skill 的指令注入系统提示词
    const selected = resolveSkills(record.skills ?? [], pool);
    const systemPrompt = composeSystemPrompt(record.systemPrompt, selected);
    this.registry.upsert(
      buildAgentFromDefinition(
        {
          name: record.name,
          description: record.description,
          systemPrompt,
          model: record.model,
          tools: record.tools,
          maxSteps: record.maxSteps,
          timeoutMs: record.timeoutMs,
        },
        this.context,
      ),
    );
  }
}
