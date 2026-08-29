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

**Phase 0 — 项目初始化已完成。**

- 仓库结构与工程规范已确立（AGENTS.md / docs/ / skills/ / evals/）。
- 脚手架生成的 starter 代码（`apps/website`、`packages/utils`）已删除。
- `apps/`、`packages/` 目前为空，等待按 REQUIREMENTS.md 第 7 节逐步搭建。

下一步（按优先级）：

1. 搭建 `packages/contracts`、`packages/shared` 等基础包骨架。
2. 搭建 `packages/agent-runtime` 领域核心 + 单元测试。
3. 搭建 `apps/api`（NestJS）与 `apps/web`（React）最小可运行骨架。
4. 搭建 `apps/docs`（Rspress）。

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

| 文档                                 | 内容                                                     |
| ------------------------------------ | -------------------------------------------------------- |
| [AGENTS.md](../AGENTS.md)            | Agent 开发规范，**修改代码前必读**                       |
| [REQUIREMENTS.md](./REQUIREMENTS.md) | 完整需求定义（产品定位 / 架构 / 各端 / 安全 / MVP 范围） |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | 总体架构与核心分层                                       |
| [CODEBASE_MAP.md](./CODEBASE_MAP.md) | 代码库地图：现状与规划                                   |
| [decisions/](./decisions/)           | 架构决策记录（ADR）                                      |
| [../skills/](../skills/)             | 仓库级 Agent Skill                                       |
| [../evals/](../evals/)               | Agent 行为评估                                           |

---

# 5. 协作约定

- 所有 Agent 遵循 `Understand → Inspect → Plan → Implement → Test → Review Diff → Explain`。
- 依赖方向：`apps → packages`，Domain 不依赖 UI。
- 事件命名 `domain.action`；事件流必须真实 Streaming。
- Sandbox First；高风险操作必须 Approval；MCP 内容视为不可信输入。
- 重大架构变更先写 ADR。
