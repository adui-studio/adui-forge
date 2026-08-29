# ADui Forge — AGENTS.md

> 本文件用于指导 Codex、Claude Code、OpenCode、JetBrains AI Agent 及其他 Coding Agent 在 ADui Forge 仓库中进行开发。

---

# 1. 首要原则

所有 Agent 必须遵守：

```text
先理解，再修改
先阅读，再设计
先复现，再修 Bug
先验证，再声称完成
优先最小改动
优先现有架构
优先成熟方案
不猜 API
不隐藏错误
不破坏现有代码
不泄露 Secret
不绕过权限
不擅自扩大 Scope
```

ADui Forge 本身就是 Agent Development Platform。

因此本项目必须成为：

> Agent Engineering 的参考实现，而不是由 Agent 制造出来的不可维护代码库。

---

# 2. 开发前必须阅读

修改代码之前阅读：

```text
AGENTS.md
docs/REQUIREMENTS.md
README.md
```

然后读取：

```text
目标模块 README
目标模块 package.json / pubspec.yaml / Cargo.toml
相关测试
相关类型
相关配置
```

禁止看到需求后立即开始写代码。

---

# 3. 每次任务执行顺序

Agent 必须遵循：

## Step 1 — 理解需求

确认：

```text
目标
输入
输出
边界
影响范围
验收标准
```

---

## Step 2 — 阅读现有实现

使用：

```text
文件搜索
代码搜索
Symbol Search
Git
相关测试
```

理解已有设计。

---

## Step 3 — 制定最小方案

优先：

```text
最少修改文件
最少新增依赖
最少改变公共接口
保持现有结构
保持现有风格
```

---

## Step 4 — 实现

只修改任务需要的代码。

---

## Step 5 — 验证

至少执行相关：

```text
Check
Type Check
Test
Build
```

---

## Step 6 — 检查 Diff

必须检查：

```bash
git diff
```

确认没有：

```text
无关改动
错误格式化
调试代码
Secret
临时文件
意外删除
```

---

## Step 7 — 输出结果

说明：

```text
修改内容
修改原因
影响文件
测试结果
验证方式
仍存在的限制
```

---

# 4. 项目技术栈

## Toolchain

```text
Vite+
pnpm
TypeScript
ESM
```

## Web

```text
React
React Router
TanStack Query
Zustand

Tailwind CSS
shadcn/ui
Base UI

React Hook Form
Zod

Monaco Editor
xterm.js
React Flow
```

## Desktop

```text
Tauri 2
React
Rust
```

## Mobile

```text
Flutter
Dart

Riverpod
go_router
Dio
Freezed
json_serializable
```

## Backend

```text
NestJS
Fastify
Prisma
PostgreSQL
Redis
BullMQ
```

## AI

```text
AI SDK
MCP TypeScript SDK v2
```

## Documentation

```text
Rspress
```

## Test

```text
Vitest
Playwright
Flutter Test
Cargo Test
```

---

# 5. Monorepo

顶级目录：

```text
apps/
packages/
crates/
infra/
scripts/
docs/
skills/
evals/
```

禁止随意新增新的顶级目录。

---

# 6. Applications

```text
apps/web
```

React Web Application。

```text
apps/desktop
```

Tauri Desktop Shell。

```text
apps/mobile
```

Flutter APP。

```text
apps/api
```

NestJS API。

```text
apps/worker
```

Cloud Worker。

```text
apps/runner
```

Desktop Local Runner。

```text
apps/docs
```

Rspress Documentation。

---

# 7. Packages

核心：

```text
packages/agent-runtime
packages/ai
packages/mcp
packages/tool-sdk
packages/skill-sdk
packages/sandbox
packages/workflow
```

协议：

```text
packages/contracts
packages/protocol
packages/client-sdk
```

共享：

```text
packages/ui
packages/shared
packages/config
```

---

# 8. Dependency Direction

原则：

```text
apps
 ↓
packages
```

禁止：

```text
packages → apps
```

Domain Package 不得依赖 UI。

例如：

```text
agent-runtime
```

禁止依赖：

```text
React
Tauri
Flutter
Nest Controller
```

---

