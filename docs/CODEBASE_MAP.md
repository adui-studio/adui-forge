# ADui Forge — CODEBASE_MAP.md

> 代码库地图：当前实际结构。
> 最后更新：2026-09-13（v0.7.0）

---

# 1. 顶层结构

```text
adui-forge/
│
├─ AGENTS.md                  # Agent 开发规范（必读）
├─ README.md                  # 项目简介 / 功能总览 / 快速开始
├─ CHANGELOG.md               # 版本里程碑
├─ DesignGuidelines.md        # UI 设计规范（v0.6 前的界面基准）
├─ package.json               # 根工作区（Vite+ / pnpm）
├─ pnpm-workspace.yaml        # workspace 定义 + 依赖 catalog + allowBuilds
├─ tsconfig.json              # 根 TypeScript 配置（strict, nodenext）
├─ vite.config.ts             # Vite+ 统一配置（fmt / lint / run cache / staged）
├─ .env.example               # 环境变量清单
├─ .gitattributes / .gitignore
├─ .vscode/                   # 编辑器推荐配置
├─ .vite-hooks/               # Vite+ 管理的 git hooks（pre-commit: vp staged）
│
├─ apps/                      # 应用层（见 §2）
├─ packages/                  # 共享包层（见 §3）
│
├─ docs/
│  ├─ REQUIREMENTS.md         # 完整需求定义
│  ├─ ARCHITECTURE.md         # 总体架构
│  ├─ PROJECT_CONTEXT.md      # 项目上下文快照
│  ├─ CODEBASE_MAP.md         # 本文件
│  └─ decisions/              # 架构决策记录（ADR-001 ~ ADR-007）
│
├─ .agents/skills/            # 仓库级 Agent Skill（plan / bug-fixing / conventional-* 等）
├─ evals/                     # Agent 行为评估
├─ infra/                     # docker-compose（PostgreSQL / Redis 开发实例）
└─ scripts/                   # 发版 / 导入 / 构建辅助脚本（build-runner.mjs 等）
```

---

# 2. apps/

| 目录           | 职责                                            | 技术栈                                       |
| -------------- | ----------------------------------------------- | -------------------------------------------- |
| `apps/api`     | 云端平台 API（`/api/v1`）                       | NestJS 12 · Fastify · Prisma                 |
| `apps/web`     | 工作台 / 管理平台 / Workspace IDE（桌面壳共用） | React 19 · antd 6 · TanStack Query · i18next |
| `apps/desktop` | 桌面 Shell：窗口 + 系统能力 + Runner 进程管理   | Tauri 2 · Rust                               |
| `apps/runner`  | Local Runner：本地 workspace/runs/审批/终端     | Fastify · Bun sidecar                        |
| `apps/mobile`  | Runs / 审批 / Chat / 设置（连云端或本地 API）   | Flutter · Riverpod · go_router               |
| `apps/docs`    | 文档站                                          | Rspress 2                                    |

## 2.1 apps/api 模块（NestJS，全部显式 token 注入）

| 模块             | 路由             | 职责                                                        |
| ---------------- | ---------------- | ----------------------------------------------------------- |
| `auth/`          | `/auth`          | 用户注册 / 登录（argon2 + JWT）                             |
| `agents/`        | `/agents`        | Agent 注册表、自定义 Agent 配置、模型目录、工具池、MCP 观测 |
| `approvals/`     | `/approvals`     | 云端运行中审批闭环                                          |
| `compare/`       | `/comparisons`   | 对比批次存储 + 从 Run 派生结果 + 跨批次统计                 |
| `conversations/` | `/conversations` | Chat 会话持久化与消息追加                                   |
| `health/`        | `/health`        | 存活 + DB 状态                                              |
| `metrics/`       | `/metrics`       | Token / Run 指标                                            |
| `openapi/`       | `/openapi`       | OpenAPI 规范                                                |
| `runs/`          | `/runs`          | Run CRUD + SSE + 取消 + Session Memory                      |
| `skills/`        | `/skills`        | Skill 库 CRUD / 启停 / SKILL.md 导入                        |
| `tasks/`         | `/tasks`         | 任务台账（创建派生 Run，列表实时回填状态）                  |
| `workflows/`     | `/workflows`     | Workflow 定义注册 / 图执行                                  |
| `workspace/`     | `/workspace`     | 文件 tree/read/write/delete + Git 面板后端                  |

