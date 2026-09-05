# Changelog

## 0.1.0 — 2026-08-30

首个可用里程碑（MVP-1 至 MVP-45）。

### 领域核心

- `packages/contracts`：Run / Step / 事件（`domain.action`）/ 模型与工具协议
- `packages/agent-runtime`：有界 Agent Loop（maxSteps / timeout / abort /
  tokenLimit），Tool 输入 Zod 校验，Approval 挂起
- `packages/agent`：Agent 定义组装、注册表、`agentToTool` Multi-Agent 委派
- `packages/tool-sdk`：defineTool / ToolRegistry / 文件与 Git 工具 /
  Workspace 边界防御 / Sandbox 抽象（Host + Docker）/ shell_exec
- `packages/ai`：AI SDK streamText 桥接（token 级流式）+ ModelRegistry
- `packages/workflow`：agent / tool / condition 节点引擎
- `packages/mcp`：MCP Server 工具桥接（ajv 校验）

### 平台

- `apps/api`：Auth（Argon2id + JWT）、Agents、Runs（SSE/Artifacts/Retry）、
  Approvals、Tasks、Workflows、Memory、Metrics、OpenAPI、Rate limit
- `apps/web`：任务发起、Runs 列表与详情（实时事件流/过滤）、审批页、
  Workflows 页、登录页
- `apps/docs`：Rspress 文档站（GitHub Pages 部署）
- `infra`：PostgreSQL / Redis / MinIO 开发设施、api/web 镜像

- `apps/desktop`：Tauri 2 桌面壳（复用 Web UI，PlatformAdapter 双实现，cargo build 产物验证）
- `apps/mobile`：Flutter App（Runs / 详情 / 审批 / 设置 / 登录五屏，Riverpod + go_router + Dio + 安全存储，widget 测试）

### 工程

- Vite+ / pnpm catalog 统一工具链；CI（GitHub Actions）全量验收
- 冒烟脚本 `pnpm run smoke`