# 9. Vite+

Vite+ 是默认 JS / TS Toolchain。

优先：

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

不要未经必要性验证增加：

```text
ESLint
Prettier
Turbo
Nx
Lerna
```

格式化：

```text
Oxfmt
```

Lint：

```text
Oxlint
```

测试：

```text
Vitest
```

---

# 10. Package Manager

JavaScript / TypeScript：

```text
pnpm
```

不要使用：

```text
npm install
yarn
bun install
```

Flutter 使用：

```text
flutter pub
```

Rust 使用：

```text
cargo
```

---

# 11. Dependency Version

新增 Dependency 使用：

```text
Latest Stable
```

禁止默认：

```text
alpha
beta
rc
canary
nightly
```

新增依赖前必须检查：

1. 是否已经有同功能依赖。
2. 标准库是否能解决。
3. Vite+ 是否已有能力。
4. 是否持续维护。
5. 是否真的值得增加。

---

# 12. TypeScript

统一：

```text
TypeScript 6.x
```

严格模式必须开启。

禁止大量：

```text
any
@ts-ignore
@ts-nocheck
```

优先：

```text
unknown
Generic
Interface
Schema inference
Type Guard
```

---

# 13. React

只使用：

```text
Function Component
Hooks
```

Local State：

```text
useState
useReducer
```

Server State：

```text
TanStack Query
```

Global Client State：

```text
Zustand
```

不要：

```text
把所有状态放 Zustand
```

特别禁止把 TanStack Query Server State 再复制到 Zustand。

---

# 14. React 目录

业务代码优先：

```text
features/
```

例如：

```text
features/
├─ agents/
├─ workspace/
├─ runs/
├─ workflow/
├─ mcp/
└─ skills/
```

公共基础组件：

```text
components/
```

不要将全部业务组件堆入：

```text
components/
```

---

# 15. UI

优先：

```text
shadcn/ui
Base UI
Tailwind CSS
Lucide
```

不要重复实现已有基础组件。

例如已经有：

```text
Dialog
Button
Select
Tabs
Tooltip
Dropdown
```

则优先复用。

---

# 16. Form

Web：

```text
React Hook Form
+
Zod
```

外部输入必须校验。

前端 Validation 不能代替后端 Validation。

---

# 17. Web 与 Desktop

Desktop 必须最大程度复用 Web React UI。

禁止：

```text
apps/web 写一套
apps/desktop 再写一套 React
```

应使用统一 UI / Feature。

Desktop 只是增加：

```text
Native Capability
Local Runner
Local Workspace
```

---

# 18. Platform Adapter

禁止业务代码大量：

```ts
if (window.__TAURI_INTERNALS__) {
}
```

应该通过：

```text
PlatformAdapter
```

统一。

例如：

```ts
interface PlatformAdapter {
  openDirectory(): Promise<string | null>;
  openExternal(url: string): Promise<void>;
  getPlatformInfo(): Promise<PlatformInfo>;
}
```

---

# 19. Tauri

Tauri Rust 层只负责：

```text
Native Bridge
Window
Menu
Tray
Notification
Deep Link
Secure Storage
Process Lifecycle
Runner Lifecycle
```

禁止把 Agent Domain 写进 Rust。

---

# 20. Tauri Security

不要实现：

```text
runAnyShell(command)
readAnyFile(path)
writeAnyFile(path)
```

这类万能 API。

Native Capability 必须：

```text
明确
最小
可审计
有限范围
```

所有 Tauri Capability 遵循 Least Privilege。

---

# 21. Flutter

APP 用于：

```text
查看
控制
审批
通知
Agent Chat
Run
Task
Diff
```

不要试图把 Desktop IDE 完整移植到手机。

---

# 22. Flutter Architecture

状态管理：

```text
Riverpod
```

路由：

```text
go_router
```

HTTP：

```text
Dio
```

数据模型：

```text
Freezed
json_serializable
```

敏感数据：

```text
flutter_secure_storage
```

---

# 23. Flutter Code Generation

生成代码：

```text
*.freezed.dart
*.g.dart
```

不要手工修改。

修改源文件后重新生成。

---

# 24. API Contract

