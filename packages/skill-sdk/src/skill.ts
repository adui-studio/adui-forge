import { z } from "zod";

/**
 * Skill（REQUIREMENTS §35）：高于 Tool 的可复用 Agent 能力。
 * MVP 载荷为 Instructions（Markdown 指令文本）；Tools/Knowledge/Scripts 等载体后续扩展。
 */
export const skillSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9-]+$/, "仅允许小写字母、数字与连字符"),
  description: z.string().max(500).default(""),
  /** Markdown 指令文本，运行时注入 Agent 系统提示词。 */
  instructions: z.string().min(1).max(50_000),
  enabled: z.boolean().default(true),
});

export type Skill = z.infer<typeof skillSchema>;

/** Agent 定义中引用的 skill 名单（持久化于 agent_configs.skills）。 */
export const agentSkillSelectionSchema = z.array(z.string().min(1)).max(20).default([]);

/** 从候选 skill 池解析 Agent 选中的名单；未知名显式报错（不静默降级）。 */
export const resolveSkills = (selected: string[], pool: Skill[]): Skill[] => {
  const byName = new Map(pool.map((skill) => [skill.name, skill]));
  return selected.map((name) => {
    const skill = byName.get(name);
    if (skill === undefined) {
      throw new Error(`unknown skill: "${name}"`);
    }
    return skill;
  });
};

/**
 * 组装注入 Skill 后的系统提示词（REQUIREMENTS §29/§35）。
 * 无启用 skill 时原样返回；格式对模型为一等指令块，Skill 之间明确分隔。
 */
export const composeSystemPrompt = (basePrompt: string, skills: Skill[]): string => {
  const enabled = skills.filter((skill) => skill.enabled);
  if (enabled.length === 0) return basePrompt;
  const blocks = enabled
    .map((skill) => `## Skill: ${skill.name}\n\n${skill.instructions.trim()}`)
    .join("\n\n");
  return `${basePrompt.trim()}\n\n# Skills\n\n${blocks}`;
};

/** SKILL.md 文件名（与 .agents/skills 目录约定一致）。 */
export const SKILL_FILE_NAME = "SKILL.md";

export interface ParsedSkillMarkdown {
  name: string | undefined;
  description: string | undefined;
  instructions: string;
}

/**
 * 解析 SKILL.md：YAML frontmatter（--- 包裹的 name/description 等键值）
 * + Markdown 正文（即 instructions）。
 * 无 frontmatter 时整篇视为 instructions。
 */
export const parseSkillMarkdown = (raw: string): ParsedSkillMarkdown => {
  const normalized = raw.replace(/\r\n/g, "\n").trim();
  if (!normalized.startsWith("---")) {
    return { name: undefined, description: undefined, instructions: normalized };
  }
  const end = normalized.indexOf("\n---", 3);
  if (end === -1) {
    return { name: undefined, description: undefined, instructions: normalized };
  }
  const frontmatter = normalized.slice(3, end).trim();
  const instructions = normalized.slice(normalized.indexOf("\n", end + 1) + 1).trim();
  const meta: Record<string, string> = {};
  for (const line of frontmatter.split("\n")) {
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (key !== "" && value !== "") meta[key] = value;
  }
  return {
    name: meta.name,
    description: meta.description,
    instructions,
  };
};
