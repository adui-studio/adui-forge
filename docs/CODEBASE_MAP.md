# ADui Forge — CODEBASE_MAP.md

> 代码库地图：当前实际结构 + 目标规划。
> 最后更新：2026-08-29

---

# 1. 当前实际结构

```text
adui-forge/
│
├─ AGENTS.md                  # Agent 开发规范（必读）
├─ README.md                  # 项目简介与常用命令
├─ package.json               # 根工作区（Vite+ / pnpm）
├─ pnpm-workspace.yaml        # workspace 定义 + 依赖 catalog
├─ tsconfig.json              # 根 TypeScript 配置（strict）
├─ vite.config.ts             # Vite+ 统一配置（fmt / lint / run cache / staged）
├─ .gitignore
├─ .vscode/                   # 编辑器推荐配置
├─ .vite-hooks/               # Vite+ 管理的 git hooks（pre-commit: vp staged）
│
├─ apps/                      # 应用层
│  ├─ api/                   # NestJS 12 + Fastify（/api/v1，P0）
│  ├─ web/                   # React 19 + Router + TanStack Query（P0）
│  └─ docs/                  # Rspress 2 文档站（P0）
├─ packages/                  # 共享包层
│  ├─ shared/                 # Result / ID 等通用工具
│  ├─ contracts/              # Run / Step / 事件 / 模型与工具协议（Zod Schema）
│  ├─ agent-runtime/          # Agent Loop 领域核心（P0）
│  ├─ tool-sdk/               # Tool 定义器 + 内置文件工具 + Workspace 边界防御（MVP-2）
│  └─ ai/                     # AI SDK 桥接 ModelAdapter + ModelRegistry（MVP-3）
│
├─ docs/
│  ├─ REQUIREMENTS.md         # 完整需求定义
│  ├─ ARCHITECTURE.md         # 总体架构
│  ├─ PROJECT_CONTEXT.md      # 项目上下文快照
│  ├─ CODEBASE_MAP.md         # 本文件
│  └─ decisions/              # 架构决策记录
│     ├─ ADR-001.md           # 工具链选型：Vite+ + pnpm Monorepo
│     └─ ADR-002.md           # 文档系统选型：Rspress
│
├─ .agents/
│  └─ skills/                 # 仓库级 Agent Skill
│     └─ <skill-name>/SKILL.md
│
└─ evals/                     # Agent 行为评估
   └─ cases/<case>/eval.yaml
```

当前 `apps/`、`packages/` 为空：脚手架 starter 已删除，按下方规划逐模块落地。

---

# 2. 目标规划

## 2.1 apps/

| 目录           | 职责                     | 技术栈                    |
| -------------- | ------------------------ | ------------------------- |
| `apps/web`     | 云端工作台 / 管理平台    | React · Vite+             |
| `apps/desktop` | 桌面 Shell，复用 Web UI  | Tauri 2 · Rust            |
| `apps/mobile`  | 查看 / 控制 / 审批 Agent | Flutter                   |
| `apps/api`     | 平台 API                 | NestJS · Fastify · Prisma |
| `apps/worker`  | 耗时任务执行             | BullMQ · Redis            |
| `apps/runner`  | Desktop Local Runner     | TypeScript                |
| `apps/docs`    | 文档站                   | Rspress                   |

## 2.2 packages/

| 分组 | 包                         | 职责                                       |
| ---- | -------------------------- | ------------------------------------------ |
| 核心 | `agent-runtime`            | Agent Loop / Run / Step / Context 领域核心 |
| 核心 | `ai`                       | Model Registry + Provider Adapter          |
| 核心 | `mcp`                      | MCP Client / Gateway                       |
| 核心 | `tool-sdk`                 | Tool 定义与执行                            |
| 核心 | `skill-sdk`                | Skill 加载与执行                           |
| 核心 | `sandbox`                  | 沙箱执行环境                               |
| 核心 | `workflow`                 | Workflow Definition 与运行时               |
| 协议 | `contracts`                | API / Domain 契约                          |
| 协议 | `protocol`                 | 事件协议（`domain.action`）                |
| 协议 | `client-sdk`               | OpenAPI 生成的 TS / Dart Client            |
| 共享 | `ui` / `shared` / `config` | 组件、工具、共享配置                       |

依赖方向：`apps → packages`；Domain 包不依赖 UI。

---

# 3. 落地顺序

```text
1. packages/contracts + packages/shared      # 契约与工具先行
2. packages/agent-runtime + tool-sdk + ai    # 领域核心 + 测试
3. apps/api                                  # NestJS 骨架 + Prisma Migration
4. apps/web                                  # React 最小可运行
5. apps/worker + sandbox                     # 执行闭环
6. apps/desktop + runner                     # 本地能力
7. apps/mobile                               # 审批与观察
8. apps/docs                                 # Rspress 文档站
```

新增模块时同步更新本文件。