NestJS OpenAPI 是跨客户端 Contract 的主要来源。

生成：

```text
TypeScript Client
Dart Client
```

不要同时手动维护：

```text
Web DTO
Mobile DTO
Server DTO
```

三套互不关联定义。

---

# 25. NestJS

Controller 只负责：

```text
Routing
Input
Authentication
Authorization
Validation
Response
```

禁止把复杂业务写 Controller。

推荐：

```text
Controller
 ↓
Application Service
 ↓
Domain Service
 ↓
Repository
 ↓
Prisma
```

---

# 26. Nest Module

按照 Domain 分：

```text
AuthModule
UserModule
WorkspaceModule
AgentModule
TaskModule
RunModule
ModelModule
ToolModule
SkillModule
McpModule
WorkflowModule
SandboxModule
ApprovalModule
```

禁止整个 Backend 使用：

```text
controllers/
services/
repositories/
```

这种全局横向组织。

---

# 27. Database

使用：

```text
PostgreSQL
Prisma
```

修改 Schema 必须建立 Migration。

禁止生产环境直接：

```text
db push
```

禁止 Controller 直接访问 Prisma。

---

# 28. Transaction

如果一个操作修改多个业务状态：

必须检查是否需要 Transaction。

例如：

```text
创建 Run
创建 Job
更新 Task
创建 Audit
```

不能留下部分成功状态。

---

# 29. Redis

Redis 用于：

```text
Queue
Cache
Lock
Rate Limit
Transient State
```

业务永久数据必须存 PostgreSQL。

---

# 30. Worker

耗时操作进入：

```text
apps/worker
```

例如：

```text
Agent
Workflow
Build
Test
Clone
Index
Sandbox
```

禁止 API Request 阻塞等待长 Agent Run 完成。

---

# 31. Local Runner

本地执行进入：

```text
apps/runner
```

负责：

```text
Workspace
Process
Git
Shell
Sandbox
Local MCP
Agent Runtime
```

Tauri 只是负责启动和管理 Runner。

---

# 32. Agent Runtime

位置：

```text
packages/agent-runtime
```

这是 Domain Core。

必须保持：

```text
Provider Independent
UI Independent
Transport Independent
Testable
Composable
```

---

# 33. Agent Runtime 禁止

禁止：

```text
直接 import OpenAI
直接 import Anthropic
直接操作 React
直接读取 Tauri State
直接访问 Flutter
直接依赖 Nest Controller
```

通过抽象接口完成。

---

# 34. Model Provider

架构：

```text
Agent Runtime
 ↓
Model Registry
 ↓
Model Provider Adapter
 ↓
Provider
```

禁止业务代码：

```ts
const openai = new OpenAI();
```

散落整个 Repository。

---

# 35. Model ID

禁止业务层硬编码：

```ts
"gpt-xxx";
"claude-xxx";
"gemini-xxx";
```

使用：

```text
modelId
```

配置决定真实 Provider Model。

---

# 36. Agent Loop

必须包含：

```text
maxSteps
timeout
abortSignal
tokenLimit
toolPermission
approval
retry
error handling
```

禁止：

```ts
while (true) {}
```

无退出机制。

---

# 37. Tool

每个 Tool 至少：

```text
name
description
inputSchema
permission
execute
```

Tool 输入必须校验。

AI Tool Schema 优先使用：

```text
Zod
```

---

# 38. Tool Safety

任何 User / Agent 输入进入：

```text
Shell
SQL
HTTP
File
Git
```

之前必须检查安全风险。

重点：

```text
Command Injection
Path Traversal
SSRF
Secret Leakage
Privilege Escalation
```

---

# 39. Shell

Shell 必须支持：

```text
cwd
timeout
abort
exitCode
stdout
stderr
output limit
```

Agent Shell 默认必须进入：

```text
Sandbox
```

---

# 40. File Tool

File Tool 必须限定：

```text
Workspace Root
```

必须处理：

```text
normalize
realpath
boundary check
symlink
```

防止：

```text
../../../
```

逃逸。

---

# 41. Sandbox

默认：

```text
Sandbox First
```

Agent 不直接执行宿主机命令。

禁止默认：

