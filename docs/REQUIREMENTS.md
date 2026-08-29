# ADui Forge — REQUIREMENTS.md

> Agent-Driven Development Platform  
> 一个面向开发者与研发团队的 Agent 驱动软件开发平台。

---

# 1. 项目概述

## 1.1 项目名称

**ADui Forge**

英文全称：

**ADui Forge — Agent-Driven Development Platform**

建议仓库名称：

```text
adui-forge
```

产品标识：

```text
ADui Forge
Powered by ADui
```

---

# 2. 产品定位

ADui Forge 不是传统 AI Chat，也不是简单的 AI 代码补全工具。

ADui Forge 的目标是建立一个真正的：

> **Agent 驱动的软件开发平台。**

开发者负责描述：

- 我要做什么
- 最终目标是什么
- 有哪些业务限制
- 哪些操作需要人工确认

Agent 负责：

- 理解需求
- 分析代码
- 检索项目
- 制定计划
- 修改代码
- 创建文件
- 执行命令
- 安装依赖
- 调用工具
- 调用 MCP
- 执行测试
- 分析错误
- 自动修复
- 查看 Git Diff
- 执行开发工作流
- 调用其他 Agent
- 生成最终成果

核心理念：

```text
Developer defines intent
        ↓
Agent understands context
        ↓
Agent plans
        ↓
Agent uses Skills
        ↓
Agent calls Tools / MCP
        ↓
Agent operates in Sandbox
        ↓
Code / Test / Build / Review
        ↓
Human Approval
        ↓
Deliver
```

最终目标：

> 从“AI 辅助编程”逐步发展为“AI Agent 执行软件工程”。

---

# 3. 核心设计原则

ADui Forge 必须遵循：

```text
Agent First
Developer in Control
Local First where appropriate
Cloud Ready
Model Agnostic
Provider Agnostic
Tool Agnostic
MCP Native
Sandbox First
Human Approval
Observable
Recoverable
Secure by Default
API First
Cross Platform
Extensible
```

---

# 4. 客户端架构

ADui Forge 提供三个主要客户端。

## 4.1 Web

技术：

```text
Vite+
React
TypeScript
```

定位：

```text
云端开发工作台
管理平台
Agent 管理
任务管理
Workflow
MCP
Skill
模型配置
团队协作
运行记录
```

---

## 4.2 PC Desktop

技术：

```text
Tauri 2
React
Vite+
TypeScript
Rust
```

支持：

```text
Windows
macOS
Linux
```

Desktop 是 ADui Forge 的核心开发客户端。

负责连接：

```text
本地项目
本地文件系统
Git
Terminal
Docker
Node.js
Python
本地 CLI
本地模型
本地 MCP Server
本地 Sandbox
```

Tauri 不只是 Web 打包工具。

其定位是：

> ADui Forge 与开发者本地开发环境之间的安全桥梁。

---

## 4.3 Mobile APP

技术：

```text
Flutter
Dart
```

支持：

```text
Android
iOS
```

APP 不实现完整 IDE。

APP 核心定位：

> 随时随地查看、控制、审批正在执行的 Agent。

主要功能：

```text
Dashboard
Workspace
Agent
Chat
Run
Task
Approval
Git Diff
Notification
Settings
```

---

# 5. 多端职责

## Web

负责：

- 平台管理
- Workspace 管理
- Agent 配置
- Skill 管理
- Tool 管理
- MCP 管理
- Workflow 编排
- Provider 管理
- Run 查看
- Trace 查看
- 团队协作
- 权限管理

## Desktop

在 Web 能力基础上增加：

- 打开本地项目
- 本地 Workspace
- 文件系统
- Git
- Terminal
- 本地 CLI
- Docker
- Local Runner
- Local Sandbox
- 本地 MCP
- 本地模型
- 系统通知
- 系统托盘
- Deep Link

## Mobile

负责：

- 查看 Workspace
- 与 Agent 对话
- 新建任务
- 查看任务
- 查看 Agent 状态
- 查看执行进度
- 查看日志
- 查看 Git Diff
- Approval
- Cancel
- Retry
- Resume
- Notification

Mobile 不承担：

