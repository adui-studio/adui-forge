import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vite-plus/test";
import { InMemorySkillStore } from "../src/skills/skill.store";
import { importSkillsFromDir } from "../src/skills/skill.import";

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
