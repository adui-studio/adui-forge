# ADui Forge

**ADui Forge — Agent-Driven Development Platform**

一个面向开发者与研发团队的 Agent 驱动软件开发平台：开发者描述意图与边界，
Agent 负责理解、规划、检索、修改、测试、修复与交付，高风险操作由人工审批。

当前版本 **v0.7.x**（v0.7.0 起 Workspace IDE 与本地 Agent 闭环已随安装包发布）。

---

## 功能总览

| 域                | 能力                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------ |
| **Agent 运行**    | 流式 Run（SSE）、事件时间线、取消 / 重试、Token 限额、approval 审批闭环              |
| **Agent 管理**    | 自定义 Agent（systemPrompt / 工具 / 模型 / 循环参数），内置 Agent 只读展示           |
| **模型目录**      | `FORGE_MODELS` 命名模型（OpenAI Compatible 多 Provider），Agent 级模型选择           |
| **Skill 系统**    | 指令库 CRUD、启停、注入 Agent 系统提示词、SKILL.md 导入 / 导出双向闭环               |
| **Workflow**      | 可序列化条件分支图（agent / condition 节点）、可视化编辑器（自由连线）、图校验与执行 |
| **Workspace IDE** | 文件树 + Monaco 多 Tab 编辑 + Git 面板（status / diff / commit）+ Agent 面板 + 终端  |
| **Local Runner**  | 桌面本地闭环：同形 REST（workspace / runs / 审批 / 终端），Bun sidecar 随安装包分发  |
| **Chat / 会话**   | 流式对话、会话持久化、历史切换 / 重命名 / 删除、失败重试、编辑文件上下文注入         |
| **任务台账**      | Tasks：新建即派生 Run，实时状态回填                                                  |
| **对比分析**      | 多 Agent 并排流式对比 + 批次持久化 + 跨批次胜负统计                                  |
| **MCP**           | `FORGE_MCP_SERVERS` 服务连接状态观测与按需重连测试                                   |
| **审批**          | 高风险操作（Shell / Git 写入）人工批准 / 拒绝，云端与本地语义一致                    |
| **多端**          | Web（浏览器）、Desktop（Tauri，本地 Runner）、Mobile（Flutter：Runs / 审批 / Chat）  |
| **i18n**          | 简体中文 / English 全界面切换（含 antd locale），偏好持久化                          |

---

## 架构速览

```text
┌──────────────────────────────────────────────────────┐
│  Web (React)      Desktop (Tauri + React)   Mobile   │
│       │                  │        (Flutter)           │
│       │   PlatformAdapter│             │              │
│       │        ┌─────────┴─────────┐   │              │
│       ▼        ▼                   ▼   ▼              │
│   Cloud API            Local Runner (Bun sidecar)     │
│   NestJS API               │                          │
│   PostgreSQL/Redis    文件/Runs/审批/终端（同形 REST） │
└──────────────────────────────────────────────────────┘
```

- 云端 API 与本地 Runner 对前端暴露**同一套 REST 形状**，`PlatformAdapter` 负责分发；
- Agent Domain（Loop / 工具 / 沙箱边界 / Skill 组装）在 `packages/`，两端共用；
- 决策记录见 [docs/decisions/](docs/decisions/)（ADR-001 ~ ADR-007）。

---

## 文档

**文档站（在线）：<https://adui-studio.github.io/adui-forge/>** — GitHub Pages 托管，
push 到 main 且 `apps/docs/**` 有变更时经 [deploy-docs.yml](.github/workflows/deploy-docs.yml) 自动部署。

| 文档                                               | 内容                             |
| -------------------------------------------------- | -------------------------------- |
| [AGENTS.md](AGENTS.md)                             | Agent 开发规范（修改代码前必读） |
| [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md)       | 完整需求定义                     |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)       | 总体架构                         |
| [docs/CODEBASE_MAP.md](docs/CODEBASE_MAP.md)       | 代码库地图（现状）               |
| [docs/PROJECT_CONTEXT.md](docs/PROJECT_CONTEXT.md) | 项目上下文快照                   |
| [docs/decisions/](docs/decisions/)                 | 架构决策记录（ADR-001 ~ 007）    |
| [CHANGELOG.md](CHANGELOG.md)                       | 版本里程碑                       |
| [.agents/skills/](.agents/skills/)                 | 仓库级 Agent Skill               |
| [evals/](evals/)                                   | Agent 行为评估用例               |

