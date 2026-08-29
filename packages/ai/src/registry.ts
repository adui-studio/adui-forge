import type { ModelAdapter } from "@adui-forge/contracts";

export type ModelAdapterFactory = () => ModelAdapter;

/**
 * Model Registry（REQUIREMENTS.md §31）：modelId → ModelAdapter。
 * 业务代码通过 modelId 解析适配器，禁止散落 `new OpenAI()` 之类的直接依赖。
 */
export class ModelRegistry {
  readonly #factories = new Map<string, ModelAdapterFactory>();

  register(modelId: string, factory: ModelAdapterFactory): void {
    if (this.#factories.has(modelId)) {
      throw new Error(`model already registered: "${modelId}"`);
    }
    this.#factories.set(modelId, factory);
  }

  resolve(modelId: string): ModelAdapter {
    const factory = this.#factories.get(modelId);
    if (factory === undefined) {
      throw new Error(`unknown modelId: "${modelId}"`);
    }
    return factory();
  }

  list(): string[] {
    return [...this.#factories.keys()];
  }
}
