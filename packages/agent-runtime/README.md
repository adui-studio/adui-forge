# @adui-forge/agent-runtime

ADui Forge 的领域核心：Provider / UI / Transport 无关的 Agent Loop。

## 提供的能力

- `runAgent(model, tools, task, options)` — 有界 Agent Loop：
  - `maxSteps` / `timeoutMs` / `signal` / `tokenLimit` 四重退出机制
  - Tool 输入强制 Zod 校验，失败结果回喂模型而非崩溃
  - `permission: "approval"` 的 Tool 必须经过 `ApprovalHandler`，未提供处理器时返回 `waiting_approval`
  - 全程发出 `@adui-forge/contracts` 定义的 `domain.action` 事件
- `ModelAdapter` — 模型适配接口，业务代码禁止直接依赖具体 Provider SDK

## 边界

本包禁止依赖 React / Tauri / Flutter / Nest Controller / 具体 AI Provider SDK（AGENTS.md §32–33）。
