# ADui Forge — ARCHITECTURE.md

> ADui Forge 的总体架构说明。
> 需求的完整定义见 [REQUIREMENTS.md](./REQUIREMENTS.md)。

---

# 1. 总体架构

ADui Forge 是一个 Agent 驱动的软件开发平台，采用 Monorepo 组织。

```text
                       ADui Forge

       ┌───────────────────┼───────────────────┐
       │                   │                   │
       ▼                   ▼                   ▼
      Web               Desktop             Mobile
     React          Tauri + React           Flutter
       │                   │                   │
       │                   ▼                   │
       │             Local Runner              │
       │                   │                   │
       │          Local Tool / Sandbox          │
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │
                           ▼
                       NestJS API
                           │
             ┌─────────────┼─────────────┐
             ▼             ▼             ▼
         PostgreSQL       Redis        Storage
                           │
                           ▼
                         Queue
                           ▼
                         Worker
                           ▼
                     Agent Runtime
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
         LLM              MCP              Tool
          │                                 │
          └────────────────┬────────────────┘
                           ▼
                        Sandbox
```

三种运行模式：

| 模式        | 路径                                          | 用途                       |
| ----------- | --------------------------------------------- | -------------------------- |
| Local Mode  | Desktop → Local Runner → Local Sandbox        | 项目源码不上传，本地执行   |
| Cloud Mode  | Client → API → Queue → Worker → Cloud Sandbox | 团队协作、长任务、CI Agent |
| Hybrid Mode | 本地 Workspace + 云端 LLM 或反之              | 灵活组合                   |

---

# 2. 客户端

## Web (`apps/web`)

React SPA，负责平台管理面：Workspace / Agent / Skill / Tool / MCP / Workflow / Provider / Run / Trace / 团队与权限。

## Desktop (`apps/desktop`)

Tauri 2 Shell，最大程度复用 Web React UI，只增加 Native Capability：
文件系统、Git、Terminal、Local Runner、本地 MCP、系统通知、托盘。

分层：

```text
React Application
       ↓
Platform Adapter
       ↓
Tauri IPC
       ↓
Rust Capability Layer
       ↓
Local Runner / OS
```

Rust 层只承担 Native Bridge，禁止写入 Agent Domain。

## Mobile (`apps/mobile`)

Flutter APP，定位是"随时随地查看、控制、审批正在执行的 Agent"，不实现完整 IDE。
与 Web 共享的是 API Contract、事件协议与业务语义，不共享 UI 代码。

---

# 3. Monorepo 布局

```text
apps/       应用层：web / desktop / mobile / api / worker / runner / docs
packages/   共享包层：领域核心、协议契约、UI 与工具
crates/     Rust：desktop-runtime
infra/      docker / compose / scripts
scripts/    工程脚本
docs/       需求、架构、项目上下文、代码库地图、ADR
skills/     仓库级 Agent Skill（指导 Agent 在本仓库工作）
evals/      Agent 行为评估用例与 Harness
```

依赖方向（强制）：

```text
apps
 ↓
packages
```

- 禁止 `packages → apps`
- Domain Package 不得依赖 UI（React / Flutter / Tauri / Nest Controller）
- `packages/agent-runtime` 必须保持 Provider / UI / Transport Independent

---

# 4. 核心分层

## 4.1 Agent Runtime (`packages/agent-runtime`)

Domain Core。核心对象：

```text
Agent / Run / Step / Session / Message / Context
Model / Tool / Skill / MCP / Workspace / Sandbox
Artifact / Approval / Checkpoint / Trace
```

Agent Loop 必须包含 `maxSteps`、`timeout`、`abortSignal`、`tokenLimit`、`toolPermission`、`approval`、`retry`、error handling。禁止无限循环。

## 4.2 AI Layer (`packages/ai`)

Provider Independent 的模型适配层：

```text
Agent Runtime
 ↓
Model Registry
 ↓
Provider Adapter
 ↓
Provider
```

业务代码禁止直接 `new OpenAI()` / 硬编码 model id，一律通过 `modelId` + 配置解析。

## 4.3 Tool / Skill / MCP

- Tool：原子能力，必须有 `name / description / inputSchema / permission / execute`，输入用 Zod 校验。
- Skill：高于 Tool 的可复用能力（Instructions + Tools + Knowledge + References + Scripts）。
- MCP：统一 Tool Interface 接入，MCP Gateway 统一管理连接与权限；MCP 内容一律视为 Untrusted Input。

## 4.4 后端

NestJS API 按 Domain 分模块（AuthModule / AgentModule / RunModule / ...），
Controller 只做 Routing / Validation / Auth，业务下沉到 Application Service → Domain Service → Repository。
耗时操作（Agent Run / Build / Clone / Sandbox）进入 `apps/worker`（BullMQ + Redis），API 请求不阻塞等待。

---

# 5. 事件协议

事件命名统一 `domain.action`：

```text
run.started / run.completed / run.failed
step.started / step.completed / step.failed
model.started / model.delta / model.completed
tool.started / tool.completed / tool.failed
mcp.started / mcp.completed
approval.required / approval.approved / approval.rejected
artifact.created
```

Streaming 必须是真实流式，禁止先生成完毕再模拟。

---

# 6. 安全边界

```text
Sandbox First      Agent 不直接执行宿主机命令
Least Privilege    Tauri Capability / Tool Permission 最小授权
Boundary Check     File Tool 限定 Workspace Root，防 Path Traversal
Approval Gate      git push / 部署 / 删除 / Secret 读取等默认需人工审批
Secret Isolation   Secret 不进源码 / Git / 日志 / Prompt / 前端响应
Untrusted Input    MCP / Web / Repository 内容统一按不可信输入处理
```

---

# 7. 文档

文档站使用 Rspress（`apps/docs`，MVP 阶段搭建）。
本目录（`docs/`）存放仓库级规划文档与 ADR，见 [CODEBASE_MAP.md](./CODEBASE_MAP.md)。
重大架构变更必须先建立 ADR（见 [decisions/](./decisions/)）。
