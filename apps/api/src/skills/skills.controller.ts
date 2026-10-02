import { Body, Controller, Delete, Get, Inject, Param, Patch, Post } from "@nestjs/common";
import { z } from "zod";
import { renderSkillMarkdown, skillSchema } from "@adui-forge/skill-sdk";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { AgentConfigService } from "../agents/agent-config.service";
import { SKILL_STORE, type SkillRecord, type SkillStore } from "./skill.store";
import { BUNDLED_SKILLS } from "./bundled-skills";
import { importSkillsFromDir, importSkillFromMarkdown } from "./skill.import";

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

  @Get("bundled")
  bundled() {
    return BUNDLED_SKILLS;
  }

  @Post("import-bundled/:name")
  async importBundledOne(
    @Param("name") name: string,
    @Body(new ZodValidationPipe(z.object({ force: z.boolean().default(false) }))) body: {
      force: boolean;
    },
  ) {
    const bundled = BUNDLED_SKILLS.find((skill) => skill.name === name);
    if (bundled === undefined) {
      return null;
    }
    const existing = await this.store.get(name);
    // 防覆盖：同版本但内容不同 = 用户已本地修改，未显式 force 时拒绝；
    // bundled version 更新 = 官方更新，直接安装
    if (
      existing !== null &&
      existing.instructions !== bundled.instructions &&
      (existing.bundledVersion ?? 0) >= (bundled.version ?? 1) &&
      !body.force
    ) {
      return { ok: false, reason: "modified" as const, name };
    }
    await this.store.upsert({
      name: bundled.name,
      description: bundled.description,
      instructions: bundled.instructions,
      enabled: bundled.enabled,
      bundledVersion: bundled.version,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    });
    await this.agents.rebuildAll();
    return { ok: true, name };
  }

  @Post("import-bundled")
  async importBundled() {
    let imported = 0;
    for (const skill of BUNDLED_SKILLS) {
      const existing = await this.store.get(skill.name);
      await this.store.upsert({
        name: skill.name,
        description: skill.description,
        instructions: skill.instructions,
        enabled: skill.enabled,
        bundledVersion: skill.version,
        createdAt: existing?.createdAt ?? new Date().toISOString(),
      });
      imported += 1;
    }
    await this.agents.rebuildAll();
    return { ok: true, imported };
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

  /** 粘贴 SKILL.md 导入（市场第四步）：服务端 parse + 校验 + 防覆盖。 */
  @Post("import-markdown")
  async importMarkdown(
    @Body(
      new ZodValidationPipe(
        z.object({
          markdown: z.string().min(1).max(100_000),
          force: z.boolean().default(false),
        }),
      ),
    )
    body: { markdown: string; force: boolean },
  ) {
    return importSkillFromMarkdown(body.markdown, {
      store: this.store,
      rebuild: () => this.agents.rebuildAll(),
      force: body.force,
    });
  }

  @Get(":name/export")
  async export(@Param("name") name: string) {
    const record = await this.store.get(name);
    if (record === null) {
      return null;
    }
    // 返回生成的 SKILL.md 文本，由客户端下载；服务端不写文件系统
    return {
      name: record.name,
      filename: "SKILL.md",
      content: renderSkillMarkdown(record),
    };
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