Agent 装配核心在 `agents/agent.factory.ts`（工具池 / 构建上下文 / 模型目录）与
`agents/agent-config.service.ts`（自定义配置 ↔ 注册表同步 + Skill 注入）。

## 2.2 apps/web 结构（React）

```text
src/
├─ App.tsx                    # 路由（全部 lazy 分块）
├─ components/                # app-shell（侧栏/命令面板）、workspace/{file-tree, agent-panel, terminal-panel}
├─ pages/                     # Home / Runs / RunDetail / Tasks / Chat / Agents / AgentDetail /
│                             # Workflows / WorkflowEditor / Skills / Tools / Mcp /
│                             # Approvals / Memory / Compare / Settings / Login
├─ lib/                       # api（REST 封装）、chat、compare、i18n、status、相对时间等
├─ hooks/                     # use-run-notifications（系统通知）
└─ platform/                  # PlatformAdapter（web/desktop 分发：Runner、通知、外链）
```

## 2.3 apps/runner 结构（Local Runner）

```text
src/
├─ index.ts                   # 入口：环境变量校验 + 装配 + 监听 127.0.0.1
├─ server.ts                  # Fastify：workspace/runs/审批/终端 同形 REST + token 握手
├─ agents.ts                  # 本地 Agent 装配（FORGE_MODEL_* + 文件工具 + Trusted Shell/Git）
├─ runs.ts                    # 内存 Runs 服务（后台执行 + SSE 订阅 + 取消）
└─ approvals.ts               # 本地审批服务（Pending + 决策 resolve）
```

分发：`scripts/build-runner.mjs` 用 `bun build --compile` 产出单文件 sidecar 到
`apps/desktop/src-tauri/binaries/`，Tauri 经 `bundle.externalBin` 打进安装包（ADR-007）。

---

# 3. packages/

| 包              | 职责                                                 | 关键内容                                                                                                         |
| --------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `contracts`     | Run / 事件（`domain.action`）/ 模型与工具协议（Zod） | `AGENT_EVENT_NAMES`、`AgentTool`                                                                                 |
| `agent`         | Agent 定义组装 + 注册表                              | `defineAgent`、`AgentRegistry.upsert/remove`                                                                     |
| `agent-runtime` | Agent Loop 领域核心                                  | `runAgent`、approval 处理器协议                                                                                  |
| `ai`            | Model Registry + OpenAI Compatible Provider Adapter  | `ModelRegistry`                                                                                                  |
| `tool-sdk`      | 工具 + Sandbox + Workspace 边界                      | `resolveInWorkspace`（三层防御）、文件/Git/Shell 工具、`HostSandbox`/`DockerSandbox`、`workspace-files` 共享实现 |
| `skill-sdk`     | Skill schema / 解析 / 渲染 / 系统提示词组装          | `parseSkillMarkdown` ↔ `renderSkillMarkdown`                                                                     |
| `workflow`      | 可序列化图定义 + 校验 + 编译 + 顺序/分支执行         | `graphToSteps`、`WorkflowRunner`                                                                                 |
| `mcp`           | MCP stdio 客户端 → AgentTool 桥接                    | `connectStdioServer`                                                                                             |
| `shared`        | 通用工具                                             | —                                                                                                                |

依赖方向：`apps → packages`；Domain 包不依赖 UI / Nest。

---

# 4. 数据与持久化

| 表              | 用途                              | 迁移                            |
| --------------- | --------------------------------- | ------------------------------- |
| `runs`          | Run 记录 + 事件流（Json）         | 20260829000000_init             |
| `users`         | 平台用户                          | 20260829000001_users            |
| `tasks`         | 任务台账                          | 20260829000002_tasks            |
| `workflows`     | Workflow 定义（linear / graph）   | 20260829000003 + 20260912000000 |
| `agent_configs` | 自定义 Agent（含 model / skills） | 20260912010000 + 20260912020000 |
| `conversations` | Chat 会话（消息 Json）            | 20260912030000                  |
| `skills`        | Skill 指令库                      | 20260912040000                  |
| `comparisons`   | 对比批次                          | 20260912050000                  |

未配置 `DATABASE_URL` 时：全部模块显式降级为内存实现（各 `*.store.ts` 双实现）。

---

# 5. 新增模块时同步更新本文件。