```text
挂载 /
挂载 HOME
挂载 SSH
挂载 Docker Socket
```

---

# 42. Trusted Local Mode

只有用户明确开启时才能允许。

必须：

```text
显式授权
风险提示
Audit
可关闭
```

Agent 不允许自己开启。

---

# 43. MCP

使用：

```text
MCP TypeScript SDK v2
```

Agent Runtime 中：

```text
Built-in Tool
MCP Tool
Custom Tool
```

应尽可能使用统一 Tool Interface。

---

# 44. MCP Security

所有 MCP 内容视为：

```text
Untrusted External Input
```

必须防止：

```text
Prompt Injection
Tool Injection
Privilege Escalation
Secret Extraction
```

MCP 不自动获得系统高级权限。

---

# 45. Skill

Skill 是：

```text
Instructions
+
Tools
+
Knowledge
+
References
+
Scripts
```

修改 Skill 时不得偷偷扩大：

```text
Tool Permission
Secret Permission
System Permission
```

---

# 46. Workflow

Workflow Domain 不依赖 React Flow。

React Flow 只是：

```text
Editor
Visualization
```

运行时转换为：

```text
WorkflowDefinition
```

---

# 47. Multi-Agent

子 Agent 必须拥有自己的：

```text
Run
Trace
Step
Token
Status
```

不能把多个 Agent 的执行全部混进一个日志流。

---

# 48. Context

禁止简单：

```text
把整个项目全部塞给 LLM
```

Context 必须根据需求选择。

优先：

```text
Search
Relevant Files
Symbol
Git Diff
Skill
Previous Result
Summary
```

---

# 49. Memory

Memory 必须：

```text
可查看
可修改
可删除
可关闭
```

不要偷偷保存敏感信息。

---

# 50. Approval

以下默认需要 Approval：

```text
git push
force push
deployment
drop database
大量删除
读取 Secret
高风险 Shell
生产环境写操作
```

Agent 不得绕过。

---

# 51. Git

任务开始：

```bash
git status
```

任务完成：

```bash
git diff
```

禁止未经明确要求：

```bash
git reset --hard
git clean -fd
git push --force
git rebase
```

---

# 52. Existing User Changes

如果发现用户已有未提交修改：

禁止：

```text
覆盖
回滚
删除
顺手重构
全项目重新格式化
```

只修改完成当前任务必须修改的内容。

---

# 53. Minimal Change

例如：

用户要求：

```text
修复 Agent Chat 自动滚动
```

禁止顺便：

```text
换状态管理
改路由
重写页面
升级所有 Dependency
重构整个 Chat 模块
```

---

# 54. Security

任何代码修改主动检查：

```text
Authentication
Authorization
Input Validation
SQL Injection
Command Injection
Path Traversal
XSS
CSRF
SSRF
Secret
Race Condition
Resource Leak
```

---

# 55. Secrets

禁止提交：

```text
API_KEY
TOKEN
PASSWORD
PRIVATE_KEY
SECRET
```

可以提交：

```text
.env.example
```

不能提交真实：

```text
.env
```

---

# 56. Logging

禁止：

```ts
console.log(apiKey);
console.log(token);
console.log(password);
```

结构化日志中同样禁止 Secret。

---

# 57. Error Handling

禁止：

```ts
catch {}
```

禁止吞掉异常。

如果错误确实应该忽略，需要：

```text
说明原因
记录必要上下文
```

---

# 58. API Error

不要把：

```text
Stack Trace
SQL Error
内部路径
Secret
```

直接返回客户端。

统一 Error Contract。

---

# 59. Async

所有 Promise 必须正确处理。

禁止：

```text
Unhandled Promise Rejection
```

涉及：

```text
Stream
Process
Socket
Temporary File
Sandbox
```

必须考虑 Cleanup。

---

# 60. Streaming

真正 Streaming。

禁止：

> 等模型全部生成完成，然后逐字模拟 Streaming。

Agent Event 必须实时发送。

---

# 61. Event Naming

统一：

```text
domain.action
```

例如：

```text
run.started
run.completed

tool.started
tool.completed

approval.required
```

不要出现：

