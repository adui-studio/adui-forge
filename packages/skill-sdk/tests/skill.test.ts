import { describe, expect, it } from "vite-plus/test";
import { composeSystemPrompt, resolveSkills, skillSchema, type Skill } from "../src/index.ts";

const baseSkill: Skill = {
  name: "bug-fixing",
  description: "fix bugs systematically",
  instructions: "1) Reproduce 2) Root cause 3) Regression test 4) Fix",
  enabled: true,
};

describe("skillSchema", () => {
  it("接受合法 skill，拒绝非法 name", () => {
    expect(() => skillSchema.parse(baseSkill)).not.toThrow();
    expect(() => skillSchema.parse({ ...baseSkill, name: "Bad Name" })).toThrow();
    expect(() => skillSchema.parse({ ...baseSkill, instructions: "" })).toThrow();
  });

  it("description/enabled 有默认值", () => {
    const parsed = skillSchema.parse({ name: "x", instructions: "do x" });
    expect(parsed.description).toBe("");
    expect(parsed.enabled).toBe(true);
  });
});

describe("resolveSkills", () => {
  it("按名解析；未知名显式报错", () => {
    const pool = [baseSkill, { ...baseSkill, name: "testing", enabled: false }];
    expect(resolveSkills(["bug-fixing", "testing"], pool)).toHaveLength(2);
    expect(() => resolveSkills(["ghost"], pool)).toThrow('unknown skill: "ghost"');
  });
});

describe("composeSystemPrompt", () => {
  it("无 skill 时原样返回", () => {
    expect(composeSystemPrompt("base", [])).toBe("base");
  });

  it("启用的 skill 按块注入，禁用的跳过", () => {
    const prompt = composeSystemPrompt("You are an agent.", [
      baseSkill,
      { ...baseSkill, name: "disabled", instructions: "never", enabled: false },
    ]);
    expect(prompt).toContain("You are an agent.");
    expect(prompt).toContain("# Skills");
    expect(prompt).toContain("## Skill: bug-fixing");
    expect(prompt).toContain("1) Reproduce");
    expect(prompt).not.toContain("## Skill: disabled");
  });

  it("多个 skill 以分隔线块拼接", () => {
    const prompt = composeSystemPrompt("base", [
      baseSkill,
      { ...baseSkill, name: "testing", instructions: "write tests first" },
    ]);
    expect(prompt).toContain("## Skill: bug-fixing");
    expect(prompt).toContain("## Skill: testing");
  });
});
