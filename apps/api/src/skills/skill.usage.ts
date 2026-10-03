export interface SkillUsageEntry {
  name: string;
  /** 引用该 Skill 的自定义 Agent 数量。 */
  agents: number;
  agentNames: string[];
}

/**
 * 技能使用统计（Skill 市场第六步：评分的代理指标）。
 * 遍历自定义 Agent 配置，统计每个 Skill 被多少个 Agent 选中；
 * 配置中引用的未知 Skill 忽略（由 resolveSkills 在运行时显式报错）。
 * 按引用数降序、名称升序排列，未被引用的 Skill 不出现在结果中。
 */
export const computeSkillUsage = (
  configs: ReadonlyArray<{ name: string; skills: readonly string[] }>,
): SkillUsageEntry[] => {
  const acc = new Map<string, string[]>();
  for (const config of configs) {
    for (const skill of new Set(config.skills)) {
      const agents = acc.get(skill) ?? [];
      agents.push(config.name);
      acc.set(skill, agents);
    }
  }
  return [...acc.entries()]
    .map(([name, agentNames]) => ({
      name,
      agents: agentNames.length,
      agentNames: agentNames.sort((a, b) => a.localeCompare(b)),
    }))
    .sort((a, b) => b.agents - a.agents || a.name.localeCompare(b.name));
};
