# @adui-forge/ai

Model Adapter 层（REQUIREMENTS.md §31–32）：Provider Independent 的模型接入。

## 内容

- `createModelAdapter(model)` — 把任意 AI SDK `LanguageModel` 桥接为 contracts 的 `ModelAdapter`；
  消息层完成 assistant tool-call 与 tool-result 的配对映射，工具执行权始终在 Agent Loop
- `createOpenAICompatibleModelAdapter({ name, baseURL, apiKey?, modelId })` — 一个适配器覆盖
  OpenAI / DeepSeek / Ollama 及所有 OpenAI Compatible 端点（Anthropic 等专用协议后续增量）
- `ModelRegistry` — modelId → ModelAdapter 的注册与解析；业务代码禁止硬编码模型名或
  直接依赖 OpenAI / Anthropic SDK

## 约定

- 本包不做静默重试（`maxRetries: 0`），重试策略由 Agent Loop / 调用方控制
- 新增 Provider：实现 contracts `ModelAdapter` 接口，并在 Registry 注册，不改动业务代码
