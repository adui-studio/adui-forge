import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { z } from "zod";
import {
  skillSchema,
  parseSkillMarkdown,
  SKILL_FILE_NAME,
  type Skill,
} from "@adui-forge/skill-sdk";
import type { SkillStore } from "./skill.store";

export interface SkillImportResult {
  imported: string[];
  skipped: Array<{ name: string; reason: string }>;
}

export interface SkillImportDeps {
  store: SkillStore;
  /** 变更后重建引用 Skill 的自定义 Agent。 */
  rebuild: () => Promise<void>;
}

/** 粘贴 Markdown 导入的 discriminated union：成功 / 内容非法 / 与已有技能冲突。 */
export type MarkdownImportResult =
  | { ok: true; name: string }
  | { ok: false; reason: "invalid"; message: string }
  | { ok: false; reason: "exists"; name: string };

/**
 * 粘贴 SKILL.md 导入（Skill 市场第四步：外部技能进入平台的手动通道）。
 * 服务端完成 parse + schema 校验（前端校验不作为依据）；已有同名技能且内容不同时
 * 拒绝覆盖，需显式 force（与内置技能导入同一防覆盖语义）。
 */
export const importSkillFromMarkdown = async (
  raw: string,
  deps: SkillImportDeps & { force: boolean },
): Promise<MarkdownImportResult> => {
  const parsed = parseSkillMarkdown(raw);
  if (parsed.name === undefined || parsed.name.trim() === "") {
    return {
      ok: false,
      reason: "invalid",
      message: "缺少 frontmatter name（需以 --- name: xxx --- 开头）",
    };
  }
  let skill: Skill;
  try {
    skill = skillSchema.parse({
      name: parsed.name.trim(),
      description: parsed.description ?? "",
      instructions: parsed.instructions,
      enabled: true,
    });
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")
        : String(error);
    return { ok: false, reason: "invalid", message };
  }
  const existing = await deps.store.get(skill.name);
  if (existing !== null && existing.instructions !== skill.instructions && !deps.force) {
    return { ok: false, reason: "exists", name: skill.name };
  }
  await deps.store.upsert({
    ...skill,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  });
  await deps.rebuild();
  return { ok: true, name: skill.name };
};

export interface SkillBundleResult {
  imported: string[];
  skipped: Array<{ name: string; reason: string }>;
}

/**
 * 技能包（bundle）导入（Skill 市场第五步：安装间迁移与分享）。
 * 导入是显式的还原操作，合法条目直接覆盖同名 Skill（与单技能防覆盖语义不同）；
 * 单条非法只跳过并说明原因，不中断整体；全部成功才触发一次重建。
 */
export const importSkillsFromBundle = async (
  entries: readonly unknown[],
  deps: SkillImportDeps,
): Promise<SkillBundleResult> => {
  const result: SkillBundleResult = { imported: [], skipped: [] };
  for (const entry of entries) {
    const name =
      entry !== null && typeof entry === "object" && "name" in entry
        ? String((entry as { name: unknown }).name)
        : "unknown";
    try {
      const skill = skillSchema.parse(entry);
      const { version, ...rest } = skill;
      const existing = await deps.store.get(skill.name);
      await deps.store.upsert({
        ...rest,
        bundledVersion: version,
        createdAt: existing?.createdAt ?? new Date().toISOString(),
      });
      result.imported.push(skill.name);
    } catch (error) {
      result.skipped.push({
        name,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }
  if (result.imported.length > 0) {
    await deps.rebuild();
  }
  return result;
};

/**
 * 从目录扫描 <name>/SKILL.md 并导入注册表（REQUIREMENTS §36：兼容 .skill/SKILL.md 约定）。
 * 目录由服务端环境变量指定（FORGE_SKILLS_DIR），不接受客户端路径，避免任意文件读取。
 * 非法条目（目录名/名称不合规、指令为空）跳过并在结果中说明原因，不中断整体导入。
 */
export const importSkillsFromDir = async (
  rawDir: string,
  deps: SkillImportDeps,
): Promise<SkillImportResult> => {
  const dir = resolve(rawDir);
  if (!existsSync(dir) || !statSync(dir).isDirectory()) {
    throw new Error(`skill 目录不存在: "${dir}"`);
  }
  const result: SkillImportResult = { imported: [], skipped: [] };

  for (const entry of readdirSync(dir)) {
    const skillDir = join(dir, entry);
    if (!statSync(skillDir).isDirectory()) continue;
    const file = join(skillDir, SKILL_FILE_NAME);
    if (!existsSync(file)) {
      result.skipped.push({ name: entry, reason: "缺少 SKILL.md" });
      continue;
    }
    try {
      const parsed = parseSkillMarkdown(readFileSync(file, "utf8"));
      const candidate = {
        name: parsed.name ?? entry,
        description: parsed.description ?? "",
        instructions: parsed.instructions,
        enabled: true,
      };
      const skill = skillSchema.parse(candidate);
      await deps.store.upsert({
        ...skill,
        createdAt: new Date().toISOString(),
      });
      result.imported.push(skill.name);
    } catch (error) {
      result.skipped.push({
        name: entry,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (result.imported.length > 0) {
    await deps.rebuild();
  }
  return result;
};
