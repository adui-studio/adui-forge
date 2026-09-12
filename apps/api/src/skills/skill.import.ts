import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { skillSchema, parseSkillMarkdown, SKILL_FILE_NAME } from "@adui-forge/skill-sdk";
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