- 完整代码编辑
- 完整 Terminal
- 本地 Sandbox
- Docker 管理
- 重型 Workflow 编辑

---

# 6. 总体架构

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
             │             │             │
             ▼             ▼             ▼
         PostgreSQL       Redis        Storage
                           │
                           ▼
                         Queue
                           │
                           ▼
                         Worker
                           │
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

---

# 7. Monorepo

项目采用 Monorepo。

推荐目录：

```text
adui-forge/
│
├─ apps/
│  ├─ web/
│  ├─ desktop/
│  ├─ mobile/
│  ├─ api/
│  ├─ worker/
│  ├─ runner/
│  └─ docs/
│
├─ packages/
│  ├─ agent-runtime/
│  ├─ ai/
│  ├─ mcp/
│  ├─ tool-sdk/
│  ├─ skill-sdk/
│  ├─ sandbox/
│  ├─ workflow/
│  ├─ contracts/
│  ├─ client-sdk/
│  ├─ protocol/
│  ├─ ui/
│  ├─ shared/
│  └─ config/
│
├─ crates/
│  └─ desktop-runtime/
│
├─ infra/
│  ├─ docker/
│  ├─ compose/
│  └─ scripts/
│
├─ scripts/
│
├─ docs/
│  ├─ REQUIREMENTS.md
│  ├─ ARCHITECTURE.md
│  ├─ PROJECT_CONTEXT.md
│  ├─ CODEBASE_MAP.md
│  └─ decisions/
│
├─ skills/
│
├─ evals/
│
├─ AGENTS.md
├─ README.md
├─ package.json
├─ pnpm-workspace.yaml
└─ vite.config.ts
```

---

# 8. 工程工具链

统一采用：

```text
Vite+
pnpm
TypeScript
ESM
```

Vite+ 作为 JavaScript / TypeScript 项目的统一工具链。

优先使用：

```bash
vp install
vp add
vp remove
vp dev
vp check
vp test
vp build
vp run
```

优先使用 Vite+ 已有能力：

```text
Vite
Rolldown
Vitest
Oxlint
Oxfmt
Vite Task
```

原则上不额外引入：

```text
ESLint
Prettier
Turbo
Nx
Lerna
```

除非现有能力不能解决实际需求。

---

# 9. 版本策略

依赖遵循：

> Latest Stable，而不是 Latest Everything。

默认：

- 使用当前稳定 Major Version
- 禁止默认使用 Alpha
- 禁止默认使用 Beta
- 禁止默认使用 RC
- 禁止默认使用 Canary
- 禁止默认使用 Nightly

项目初始化时：

```text
package.json
pnpm-lock.yaml
pubspec.lock
Cargo.lock
```

共同锁定实际版本。

文档不长期绑定无必要的 Patch Version。

---

# 10. TypeScript

TypeScript 当前统一采用：

```text
TypeScript 6.x
```

开启严格模式：

```json
{
  "strict": true
}
```

在没有完成完整兼容性验证之前，不允许单独将某个 Workspace 升级到新的 TypeScript Major Version。

---

# 11. Web 技术栈

`apps/web`

核心：

```text
React 19
TypeScript
Vite+
React Router
```

UI：

```text
Tailwind CSS
shadcn/ui
Base UI
Lucide
Sonner
```

状态：

```text
TanStack Query
Zustand
```

表单：

```text
React Hook Form
Zod
```

复杂 UI：

```text
Monaco Editor
xterm.js
React Flow
TanStack Virtual
```

Agent Streaming：

```text
SSE
WebSocket
AI Streaming Protocol
```

---

# 12. Web 页面

至少包括：

```text
Login

Dashboard

Workspaces
Workspace Detail

Agents
Agent Detail
Agent Editor

Chat

Tasks

Runs
Run Detail

Workflows
Workflow Editor

Skills
Tools
MCP Servers

Models
Providers

Sandboxes

Secrets

Users
Roles

Settings
```

---

# 13. Workspace IDE

Desktop / Web Workspace 采用 IDE 风格布局。

