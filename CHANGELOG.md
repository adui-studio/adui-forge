# Changelog

## 0.5.0 — 2026-09-05

### 平台能力

- **Run 取消**：`POST /runs/:id/cancel`（AbortController 中止，收敛为 cancelled）
- Run 详情增强：执行产物展示（Artifacts）、内联审批（等待时直接批准/拒绝）、
  取消与重试按钮
- Agents 页：Agent 清单与工具集（`GET /api/v1/agents`）
- 设置页：API 健康（含数据库状态）、登录态管理
- 侧边栏实时状态：API 健康呼吸灯 + 审批待办角标（轮询）

### 品牌与体验

- 页面结构参照 Dify / n8n / LangSmith 重构：侧边栏导航 + 控制台落地页
- 沉浸式品牌主题：电光绿 × 深紫（取自 logo 渐变），极光背景 + 玻璃拟态 + 辉光交互
- 品牌 logo 全端接入：Web favicon/页头/登录页、文档站、Desktop 启动图标、
  Mobile 全套启动图标（Android/iOS）
- Mobile 品牌化主题（Material 3 深色）与应用名

### 发布工程

- Release 流水线：tag 触发 Desktop 安装包（Windows）与 Mobile APK 上传 GitHub Release

---

## 0.1.0 — 2026-08-30

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
