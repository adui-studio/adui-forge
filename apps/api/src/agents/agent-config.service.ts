import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import { AgentRegistry } from "@adui-forge/agent";
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

export const AGENT_BUILD_CONTEXT = Symbol("AGENT_BUILD_CONTEXT");

/** 自定义 Agent 服务：持久化配置 ↔ 运行时注册表的双向同步。 */
@Injectable()
export class AgentConfigService implements OnModuleInit {
  constructor(
    @Inject(AGENT_CONFIG_STORE) private readonly store: AgentConfigStore,
    @Inject(AgentRegistry) private readonly registry: AgentRegistry,
    @Inject(AGENT_BUILD_CONTEXT) private readonly context: AgentBuildContext,
  ) {}

  /** 启动时把持久化的自定义 Agent 注册进运行时（模型未配置时显式告警跳过）。 */
  async onModuleInit(): Promise<void> {
    if (this.context.config === null) return;
    for (const record of await this.store.list()) {
      this.#register(record);
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
    // 先构建再落库：引用未知工具名时显式失败，不留下半生效配置
    this.#register({
      ...input,
      createdAt: new Date().toISOString(),
    });
    const record: AgentConfigRecord = {
      name: input.name,
      description: input.description,
      systemPrompt: input.systemPrompt,
      tools: input.tools,
      maxSteps: input.maxSteps,
      timeoutMs: input.timeoutMs,
      createdAt: new Date().toISOString(),
    };
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

  #register(record: AgentConfigRecord): void {
    this.registry.upsert(
      buildAgentFromDefinition(
        {
          name: record.name,
          description: record.description,
          systemPrompt: record.systemPrompt,
          tools: record.tools,
          maxSteps: record.maxSteps,
          timeoutMs: record.timeoutMs,
        },
        this.context,
      ),
    );
  }
}