```text
┌────────────────────────────────────────────────────────┐
│ Toolbar                                                │
├────────────┬────────────────────────┬──────────────────┤
│ Explorer   │ Editor                 │ Agent            │
│            │                        │                  │
│ Files      │ Monaco                 │ Chat             │
│ Search     │ Diff                   │ Plan             │
│ Git        │ Preview                │ Tool Calls       │
│            │                        │                  │
├────────────┴────────────────────────┴──────────────────┤
│ Terminal │ Problems │ Output │ Tests │ Trace │ Git     │
└────────────────────────────────────────────────────────┘
```

支持 Panel Resize。

---

# 14. Desktop 技术架构

`apps/desktop`

采用：

```text
Tauri 2
Rust
React
Vite+
```

React UI 尽量与 Web 共用。

禁止重新开发一套 Desktop UI。

架构：

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

---

# 15. Platform Adapter

前端不得直接到处判断：

```ts
if (isTauri) {
}
```

建立统一接口：

```ts
interface PlatformAdapter {
  openDirectory(): Promise<string | null>;

  openExternal(url: string): Promise<void>;

  showNotification(input: NotificationInput): Promise<void>;

  getPlatformInfo(): Promise<PlatformInfo>;

  connectLocalRunner(): Promise<RunnerConnection | null>;
}
```

提供：

```text
WebPlatformAdapter
DesktopPlatformAdapter
```

业务 UI 不关心当前运行于 Browser 还是 Tauri。

---

# 16. Tauri Rust 职责

Rust 只承担 Native Capability。

包括：

```text
File Picker
Window
System Tray
Deep Link
Notification
Secure Storage
Process Management
Local Runner Lifecycle
OS Information
Native Menu
```

禁止将以下业务迁移进 Rust：

```text
Agent Runtime
Workspace Domain
Workflow
用户业务
模型业务
Task 业务
Prompt 业务
MCP Domain
```

这些继续由 TypeScript Domain / NestJS 负责。

---

# 17. Local Runner

`apps/runner`

Local Runner 是 Desktop 非常重要的组件。

职责：

```text
管理本地 Workspace
启动 Sandbox
控制 Process
执行 Shell
调用 Git
调用本地 MCP
调用本地 CLI
启动 Agent Run
收集日志
发送 Run Event
```

Desktop：

```text
Tauri
 ↓
Local Runner
 ↓
Agent Runtime
 ↓
Sandbox
```

Tauri WebView 不直接获得无限系统权限。

---

# 18. Local Mode

Desktop 支持 Local Mode。

流程：

```text
Desktop
 ↓
Local Runner
 ↓
Local Agent Runtime
 ↓
Local Model / Remote LLM
 ↓
Local Tool
 ↓
Local Sandbox
 ↓
Project
```

用户可以在不上传项目源码的情况下执行 Agent。

---

# 19. Cloud Mode

Cloud Mode：

```text
Client
 ↓
NestJS
 ↓
Queue
 ↓
Worker
 ↓
Agent Runtime
 ↓
Cloud Sandbox
```

用于：

```text
远程运行
团队协作
后台执行
长任务
CI Agent
Workflow
自动 Code Review
```

---

# 20. Hybrid Mode

Desktop 可以使用：

```text
本地项目
+
云端 LLM
+
本地 Sandbox
```

也可以：

```text
云端 Workspace
+
云端 Worker
+
云端 Sandbox
```

架构必须允许 Local / Cloud / Hybrid。

---

# 21. Flutter APP

`apps/mobile`

使用：

```text
Flutter Stable
Dart
```

推荐基础依赖：

```text
flutter_riverpod
go_router
dio
freezed
json_serializable
flutter_secure_storage
web_socket_channel
```

UI 优先遵循：

```text
Material 3
```

APP 与 Web 不共享 UI 代码。

共享的是：

```text
API Contract
业务语义
事件协议
模型定义
```

---

# 22. Mobile API

NestJS OpenAPI 是跨客户端 API Contract 的标准来源。

根据 OpenAPI 生成：

```text
TypeScript Client
Dart Client
```

禁止：

```text
Web 自己定义一套 DTO
Flutter 再手写一套 DTO
```

---

# 23. 后端

`apps/api`

采用：

```text
NestJS
Fastify
TypeScript
```

主要职责：

