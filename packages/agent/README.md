# @adui-forge/agent

Agent 定义组装（REQUIREMENTS.md §29）：把 model + tools + system prompt + Loop 默认值
组装成可运行的 Agent。

## 内容

- `defineAgent(definition)` — 返回带 `run(task, overrides)` 的 Agent；
  执行委托 `@adui-forge/agent-runtime` 的 `runAgent`，本层不重复实现 Loop
- `AgentRegistry` — 按 name 注册与解析，重名拒绝

## 约定

- 定义级默认值（maxSteps / timeoutMs / tokenLimit / systemPrompt）始终兜底，
  运行级仅可覆盖 runId / signal / approval / onEvent
- 一个 Agent 的 Tool 权限集合在定义处可审计；禁止运行期偷换 tools / model
