import { describe, expect, it } from "vite-plus/test";
import type { ModelAdapter } from "@adui-forge/contracts";
import {
  parseForgeModels,
  buildModelCatalog,
  type ForgeModelConfig,
} from "../src/agents/agent.factory";

describe("parseForgeModels", () => {
  it("未配置时返回空数组", () => {
    expect(parseForgeModels(undefined)).toEqual([]);
    expect(parseForgeModels("  ")).toEqual([]);
  });

  it("解析条目并通过 apiKeyEnv 间接取密钥", () => {
    const models = parseForgeModels(
      '[{"name":"ds","provider":"deepseek","baseURL":"https://api.ds.com/v1","modelId":"deepseek-chat","apiKeyEnv":"DS_KEY"}]',
    );
    expect(models).toHaveLength(1);
    expect(models[0]?.provider).toBe("deepseek");
  });

  it("缺 name/baseURL/modelId 时显式报错", () => {
    expect(() => parseForgeModels('[{"name":"x","baseURL":"http://x","apiKeyEnv":"K"}]')).toThrow(
      "requires name, baseURL and modelId",
    );
    expect(() => parseForgeModels("not-json")).toThrow();
  });
});

describe("buildModelCatalog", () => {
  const defaultConfig: ForgeModelConfig = {
    name: "main",
    baseURL: "http://localhost:1",
    modelId: "m1",
  };

  it("默认模型始终注册，FORGE_MODELS 追加命名模型", () => {
    const catalog = buildModelCatalog(
      defaultConfig,
      Object.assign({}, process.env, {
        FORGE_MODELS: '[{"name":"alt","provider":"deepseek","baseURL":"http://x","modelId":"m2"}]',
      }),
    );
    expect(catalog.defaultName).toBe("main");
    expect(catalog.models.map((model) => model.name)).toEqual(["main", "alt"]);
    // 解析出的适配器可调用（未发请求）
    const adapter = catalog.registry.resolve("alt") as ModelAdapter;
    expect(typeof adapter.generate).toBe("function");
  });

  it("resolve 未知模型名显式报错", () => {
    const catalog = buildModelCatalog(defaultConfig, {});
    expect(() => catalog.registry.resolve("nope")).toThrow("unknown modelId");
  });
});