```text
Authentication
Authorization
Workspace
Agents
Runs
Tasks
Workflow
Provider
Model
MCP
Skill
Tool
Secrets
Approval
Audit
Team
API
```

API：

```text
REST
SSE
WebSocket
```

---

# 24. API 协议

统一：

```text
/api/v1
```

OpenAPI：

```text
/api/docs
```

REST：

```text
CRUD
业务命令
查询
```

SSE：

```text
LLM Streaming
Agent Event
Run Event
```

WebSocket：

```text
Terminal
Runner Connection
实时协作
高频双向事件
```

---

# 25. Worker

`apps/worker`

负责耗时任务：

```text
Agent Run
Workflow Run
Repository Clone
Sandbox
Build
Test
Index
Code Review
Long-running Tool
Artifact
```

使用：

```text
BullMQ
Redis
```

禁止 NestJS HTTP Request 长时间同步执行 Agent。

---

# 26. Database

数据库：

```text
PostgreSQL
```

ORM：

```text
Prisma
```

使用当前稳定版本。

生产环境禁止 SQLite。

---

# 27. Redis

Redis 用于：

```text
BullMQ
Cache
Distributed Lock
Rate Limit
Transient State
Run Presence
```

永久业务数据不能只存 Redis。

---

# 28. Object Storage

Artifact 使用：

```text
S3 Compatible Storage
```

开发环境：

```text
MinIO
```

可存储：

```text
Build Artifact
Patch
Report
Log
Image
Export
Snapshot
```

---

# 29. Agent Runtime

`packages/agent-runtime`

这是 ADui Forge 的核心。

核心对象：

```text
Agent
Run
Step
Session
Message
Context
Model
Tool
Skill
MCP
Workspace
Sandbox
Artifact
Approval
Checkpoint
Trace
```

Runtime 不依赖：

```text
React
Flutter
Tauri UI
Nest Controller
具体 AI Provider
```

---

# 30. Agent Loop

典型执行：

```text
Task
 ↓
Context Build
 ↓
Planning
 ↓
Model
 ↓
Tool Call
 ↓
Tool Result
 ↓
Model
 ↓
Code Change
 ↓
Test
 ↓
Error?
 ├─ Yes → Diagnose → Fix → Test
 └─ No
 ↓
Review
 ↓
Complete
```

必须支持：

```text
maxSteps
maxTokens
timeout
abort
retry
approval
checkpoint
error recovery
```

禁止无限 Agent Loop。

---

# 31. AI Layer

`packages/ai`

平台必须 Provider Independent。

优先使用统一 AI SDK 作为 Model Adapter 层。

禁止业务代码直接依赖：

```text
OpenAI SDK
Anthropic SDK
Google SDK
```

应：

```text
Agent Runtime
 ↓
Model Registry
 ↓
Provider Adapter
 ↓
Provider
```

---

# 32. Provider

支持：

```text
OpenAI
Anthropic
Google
DeepSeek
xAI
Azure OpenAI
OpenAI Compatible
Ollama
Local Provider
```

模型 ID 不写死。

配置：

```text
provider
providerModelId
displayName
capabilities
contextWindow
settings
```

---

# 33. Tool System

`packages/tool-sdk`

Tool 是 Agent 可以执行的原子能力。

统一定义：

```ts
interface Tool<TInput, TOutput> {
  name: string;
  description: string;

  execute(input: TInput, context: ToolContext): Promise<TOutput>;
}
```

所有 Tool 必须有 Input Schema。

AI Tool Schema 优先使用：

```text
Zod
```

---

# 34. Built-in Tools

MVP 至少实现：

```text
read_file
write_file
edit_file
list_files
search_files
search_code

shell_exec

git_status
git_diff
git_log
git_branch
git_checkout
git_add
git_commit

run_test
run_build
run_typecheck

http_request
```

---

# 35. Skill System

`packages/skill-sdk`

Skill 是高于 Tool 的可复用 Agent 能力。

Skill 可以包含：

```text
Instructions
Tools
Knowledge
Examples
Scripts
References
Constraints
```

示例：

```text
react-development
nestjs-development
flutter-development
tauri-development

bug-fixing
testing
code-review
documentation

database-migration
api-development
ui-development
security-review
```

---

