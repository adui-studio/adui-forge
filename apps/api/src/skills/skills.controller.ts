import { Body, Controller, Delete, Get, Inject, Param, Patch, Post } from "@nestjs/common";
import { z } from "zod";
import { skillSchema } from "@adui-forge/skill-sdk";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { AgentConfigService } from "../agents/agent-config.service";
import { SKILL_STORE, type SkillRecord, type SkillStore } from "./skill.store";
import { importSkillsFromDir } from "./skill.import";

export const upsertSkillSchema = skillSchema;
export type UpsertSkillInput = z.infer<typeof upsertSkillSchema>;

@Controller("skills")
export class SkillsController {
  constructor(
    @Inject(SKILL_STORE) private readonly store: SkillStore,
    @Inject(AgentConfigService) private readonly agents: AgentConfigService,
  ) {}

  @Get()
  async list() {
    return this.store.list();
  }

  @Get(":name")
  async get(@Param("name") name: string) {
    const record = await this.store.get(name);
    if (record === null) {
      return null;
    }
    return record;
  }

  @Post()
  async upsert(@Body(new ZodValidationPipe(upsertSkillSchema)) input: UpsertSkillInput) {
    const record: SkillRecord = {
      name: input.name,
      description: input.description,
      instructions: input.instructions,
      enabled: input.enabled,
      createdAt: new Date().toISOString(),
    };
    await this.store.upsert(record);
    // 指令变更立即生效：重建引用它的自定义 Agent
    await this.agents.rebuildAll();
    return { ok: true, name: record.name };
  }

  @Post("import")
  async importFromDir() {
    const dir = process.env.FORGE_SKILLS_DIR;
    if (dir === undefined || dir.trim() === "") {
      return {
        ok: false as const,
        message: "未配置 FORGE_SKILLS_DIR，无法导入 SKILL.md（服务端目录，不接受客户端路径）",
      };
    }
    const result = await importSkillsFromDir(dir, {
      store: this.store,
      rebuild: () => this.agents.rebuildAll(),
    });
    return { ok: true as const, ...result };
  }

  @Patch(":name/enabled")
  async setEnabled(
    @Param("name") name: string,
    @Body(new ZodValidationPipe(z.object({ enabled: z.boolean() }))) input: { enabled: boolean },
  ) {
    const record = await this.store.get(name);
    if (record === null) {
      return null;
    }
    await this.store.upsert({ ...record, enabled: input.enabled });
    await this.agents.rebuildAll();
    return { ok: true, name };
  }

  @Delete(":name")
  async delete(@Param("name") name: string) {
    const deleted = await this.store.delete(name);
    if (!deleted) {
      return null;
    }
    await this.agents.rebuildAll();
    return { ok: true };
  }
}
