# ADui Forge — PROJECT_CONTEXT.md

> 给任何新加入的 Agent / 开发者的项目上下文快照。
> 最后更新：2026-08-29

---

# 1. 这是什么项目

**ADui Forge** 是一个 Agent 驱动的软件开发平台（Agent-Driven Development Platform）。

定位：不是 AI Chat，也不是代码补全工具，而是让 Agent 真正执行软件工程的平台——
开发者描述意图与边界，Agent 负责理解、规划、检索、修改、测试、修复、交付，
高风险操作交由人工审批。

核心理念：

```text
Developer defines intent
        ↓
Agent understands context → plans → uses Skills
        ↓
Agent calls Tools / MCP → operates in Sandbox
        ↓
Code / Test / Build / Review
        ↓
Human Approval → Deliver
```

---

# 2. 当前阶段

**P0 — 可运行的领域核心骨架（已完成）。**

P0 目标：建立领域核心与最小可运行闭环的骨架，验收标准为 `pnpm run ready`（check / test / build）全绿。

- [x] 仓库结构与工程规范（AGENTS.md / docs/ / .agents/skills/ / evals/）。
- [x] `packages/shared` — Result / ID 等通用工具。
- [x] `packages/contracts` — Run 状态、Step 类型、`domain.action` 事件契约（Zod Schema）。
- [x] `packages/agent-runtime` — Agent Loop 核心（maxSteps / timeout / abort / tokenLimit /
      tool 权限与 approval），Provider / UI / Transport 无关，13 个单元测试。
- [x] `apps/api` — NestJS 12 + Fastify 最小骨架（`GET /api/v1/health`，冒烟验证通过）。
- [x] `apps/web` — React 19 + React Router 8 + TanStack Query 最小骨架。
- [x] `apps/docs` — Rspress 2 文档站。

# 2.1 MVP 主开发阶段计划（进行中）

| 阶段  | 内容                                                                               | 状态      |
| ----- | ---------------------------------------------------------------------------------- | --------- |
| MVP-1 | 运行时协议下沉 `contracts`（`AgentTool` / `ModelAdapter` / 消息配对）              | ✅ 完成   |
| MVP-2 | `packages/tool-sdk`：`defineTool` / `ToolRegistry` / 文件工具 + Workspace 边界防御 | ✅ 完成   |
| MVP-3 | `packages/ai`：AI SDK 桥接 `ModelAdapter` + `ModelRegistry` + 端到端集成测试       | ✅ 完成   |
| MVP-4 | `packages/agent`：Agent 定义组装（system prompt + tools + model）                  | ⏳ 待开始 |
| MVP-5 | `apps/api` Agent/Run Module + `packages/workflow` 前置契约                         | ⏳ 待开始 |
| MVP-6 | Sandbox（Docker）+ Shell/Git 工具 + Approval 闭环                                  | ⏳ 待开始 |
| MVP-7 | Web Chat / Run 页面 + SSE Streaming                                                | ⏳ 待开始 |

---

# 3. 技术栈摘要

| 层      | 技术                                                                   |
| ------- | ---------------------------------------------------------------------- |
| 工具链  | Vite+ · pnpm · TypeScript · ESM                                        |
| Web     | React · React Router · TanStack Query · Zustand · Tailwind · shadcn/ui |
| Desktop | Tauri 2 · Rust                                                         |
| Mobile  | Flutter · Riverpod · go_router · Dio · Freezed                         |
| Backend | NestJS · Fastify · Prisma · PostgreSQL · Redis · BullMQ                |
| AI      | AI SDK · MCP TypeScript SDK v2                                         |
| 文档    | Rspress                                                                |
| 测试    | Vitest · Playwright · Flutter Test · Cargo Test                        |

---

# 4. 关键文档索引

| 文档                                     | 内容                                                     |
| ---------------------------------------- | -------------------------------------------------------- |
| [AGENTS.md](../AGENTS.md)                | Agent 开发规范，**修改代码前必读**                       |
| [REQUIREMENTS.md](./REQUIREMENTS.md)     | 完整需求定义（产品定位 / 架构 / 各端 / 安全 / MVP 范围） |
| [ARCHITECTURE.md](./ARCHITECTURE.md)     | 总体架构与核心分层                                       |
| [CODEBASE_MAP.md](./CODEBASE_MAP.md)     | 代码库地图：现状与规划                                   |
| [decisions/](./decisions/)               | 架构决策记录（ADR）                                      |
| [../.agents/skills/](../.agents/skills/) | 仓库级 Agent Skill                                       |
| [../evals/](../evals/)                   | Agent 行为评估                                           |

---

# 5. 协作约定

- 所有 Agent 遵循 `Understand → Inspect → Plan → Implement → Test → Review Diff → Explain`。
- 依赖方向：`apps → packages`，Domain 不依赖 UI。
- 事件命名 `domain.action`；事件流必须真实 Streaming。
- Sandbox First；高风险操作必须 Approval；MCP 内容视为不可信输入。
- 重大架构变更先写 ADR。
