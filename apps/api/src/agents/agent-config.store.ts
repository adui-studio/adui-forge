import { PrismaClient } from "../../generated/prisma-client";

export const AGENT_CONFIG_STORE = Symbol("AGENT_CONFIG_STORE");

/** 自定义 Agent 的持久化记录（与 agent.factory 的 AgentConfigDefinition 对齐）。 */
export interface AgentConfigRecord {
  name: string;
  description: string;
  systemPrompt: string;
  /** 命名模型；空串 = 默认模型。 */
  model: string;
  /** 选中的 Skill 名单（启用者注入系统提示词）。 */
  skills: string[];
  tools: string[];
  maxSteps: number;
  timeoutMs: number;
  createdAt: string;
  updatedAt?: string;
}

export interface AgentConfigStore {
  upsert(record: AgentConfigRecord): Promise<void>;
  get(name: string): Promise<AgentConfigRecord | null>;
  list(): Promise<AgentConfigRecord[]>;
  delete(name: string): Promise<boolean>;
}

export class InMemoryAgentConfigStore implements AgentConfigStore {
  readonly #records = new Map<string, AgentConfigRecord>();

  async upsert(record: AgentConfigRecord): Promise<void> {
    const existing = this.#records.get(record.name);
    this.#records.set(record.name, {
      ...record,
      createdAt: existing?.createdAt ?? record.createdAt,
      updatedAt: new Date().toISOString(),
    });
  }

  async get(name: string): Promise<AgentConfigRecord | null> {
    return this.#records.get(name) ?? null;
  }

  async list(): Promise<AgentConfigRecord[]> {
    return [...this.#records.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  async delete(name: string): Promise<boolean> {
    return this.#records.delete(name);
  }
}

/** PostgreSQL 自定义 Agent 存储（Prisma）。需先 `prisma migrate deploy`。 */
export class PrismaAgentConfigStore implements AgentConfigStore {
  readonly #prisma: PrismaClient;

  constructor(prisma: PrismaClient = new PrismaClient()) {
    this.#prisma = prisma;
  }

  async upsert(record: AgentConfigRecord): Promise<void> {
    await this.#prisma.agentConfig.upsert({
      where: { name: record.name },
      create: {
        name: record.name,
        description: record.description,
        systemPrompt: record.systemPrompt,
        model: record.model,
        skills: record.skills,
        tools: record.tools,
        maxSteps: record.maxSteps,
        timeoutMs: record.timeoutMs,
      },
      update: {
        description: record.description,
        systemPrompt: record.systemPrompt,
        model: record.model,
        skills: record.skills,
        tools: record.tools,
        maxSteps: record.maxSteps,
        timeoutMs: record.timeoutMs,
      },
    });
  }

  async get(name: string): Promise<AgentConfigRecord | null> {
    const row = await this.#prisma.agentConfig.findUnique({ where: { name } });
    if (row === null) return null;
    return {
      name: row.name,
      description: row.description,
      systemPrompt: row.systemPrompt,
      model: row.model,
      skills: row.skills as string[],
      tools: row.tools as string[],
      maxSteps: row.maxSteps,
      timeoutMs: row.timeoutMs,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async list(): Promise<AgentConfigRecord[]> {
    const rows = await this.#prisma.agentConfig.findMany({ orderBy: { name: "asc" } });
    return rows.map((row) => ({
      name: row.name,
      description: row.description,
      systemPrompt: row.systemPrompt,
      model: row.model,
      skills: row.skills as string[],
      tools: row.tools as string[],
      maxSteps: row.maxSteps,
      timeoutMs: row.timeoutMs,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }));
  }

  async delete(name: string): Promise<boolean> {
    const result = await this.#prisma.agentConfig.deleteMany({ where: { name } });
    return result.count > 0;
  }
}
