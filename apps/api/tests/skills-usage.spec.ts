import { describe, expect, it } from "vite-plus/test";
import { computeSkillUsage } from "../src/skills/skill.usage";

describe("computeSkillUsage（市场第六步：使用统计）", () => {
  it("统计引用数与 Agent 名单，按引用数降序、名称升序", () => {
    const usage = computeSkillUsage([
      { name: "agent-a", skills: ["plan", "review"] },
      { name: "agent-b", skills: ["plan"] },
      { name: "agent-c", skills: ["plan", "review"] },
      { name: "agent-d", skills: [] },
    ]);
    expect(usage).toEqual([
      { name: "plan", agents: 3, agentNames: ["agent-a", "agent-b", "agent-c"] },
      { name: "review", agents: 2, agentNames: ["agent-a", "agent-c"] },
    ]);
  });

  it("同一 Agent 重复选中同一 Skill 只计一次", () => {
    const usage = computeSkillUsage([{ name: "agent-a", skills: ["plan", "plan"] }]);
    expect(usage).toEqual([{ name: "plan", agents: 1, agentNames: ["agent-a"] }]);
  });

  it("无人引用时返回空数组", () => {
    expect(computeSkillUsage([{ name: "agent-a", skills: [] }])).toEqual([]);
    expect(computeSkillUsage([])).toEqual([]);
  });
});
