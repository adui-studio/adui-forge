import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vite-plus/test";
import { InMemorySkillStore } from "../src/skills/skill.store";
import {
  importSkillsFromDir,
  importSkillFromMarkdown,
  importSkillsFromBundle,
} from "../src/skills/skill.import";
import { BUNDLED_SKILLS } from "../src/skills/bundled-skills";
import { skillSchema } from "@adui-forge/skill-sdk";

const tempDirs: string[] = [];

const makeFixture = (): string => {
  const dir = mkdtempSync(join(tmpdir(), "skills-"));
  tempDirs.push(dir);
  return dir;
};

describe("importSkillsFromDir", () => {
  it("导入合法 SKILL.md，跳过非法条目并说明原因，触发重建", async () => {
    const dir = makeFixture();
    // 合法条目
    mkdirSync(join(dir, "plan"));
    writeFileSync(
      join(dir, "plan", "SKILL.md"),
      "---\nname: plan\ndescription: 先规划后动手\n---\n\n先理解需求再实现。",
    );
    // 目录名合法但 frontmatter name 非法
    mkdirSync(join(dir, "bad-name"));
    writeFileSync(join(dir, "bad-name", "SKILL.md"), "---\nname: Bad Name\n---\n\nbody");
    // 缺 SKILL.md 的目录
    mkdirSync(join(dir, "no-file"));

    let rebuildCount = 0;
    const store = new InMemorySkillStore();
    const result = await importSkillsFromDir(dir, {
      store,
      rebuild: async () => {
        rebuildCount += 1;
      },
    });

    expect(result.imported).toEqual(["plan"]);
    expect(result.skipped).toHaveLength(2);
    expect(result.skipped.some((item) => item.name === "bad-name")).toBe(true);
    expect(result.skipped.some((item) => item.name === "no-file")).toBe(true);
    expect(rebuildCount).toBe(1);

    const record = await store.get("plan");
    expect(record?.instructions).toContain("先理解需求再实现");
    expect(record?.enabled).toBe(true);
  });

  it("目录不存在时显式报错", async () => {
    const store = new InMemorySkillStore();
    await expect(
      importSkillsFromDir("/definitely/not/a/dir", { store, rebuild: async () => {} }),
    ).rejects.toThrow("skill 目录不存在");
  });

  it("没有导入任何条目时不触发重建", async () => {
    const dir = makeFixture();
    mkdirSync(join(dir, "empty-dir"));
    let rebuildCount = 0;
    const result = await importSkillsFromDir(dir, {
      store: new InMemorySkillStore(),
      rebuild: async () => {
        rebuildCount += 1;
      },
    });
    expect(result.imported).toEqual([]);
    expect(rebuildCount).toBe(0);
  });
});

describe("skill 导出", () => {
  it("导出内容可被再次解析（round-trip 由 skill-sdk 保证）", async () => {
    const { renderSkillMarkdown } = await import("@adui-forge/skill-sdk");
    const { parseSkillMarkdown } = await import("@adui-forge/skill-sdk");
    const markdown = renderSkillMarkdown({
      name: "plan",
      description: "先规划后动手",
      instructions: "先理解需求再实现。",
    });
    expect(markdown).toContain("name: plan");
    const parsed = parseSkillMarkdown(markdown);
    expect(parsed.name).toBe("plan");
    expect(parsed.instructions).toBe("先理解需求再实现。");
  });
});

describe("内置技能目录（市场 MVP）", () => {
  it("BUNDLED_SKILLS 均通过 skillSchema 且 name 唯一", () => {
    expect(BUNDLED_SKILLS.length).toBeGreaterThanOrEqual(4);
    const names = BUNDLED_SKILLS.map((skill) => skill.name);
    expect(new Set(names).size).toBe(names.length);
    for (const skill of BUNDLED_SKILLS) expect(() => skillSchema.parse(skill)).not.toThrow();
  });
});

describe("内置技能单技能安装", () => {
  it("BUNDLED_SKILLS 含 version 字段（市场第二步：覆盖判断依据）", () => {
    expect(BUNDLED_SKILLS.every((skill) => skill.version === 1)).toBe(true);
  });
});

