import { describe, expect, it } from "vite-plus/test";
import {
  composeSystemPrompt,
  parseSkillMarkdown,
  renderSkillMarkdown,
  resolveSkills,
  skillSchema,
  type Skill,
} from "../src/index.ts";

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

describe("parseSkillMarkdown", () => {
  it("解析 frontmatter 的 name/description，正文作为 instructions", () => {
    const raw = `---
name: plan
description: 先规划后动手
---

# Plan

先理解需求再动手。`;
    const parsed = parseSkillMarkdown(raw);
    expect(parsed.name).toBe("plan");
    expect(parsed.description).toBe("先规划后动手");
    expect(parsed.instructions).toContain("# Plan");
    expect(parsed.instructions).toContain("先理解需求再动手。");
  });

  it("无 frontmatter 时整篇作为 instructions", () => {
    const parsed = parseSkillMarkdown("# 只有一段指令\n内容");
    expect(parsed.name).toBeUndefined();
    expect(parsed.instructions).toContain("只有一段指令");
  });

  it("处理 CRLF 行尾", () => {
    const parsed = parseSkillMarkdown("---\r\nname: x\r\n---\r\n\r\nbody");
    expect(parsed.name).toBe("x");
    expect(parsed.instructions).toBe("body");
  });
});

describe("renderSkillMarkdown", () => {
  it("渲染包含 frontmatter 与正文，且与 parseSkillMarkdown 构成 round-trip", () => {
    const markdown = renderSkillMarkdown({
      name: "testing",
      description: "write tests first",
      instructions: "# Testing\n\nAlways test first.",
    });
    expect(markdown).toContain("---");
    expect(markdown).toContain("name: testing");
    expect(markdown).toContain("description: write tests first");

    const parsed = parseSkillMarkdown(markdown);
    expect(parsed.name).toBe("testing");
    expect(parsed.description).toBe("write tests first");
    expect(parsed.instructions).toContain("Always test first.");
  });

  it("description 为空时省略该行", () => {
    const markdown = renderSkillMarkdown({
      name: "x",
      description: "",
      instructions: "body",
    });
    expect(markdown).not.toContain("description:");
    const parsed = parseSkillMarkdown(markdown);
    expect(parsed.name).toBe("x");
  });
});
