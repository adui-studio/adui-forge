import { Body, Controller, Delete, Get, Inject, Param, Post } from "@nestjs/common";
import { z } from "zod";
import { AgentRegistry } from "@adui-forge/agent";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { AGENT_BUILD_CONTEXT, AgentConfigService } from "./agent-config.service";
import type { AgentBuildContext } from "./agent.factory";

/** 自定义 Agent 定义 schema：name/systemPrompt 必填，tools 引用工具池内的名字。 */
export const upsertAgentSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9-]+$/, "仅允许小写字母、数字与连字符"),
  description: z.string().max(500).default(""),
  systemPrompt: z.string().min(1).max(20_000),
  /** 命名模型（FORGE_MODELS / 默认模型目录）；空缺 = 默认模型。 */
  model: z.string().max(64).optional(),
  skills: z.array(z.string().min(1)).max(20).optional(),
  tools: z.array(z.string().min(1)).max(50).default([]),
  maxSteps: z.number().int().min(1).max(64).default(16),
  timeoutMs: z.number().int().min(1_000).max(600_000).default(300_000),
  tokenLimit: z.number().int().min(1).optional(),
});

export type UpsertAgentInput = z.infer<typeof upsertAgentSchema>;

@Controller("agents")
export class AgentsController {
  constructor(
    @Inject(AgentRegistry) private readonly agents: AgentRegistry,
    @Inject(AgentConfigService) private readonly configs: AgentConfigService,
    @Inject(AGENT_BUILD_CONTEXT) private readonly context: AgentBuildContext,
  ) {}

  @Get()
  list() {
    return this.agents.list().map((agent) => ({
      name: agent.name,
      description: agent.description,
      tools: agent.tools.map((tool) => tool.name),
    }));
  }

  @Get("tools")
  toolPool() {
    return { tools: this.context.toolPool.map((tool) => tool.name) };
  }

  @Get("models")
  modelCatalog() {
    return {
      default: this.context.models?.defaultName ?? null,
      models: this.context.models?.models ?? [],
    };
  }

  @Get(":name")
  async get(@Param("name") name: string) {
    const agent = this.agents.get(name);
    if (agent === undefined) {
      return null;
    }
    const custom = await this.configs.get(name).catch(() => null);
    return {
      name: agent.name,
      description: agent.description,
      systemPrompt: agent.systemPrompt,
      tools: agent.tools.map((tool) => tool.name),
      model: custom?.model ?? "",
      loop: {
        maxSteps: agent.loop.maxSteps,
        timeoutMs: agent.loop.timeoutMs,
        tokenLimit: agent.loop.tokenLimit ?? null,
      },
      source: custom === null ? ("builtin" as const) : ("custom" as const),
      availableTools: this.context.toolPool.map((tool) => tool.name),
      modelCatalog: this.context.models?.models ?? [],
    };
  }

  @Post()
  async upsert(@Body(new ZodValidationPipe(upsertAgentSchema)) input: UpsertAgentInput) {
    return this.configs.createOrUpdate(input);
  }

  @Delete(":name")
  async delete(@Param("name") name: string) {
    await this.configs.delete(name);
    return { ok: true };
  }
}