describe("粘贴 Markdown 导入（市场第四步）", () => {
  const importSkill = async (
    markdown: string,
    store: InMemorySkillStore,
    force = false,
  ): Promise<Awaited<ReturnType<typeof importSkillFromMarkdown>>> => {
    let rebuildCount = 0;
    const result = await importSkillFromMarkdown(markdown, {
      store,
      force,
      rebuild: async () => {
        rebuildCount += 1;
      },
    });
    return result;
  };

  it("带 frontmatter 的 SKILL.md 正常导入并触发重建", async () => {
    const store = new InMemorySkillStore();
    const result = await importSkill(
      "---\nname: my-skill\ndescription: 自定义技能\n---\n\n指令正文。",
      store,
    );
    expect(result).toEqual({ ok: true, name: "my-skill" });
    const record = await store.get("my-skill");
    expect(record?.description).toBe("自定义技能");
    expect(record?.instructions).toBe("指令正文。");
    expect(record?.enabled).toBe(true);
  });

  it("缺少 frontmatter name 时拒绝并说明原因", async () => {
    const result = await importSkill("只有正文，没有 frontmatter", new InMemorySkillStore());
    expect(result).toEqual({
      ok: false,
      reason: "invalid",
      message: expect.stringContaining("name"),
    });
  });

  it("name 不合规时拒绝（走 skillSchema 校验）", async () => {
    const result = await importSkill("---\nname: Bad Name\n---\n\n正文", new InMemorySkillStore());
    expect(result.ok).toBe(false);
    if (!result.ok && result.reason === "invalid") {
      expect(result.message).toContain("name");
    }
  });

  it("同名但内容不同时拒绝覆盖，force 可越", async () => {
    const store = new InMemorySkillStore();
    await store.upsert({
      name: "plan",
      description: "",
      instructions: "旧版本指令",
      enabled: true,
      createdAt: new Date().toISOString(),
    });
    const conflict = await importSkill("---\nname: plan\n---\n\n新版本指令", store);
    expect(conflict).toEqual({ ok: false, reason: "exists", name: "plan" });
    expect((await store.get("plan"))?.instructions).toBe("旧版本指令");

    const forced = await importSkill("---\nname: plan\n---\n\n新版本指令", store, true);
    expect(forced).toEqual({ ok: true, name: "plan" });
    expect((await store.get("plan"))?.instructions).toBe("新版本指令");
  });
});

describe("技能包导入（市场第五步）", () => {
  const importBundle = async (entries: readonly unknown[], store: InMemorySkillStore) => {
    let rebuildCount = 0;
    const result = await importSkillsFromBundle(entries, {
      store,
      rebuild: async () => {
        rebuildCount += 1;
      },
    });
    return { result, rebuildCount };
  };

  it("合法条目导入（version 映射为 bundledVersion），重建一次", async () => {
    const store = new InMemorySkillStore();
    const { result, rebuildCount } = await importBundle(
      [
        { name: "alpha", description: "甲", instructions: "指令甲", enabled: true },
        { name: "beta", instructions: "指令乙", version: 3 },
      ],
      store,
    );
    expect(result.imported).toEqual(["alpha", "beta"]);
    expect(result.skipped).toEqual([]);
    expect(rebuildCount).toBe(1);
    expect((await store.get("alpha"))?.description).toBe("甲");
    expect((await store.get("beta"))?.bundledVersion).toBe(3);
  });

  it("非法条目跳过并说明原因，不中断整体；全跳过时不重建", async () => {
    const store = new InMemorySkillStore();
    const { result, rebuildCount } = await importBundle(
      [{ name: "Bad Name", instructions: "非法名称" }, { name: "no-body" }],
      store,
    );
    expect(result.imported).toEqual([]);
    expect(result.skipped).toHaveLength(2);
    expect(result.skipped[0]?.name).toBe("Bad Name");
    expect(rebuildCount).toBe(0);
  });

  it("同名条目直接覆盖（显式还原语义），createdAt 保留", async () => {
    const store = new InMemorySkillStore();
    const created = new Date("2026-01-01T00:00:00Z").toISOString();
    await store.upsert({
      name: "plan",
      description: "",
      instructions: "旧指令",
      enabled: true,
      createdAt: created,
    });
    const { result } = await importBundle([{ name: "plan", instructions: "新指令" }], store);
    expect(result.imported).toEqual(["plan"]);
    const record = await store.get("plan");
    expect(record?.instructions).toBe("新指令");
    expect(record?.createdAt).toBe(created);
  });
});