## 技术栈

```text
工具链   Vite+ · pnpm · TypeScript · ESM
Web      React 19 · TanStack Query · antd 6 · Tailwind · i18next
Desktop  Tauri 2 · Rust · Bun sidecar（Local Runner）
Mobile   Flutter · Riverpod · go_router
Backend  NestJS 12 · Fastify · Prisma · PostgreSQL · Redis
Runner   Fastify · Bun --compile（单文件 sidecar）
AI       AI SDK（OpenAI Compatible）· MCP TypeScript SDK v2
编辑器   Monaco（@monaco-editor/react，路由级懒加载）
终端     @xterm/xterm（管道模式）
测试     Vitest · Cargo Test · Flutter Test
```

## 快速开始（云端开发模式）

```bash
pnpm install
cp .env.example apps/api/.env    # 配置 FORGE_MODEL_*（必需）与 DATABASE_URL（可选）
pnpm --filter @adui-forge/api dev        # API :3000
pnpm --filter @adui-forge/web dev -- --port 5175   # Web :5175（桌面壳共用此端口）
```

浏览器打开 <http://localhost:5175>。未配置数据库时以内存模式运行（重启数据清空）。

## 桌面端（Tauri）

```bash
pnpm --filter @adui-forge/web build      # 构建前端资源
node scripts/build-runner.mjs windows-x64  # 构建 Runner sidecar
pnpm --filter @adui-forge/desktop bundle # 产出 NSIS / MSI 安装包
```

安装后：工作区页指定本地目录 → 「启动 Local Runner」→ 文件编辑 / Git / 终端 /
本地 Agent 全部走本机进程；Shell/Git 能力需在工作区页显式开启
**Trusted Local Mode**（默认关闭，开启后高风险操作仍需审批）。

## 本地 Runner（独立运行）

```bash
FORGE_WORKSPACE_ROOT=/path/to/project \
FORGE_MODEL_BASE_URL=... FORGE_MODEL_ID=... \
RUNNER_TOKEN=任意随机串 RUNNER_PORT=0 \
node --import tsx/esm apps/runner/src/index.ts
# 仅监听 127.0.0.1；REST 与云端 API 同形
```

## 环境变量

完整清单见 [.env.example](.env.example)。关键项：

| 变量                                      | 说明                                                    |
| ----------------------------------------- | ------------------------------------------------------- |
| `DATABASE_URL`                            | PostgreSQL；未配置时全端内存模式降级（显式、不静默）    |
| `FORGE_MODEL_BASE_URL` / `FORGE_MODEL_ID` | 默认模型（OpenAI Compatible）；未配置时 Agent 不注册    |
| `FORGE_MODELS`                            | 命名模型目录 JSON（自定义 Agent 可选模型）              |
| `FORGE_WORKSPACE_ROOT`                    | 云端 Workspace 文件 API 的根目录                        |
| `FORGE_TRUSTED_LOCAL_MODE`                | `1` = 本地 Agent 装配 Shell/Git（HostSandbox，ADR-006） |
| `FORGE_SKILLS_DIR`                        | SKILL.md 导入目录                                       |
| `FORGE_MCP_SERVERS`                       | MCP 服务 JSON 数组                                      |

## 开发

```bash
pnpm install        # 安装依赖
vp check            # Lint + Format + Type Check
vp test             # 运行测试
vp build            # 构建
vp run ready        # check + test + build 全量检查（CI 同款）
```

要求：Node.js >= 22.18，包管理只使用 pnpm。构建 Runner sidecar 需要 Bun。

## 安全要点

- Workspace 文件操作统一经 `resolveInWorkspace` 三层边界（路径遍历 / symlink 逃逸 /
  存在性），单文件写上限 1 MiB，二进制扩展名拒绝；
- Shell / Git 写入为 approval 级工具，执行前阻塞等待人工批准（云端与本地一致）；
- Local Runner 仅监听 127.0.0.1 + Bearer token 握手；token 由 Tauri 生成、不落盘；
- API Key 支持 `apiKeyEnv` 间接引用环境变量，不进入配置文件与日志。
