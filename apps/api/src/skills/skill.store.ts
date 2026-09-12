import { PrismaClient } from "../../generated/prisma-client";
import type { Skill } from "@adui-forge/skill-sdk";

export const SKILL_STORE = Symbol("SKILL_STORE");

export interface SkillRecord {
  name: string;
  description: string;
  instructions: string;
  enabled: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface SkillStore {
  upsert(record: SkillRecord): Promise<void>;
  get(name: string): Promise<SkillRecord | null>;
  list(): Promise<SkillRecord[]>;
  delete(name: string): Promise<boolean>;
}

export class InMemorySkillStore implements SkillStore {
  readonly #skills = new Map<string, SkillRecord>();

  async upsert(record: SkillRecord): Promise<void> {
    const existing = this.#skills.get(record.name);
    this.#skills.set(record.name, {
      ...record,
      createdAt: existing?.createdAt ?? record.createdAt,
      updatedAt: new Date().toISOString(),
    });
  }

  async get(name: string): Promise<SkillRecord | null> {
    return this.#skills.get(name) ?? null;
  }

  async list(): Promise<SkillRecord[]> {
    return [...this.#skills.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  async delete(name: string): Promise<boolean> {
    return this.#skills.delete(name);
  }
}

/** PostgreSQL Skill 存储（Prisma）。需先 `prisma migrate deploy`。 */
export class PrismaSkillStore implements SkillStore {
  readonly #prisma: PrismaClient;

  constructor(prisma: PrismaClient = new PrismaClient()) {
    this.#prisma = prisma;
  }

  async upsert(record: SkillRecord): Promise<void> {
    await this.#prisma.skill.upsert({
      where: { name: record.name },
      create: {
        name: record.name,
        description: record.description,
        instructions: record.instructions,
        enabled: record.enabled,
      },
      update: {
        description: record.description,
        instructions: record.instructions,
        enabled: record.enabled,
      },
    });
  }

  async get(name: string): Promise<SkillRecord | null> {
    const row = await this.#prisma.skill.findUnique({ where: { name } });
    return row === null ? null : this.#toRecord(row);
  }

  async list(): Promise<SkillRecord[]> {
    const rows = await this.#prisma.skill.findMany({ orderBy: { name: "asc" } });
    return rows.map((row) => this.#toRecord(row));
  }

  async delete(name: string): Promise<boolean> {
    const result = await this.#prisma.skill.deleteMany({ where: { name } });
    return result.count > 0;
  }

  #toRecord(row: {
    name: string;
    description: string;
    instructions: string;
    enabled: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): SkillRecord {
    return {
      name: row.name,
      description: row.description,
      instructions: row.instructions,
      enabled: row.enabled,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}

export const toSkill = (record: SkillRecord): Skill => ({
  name: record.name,
  description: record.description,
  instructions: record.instructions,
  enabled: record.enabled,
});