# 36. Skill 目录

建议兼容：

```text
.skill/
├─ SKILL.md
├─ scripts/
├─ references/
└─ assets/
```

平台后期提供：

```text
Skill Registry
Skill Marketplace
Skill Version
Skill Install
Skill Enable
Skill Disable
```

---

# 37. MCP

`packages/mcp`

采用：

```text
Model Context Protocol
MCP TypeScript SDK v2
```

支持：

```text
MCP Client
MCP Server
stdio
Streamable HTTP
OAuth
```

资源类型：

```text
Tool
Resource
Prompt
```

---

# 38. MCP Gateway

ADui Forge 应统一管理 MCP。

```text
Agent
 ↓
MCP Gateway
 ↓
Permission
 ↓
MCP Client
 ↓
MCP Server
```

Agent 不直接任意连接未知 MCP Server。

---

# 39. MCP 来源

支持：

```text
Local MCP
Remote MCP
Workspace MCP
User MCP
Organization MCP
Built-in MCP
```

---

# 40. Workflow

`packages/workflow`

支持 Agent Workflow。

基础节点：

```text
Start
Agent
Tool
Skill
MCP
Condition
Approval
Human Input
Parallel
Join
Sub Workflow
End
```

前端：

```text
React Flow
```

负责图形编辑。

Runtime 不依赖 React Flow 内部格式。

---

# 41. Multi-Agent

支持：

```text
Coordinator Agent
Frontend Agent
Backend Agent
Flutter Agent
Testing Agent
Review Agent
Documentation Agent
```

通信方式：

```text
Delegate
Handoff
Agent as Tool
Sub Run
```

所有子 Agent 必须存在独立：

```text
Run
Step
Trace
Token Usage
```

---

# 42. Context Engine

Context 可以来自：

```text
Prompt
Conversation
Workspace
Files
Code
Git
Documentation
Skill
MCP Resource
Tool Result
Previous Run
Memory
```

不得简单将整个 Repository 发送给模型。

支持：

```text
Search
Selection
Ranking
Compression
Summary
Truncation
Retrieval
```

---

# 43. Workspace Index

MVP 优先：

```text
Filename Search
Full-text Search
Symbol Search
Git Search
```

后期再增加：

```text
Embedding
Vector Search
Semantic Search
AST Index
Dependency Graph
```

不要为了使用 Vector Database 而使用 Vector Database。

---

# 44. Memory

分：

```text
Run Memory
Session Memory
Workspace Memory
User Memory
Organization Memory
```

MVP：

```text
Run
Session
Workspace
```

用户必须能够：

```text
查看
编辑
删除
禁用
```

Memory。

---

# 45. Sandbox

`packages/sandbox`

Agent 执行代码必须进入 Sandbox。

Cloud MVP：

```text
Docker
```

Desktop 默认：

```text
Docker Sandbox
```

后期：

```text
Remote Sandbox
MicroVM
Kubernetes
```

---

# 46. Sandbox 安全

至少限制：

```text
Workspace Boundary
CPU
Memory
Disk
Execution Time
Network
Process
Environment
```

禁止默认挂载：

```text
/
用户 HOME
SSH Private Key
Docker Socket
平台 Secret
系统凭证
```

---

# 47. Trusted Local Mode

允许提供：

```text
Trusted Local Mode
```

但必须：

- 用户主动开启
- 明确风险提示
- 单独 Permission
- 默认关闭
- 记录 Audit Log

不能让 Agent 默认拥有宿主机任意 Shell 权限。

---

# 48. Approval

以下操作默认需要人工 Approval：

```text
git push
force push

大量删除文件

读取 Secret

生产环境操作

数据库 DROP

部署

外部系统写操作

高风险 Shell

Trusted Local Mode
```

流程：

```text
Agent
 ↓
Approval Request
 ↓
User
 ├─ Approve
 └─ Reject
```

---

# 49. Git

支持：

```text
Clone
Status
Diff
Log
Branch
Checkout
Add
Commit
```

后期：

```text
Push
Pull
Merge
Rebase
Pull Request
Code Review
```

危险 Git 操作必须受权限控制。

---

# 50. Run

状态：

