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

# 2.1 MVP 主开发阶段计划（✅ MVP-1 至 MVP-25 全部完成）

| 阶段    | 内容                                                                               | 状态    |
| ------- | ---------------------------------------------------------------------------------- | ------- |
| MVP-1   | 运行时协议下沉 `contracts`（`AgentTool` / `ModelAdapter` / 消息配对）              | ✅ 完成 |
| MVP-2   | `packages/tool-sdk`：`defineTool` / `ToolRegistry` / 文件工具 + Workspace 边界防御 | ✅ 完成 |
| MVP-3   | `packages/ai`：AI SDK 桥接 `ModelAdapter` + `ModelRegistry` + 端到端集成测试       | ✅ 完成 |
| MVP-4   | `packages/agent`：Agent 定义组装（system prompt + tools + model）                  | ✅ 完成 |
| MVP-4.5 | 文档站部署：GitHub Pages 与 Void（`void-deploy.yml`，OIDC）双通道并存              | ✅ 完成 |
| MVP-5   | `apps/api` Agent/Run Module + `packages/workflow` 前置契约                         | ✅ 完成 |
| MVP-6a  | Sandbox 接口 + `shell_exec` / Git 工具（Approval 闭环，Trusted Local Mode 门控）   | ✅ 完成 |
| MVP-6b  | Docker Sandbox 实现 + Prisma/PostgreSQL RunStore 持久化                            | ✅ 完成 |
| MVP-7   | Web 任务发起 / Run 列表 / Run 详情页 + SSE 实时事件流                              | ✅ 完成 |
| MVP-8   | token 级流式：`ModelCallContext` + `streamText` + `model.delta` 全链路             | ✅ 完成 |
| MVP-9   | `packages/workflow`：agent / tool / condition 节点引擎 + workflow.* 事件族         | ✅ 完成 |
| MVP-10  | `packages/mcp`：MCP Server 工具桥接（ajv 校验，默认 approval）                     | ✅ 完成 |
| MVP-11  | Approval API 闭环：PendingApproval + REST 决策 + waiting_approval 状态投影         | ✅ 完成 |
| MVP-12  | Web 审批页（批准 / 拒绝）+ Run 详情审批入口                                        | ✅ 完成 |
| MVP-13  | Workflow API：多任务编排复用 Run / SSE 通道                                        | ✅ 完成 |
| MVP-14  | Authentication：Argon2id + HS256 JWT + 全局 Guard（默认关闭）                      | ✅ 完成 |
| MVP-15  | CI 流水线（GitHub Actions 全量验收）                                               | ✅ 完成 |

> **首个 MVP 闭环达成**：任务发起 → Agent Loop 执行（模型 + 文件/Shell/Git 工具，
> Docker Sandbox，Approval 审批）→ 事件流 SSE 实时推送 → Run 持久化与可视化。
> | MVP-16 | Prisma UsersStore（AUTH 持久化） | ✅ 完成 |
> | MVP-17 | Web 登录/注册页（Bearer Token） | ✅ 完成 |
> | MVP-18 | Agents API（列表 + 工具清单） | ✅ 完成 |
> | MVP-19 | MCP Server 配置化接入（FORGE_MCP_SERVERS） | ✅ 完成 |
> | MVP-20 | Tasks API（任务派生 Run） | ✅ 完成 |
> | MVP-21 | Run 产物登记（Artifacts） | ✅ 完成 |
> | MVP-22 | Session Memory（摘要注入上下文） | ✅ 完成 |
> | MVP-23 | Observability metrics 端点 | ✅ 完成 |
> | MVP-24 | Web 首页会话化（最近 Run 列表） | ✅ 完成 |
> | MVP-25 | Dockerfile / compose 发布工程 | ✅ 完成 |

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