```text
RUN_STARTED
runStart
startRun
```

多套风格。

---

# 62. Test

核心 Domain 必须测试。

重点：

```text
Agent Runtime
Tool
Permission
Sandbox
File Boundary
MCP
Workflow
Approval
Authentication
Authorization
Runner
```

---

# 63. Bug Fix

修 Bug 流程：

```text
Reproduce
 ↓
Identify Root Cause
 ↓
Write / Update Regression Test
 ↓
Fix
 ↓
Run Test
 ↓
Verify
```

禁止只针对表现打 Patch。

---

# 64. JavaScript Validation

至少：

```bash
vp check
vp test
```

影响 Build：

```bash
vp build
```

---

# 65. Flutter Validation

涉及 Flutter：

```bash
flutter analyze
flutter test
```

影响构建时执行相应 Build。

---

# 66. Rust Validation

涉及 Rust：

```bash
cargo check
cargo test
```

---

# 67. Documentation

新增公共能力必须判断是否需要修改：

```text
apps/docs
README.md
Package README
```

以下必须更新文档：

```text
API
Agent
Tool
Skill
MCP
Workflow
Config
Architecture
Deployment
Security
```

---

# 68. Comments

Comments 解释：

```text
Why
```

不要重复：

```text
What
```

不写：

```ts
// 获取用户
const user = getUser();
```

---

# 69. Naming

TypeScript：

```text
camelCase
PascalCase
UPPER_SNAKE_CASE
```

URL：

```text
kebab-case
```

事件：

```text
domain.action
```

Database：

按现有 Prisma / Database Convention。

不要在同一个模块混合不同命名体系。

---

# 70. Public API

公共 API 必须明确：

```text
Input
Output
Errors
Side Effects
Permission
```

不要设计：

```ts
function execute(data: any): any;
```

---

# 71. Architecture Changes

以下属于重大变更：

```text
更换数据库
更换 ORM
更换 Queue
更换 AI SDK
更换 MCP SDK
更换 Sandbox
更换 State Management
更换 UI Framework
改变 Monorepo
新增基础设施
```

不得因为普通 Feature 顺手执行。

重大架构变化先建立：

```text
ADR
Architecture Decision Record
```

---

# 72. Dependency Changes

业务 Feature 不应顺便：

```text
升级全部依赖
升级 TypeScript Major
升级 React Major
升级 Flutter Major
升级 Tauri Major
```

依赖升级单独 Task。

---

# 73. Generated Files

禁止手工修改 Generated File。

包括但不限于：

```text
OpenAPI generated client
Freezed
json_serializable
Prisma Client
Generated Types
```

修改 Source 后重新 Generate。

---

# 74. Formatter

不要为了一个文件的任务格式化整个 Repository。

只格式化：

```text
修改文件
相关文件
```

避免制造巨大 Diff。

---

# 75. Performance

发现性能问题时优先测量。

不要无依据：

```text
useMemo everywhere
useCallback everywhere
Cache everywhere
Worker everywhere
```

根据实际瓶颈优化。

---

# 76. Agent 输出

完成任务后输出：

## 修改内容

说明改了什么。

## 原因

说明为什么这样实现。

## 影响范围

说明涉及哪些模块。

## 验证

列出真实执行的命令及结果。

## 未解决问题

如果存在明确列出。

禁止伪造：

```text
测试通过
构建成功
运行正常
```

除非真实执行过。

---

# 77. 优先级

规则冲突时：

```text
用户当前明确要求
        ↓
安全要求
        ↓
REQUIREMENTS.md
        ↓
AGENTS.md
        ↓
模块 README
        ↓
现有架构
        ↓
现有代码风格
        ↓
Agent 自己的偏好
```

---

# 78. 最终原则

每个 Agent 都应该遵循：

```text
Understand
   ↓
Inspect
   ↓
Plan
   ↓
Implement
   ↓
Test
   ↓
Review Diff
   ↓
Explain
```

不要：

```text
Prompt
 ↓
立即写代码
 ↓
声称完成
```

ADui Forge 的目标不是让 Agent：

> 写更多代码。

而是让 Agent：

> 更可靠地完成软件工程任务。