```text
queued
preparing
running
waiting_approval
waiting_input
paused
completed
failed
cancelled
timeout
```

Run 至少记录：

```text
Agent
Model
Workspace
Task
Steps
Messages
Tools
Skills
MCP Calls
Tokens
Duration
Artifacts
Errors
```

---

# 51. Step

Step 类型：

```text
reasoning
model
tool
mcp
skill
command
approval
human_input
checkpoint
artifact
```

---

# 52. Event Protocol

统一事件：

```text
run.queued
run.started
run.paused
run.completed
run.failed
run.cancelled

step.started
step.completed
step.failed

model.started
model.delta
model.completed

tool.started
tool.completed
tool.failed

mcp.started
mcp.completed

approval.required
approval.approved
approval.rejected

artifact.created
```

---

# 53. Trace

每个 Agent Run 必须可观测。

```text
Run
├─ Context
├─ Model
├─ Tool
│  └─ Shell
├─ Model
├─ Tool
│  └─ Edit File
├─ Test
├─ Model
└─ Complete
```

前端提供 Timeline。

---

# 54. Checkpoint

Checkpoint 保存：

```text
Git State
Diff
Agent State
Run State
Context Summary
Artifacts
```

支持：

```text
Resume
Retry
Rollback
Fork
```

---

# 55. Artifact

统一：

```ts
interface Artifact {
  id: string;
  type: string;
  name: string;
  mimeType: string;
  location: string;
}
```

类型：

```text
Code
Patch
Diff
Markdown
JSON
Log
Image
Report
Test Result
Build Result
```

---

# 56. Authentication

采用：

```text
Access Token
Refresh Token
```

密码 Hash：

```text
Argon2
```

后期：

```text
GitHub OAuth
Google
OIDC
Enterprise SSO
```

---

# 57. Authorization

采用：

```text
RBAC
+
Resource Permission
```

基础角色：

```text
Owner
Admin
Developer
Viewer
```

Tool / Secret / Deployment 可以具有单独 Permission。

---

# 58. Secrets

包括：

```text
LLM API Key
Git Token
MCP Credential
SSH Credential
External API Key
```

要求：

```text
不得写源码
不得进入 Git
不得进入普通日志
不得直接返回前端
不得自动加入 Prompt
```

Desktop Secret 使用系统安全存储。

Server Secret 生产环境优先使用：

```text
KMS
Secret Manager
Vault
```

---

# 59. Security

重点防止：

```text
Prompt Injection
Tool Injection
Command Injection
Path Traversal
SSRF
XSS
CSRF
SQL Injection
Privilege Escalation
Secret Leakage
MCP Injection
Unsafe Shell
Arbitrary File Access
```

外部 MCP / Web / Repository 内容统一视为：

```text
Untrusted Input
```

---

# 60. Tauri Security

Tauri 使用最小 Capability。

禁止提供：

```text
runAnyCommand(command)
readAnyFile(path)
writeAnyFile(path)
```

应该暴露受限 Capability：

```text
openWorkspace()
startLocalRunner()
getRunnerStatus()
selectDirectory()
showNotification()
```

系统级能力必须最小授权。

---

# 61. Logging

服务端采用结构化日志。

推荐：

```text
Pino
nestjs-pino
```

日志字段：

```text
requestId
userId
workspaceId
agentId
runId
stepId
toolCallId
```

禁止记录：

```text
Password
Token
API Key
Authorization Header
Private Key
```

---

# 62. Observability

预留：

```text
OpenTelemetry
```

监控：

```text
HTTP
Database
Redis
Queue
LLM
Agent
Tool
MCP
Sandbox
Runner
Workflow
```

---

# 63. Testing

JavaScript / TypeScript：

```text
Vitest
```

React：

```text
Vitest
React Testing Library
```

Web E2E：

```text
Playwright
```

Flutter：

```text
flutter_test
integration_test
```

Rust：

```text
cargo test
```

---

# 64. 核心测试范围

必须覆盖：

```text
Agent Loop
Tool Validation
Tool Permission
File Boundary
Sandbox
Approval
Workflow
MCP
Model Adapter
Authentication
Authorization
Git
Runner
Event Protocol
```

---

# 65. Documentation

`apps/docs`

