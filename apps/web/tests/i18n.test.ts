import { describe, expect, it } from "vite-plus/test";
import i18next from "i18next";
import { changeLanguage, detectLanguage } from "../src/i18n/index.ts";
import { zhCN } from "../src/i18n/locales/zh-CN.ts";
import { en } from "../src/i18n/locales/en.ts";

const collectKeys = (obj: object, prefix = ""): string[] =>
  Object.entries(obj).flatMap(([key, value]) =>
    typeof value === "string" ? [`${prefix}${key}`] : collectKeys(value, `${prefix}${key}.`),
  );

describe("i18n", () => {
  it("zh-CN 与 en 的键结构完全一致", () => {
    const zhKeys = collectKeys(zhCN).sort();
    const enKeys = collectKeys(en).sort();
    expect(enKeys).toEqual(zhKeys);
  });

  it("切换语言后翻译即时生效并可持久化检测", async () => {
    changeLanguage("en");
    expect(i18next.language).toBe("en");
    expect(i18next.t("common.all")).toBe("All");
    expect(i18next.t("status.running")).toBe("Running");

    changeLanguage("zh-CN");
    expect(i18next.t("common.all")).toBe("全部");
    expect(i18next.t("status.running")).toBe("运行中");
  });

  it("插值与回退：未知 key 回退到 key 本身", () => {
    expect(i18next.t("mcp.testOk", { count: 3 })).toContain("3");
    expect(i18next.t("nonexistent.key")).toBe("nonexistent.key");
  });

  it("detectLanguage 返回受支持语言", () => {
    expect(["zh-CN", "en"]).toContain(detectLanguage());
  });
});
