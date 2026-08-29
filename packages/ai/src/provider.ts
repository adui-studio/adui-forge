import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { ModelAdapter } from "@adui-forge/contracts";
import { createModelAdapter } from "./openai-compatible.ts";

export interface OpenAICompatibleAdapterConfig {
  /** Provider 标识，如 "openai" / "deepseek" / "ollama"。 */
  name: string;
  baseURL: string;
  apiKey?: string;
  modelId: string;
  headers?: Record<string, string>;
}

/**
 * OpenAI Compatible Provider Adapter（REQUIREMENTS.md §32）。
 * 一个适配器覆盖 OpenAI / DeepSeek / Ollama 及所有 OpenAI Compatible 端点；
 * modelId 由配置决定，禁止业务代码硬编码具体模型名。
 */
export const createOpenAICompatibleModelAdapter = (
  config: OpenAICompatibleAdapterConfig,
): ModelAdapter => {
  const provider = createOpenAICompatible({
    name: config.name,
    baseURL: config.baseURL,
    apiKey: config.apiKey,
    headers: config.headers,
  });
  return createModelAdapter(provider.chatModel(config.modelId));
};