使用：

```text
Rspress
```

至少包含：

```text
Introduction
Getting Started
Architecture

Web
Desktop
Mobile

Agent
Context
Memory

Tool
Skill
MCP

Sandbox
Runner

Workflow
Multi-Agent

API
Events

Deployment
Development
Security
```

---

# 66. Docker

必须提供：

```text
Dockerfile
docker-compose.yml
```

开发基础设施：

```text
PostgreSQL
Redis
MinIO
```

可选：

```text
API
Worker
Web
```

---

# 67. CI

CI 至少执行：

```text
Install
Check
Type Check
Test
Build
```

Flutter：

```text
flutter analyze
flutter test
```

Rust：

```text
cargo check
cargo test
```

---

# 68. Dependency Policy

新增依赖前必须判断：

1. 标准库是否已经支持。
2. Vite+ 是否已经支持。
3. 当前项目是否已有类似依赖。
4. 是否真正需要。
5. 是否稳定维护。
6. 是否存在明显安全问题。
7. 是否支持当前 Runtime。

新增依赖默认：

```text
Latest Stable
```

禁止为了“流行”堆砌框架。

---

# 69. MVP

第一阶段目标：

> 让开发者能够真正交给 Agent 一个开发任务，并形成完整执行闭环。

必须完成：

```text
Authentication

Workspace

Local Workspace
Remote Workspace

Agent CRUD

Provider
Model

Chat

Task

Agent Runtime

Context

File Tool
Shell Tool
Git Tool

Skill

MCP Client

Local Runner

Docker Sandbox

Run
Step
Trace

Streaming

Approval

Checkpoint

Git Diff

Terminal

NestJS API

Worker

BullMQ

PostgreSQL
Redis

Tauri Desktop

React Web

Flutter Mobile

Rspress Docs
```

---

# 70. MVP 核心验收流程

必须能够完成：

```text
用户打开 ADui Forge Desktop
        ↓
选择本地 Repository
        ↓
创建 Workspace
        ↓
选择 Agent
        ↓
输入：

“给用户列表增加搜索功能并补充测试”
        ↓
Agent 读取项目
        ↓
Agent 分析代码
        ↓
Agent 制定计划
        ↓
Agent 搜索相关文件
        ↓
Agent 修改代码
        ↓
Agent 执行 Type Check
        ↓
Agent 执行 Test
        ↓
测试失败
        ↓
Agent 自动分析
        ↓
Agent 修复
        ↓
再次测试
        ↓
通过
        ↓
生成 Git Diff
        ↓
生成执行总结
        ↓
用户确认
```

该流程稳定完成：

> ADui Forge MVP 核心能力即成立。

---

# 71. 第二阶段

增加：

```text
Workflow Editor

Multi-Agent

Agent Marketplace

Skill Marketplace

Tool Marketplace

GitHub Integration

GitLab Integration

Pull Request

Code Review Agent

Workspace Memory

Semantic Search

Remote Runner

Remote Sandbox

Template Marketplace
```

---

# 72. 第三阶段

增加：

```text
Organization

Enterprise SSO

Policy Engine

Enterprise MCP Gateway

Kubernetes Sandbox

MicroVM Sandbox

Agent Cluster

CI/CD Agent

Deployment Agent

Private Model

Audit Center

Usage Quota

Billing

Enterprise Management
```

---

# 73. 非目标

MVP 不开发：

```text
自研 LLM
自研 Git
自研数据库
自研容器
自研消息队列
自研终端
完整 VS Code
浏览器版 JetBrains
完整移动 IDE
```

优先组合成熟基础设施。

---

# 74. 最终产品目标

ADui Forge 最终需要形成：

```text
Prompt
  ↓
Agent
  ↓
Context
  ↓
Plan
  ↓
Skill
  ↓
Tool / MCP
  ↓
Sandbox
  ↓
Code
  ↓
Test
  ↓
Review
  ↓
Approval
  ↓
Git
  ↓
Artifact
```

开发者从：

> “自己一步一步操作工具”

逐渐转变为：

> “描述目标、制定边界、监督 Agent、审核结果”。

这就是 ADui Forge 所定义的：

# Agent-Driven Development
