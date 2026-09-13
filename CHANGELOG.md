# Changelog

> 版本与里程碑提交对齐：v0.2.0 → 063fb01，v0.3.0 → 6ec475b，v0.4.0 → 43b5043，v0.5.0 → efc6faf，v0.6.0 → 里程碑提交（见下）。

## 0.6.0 — 2026-09-13

### Workspace IDE（ADR-004/005，docs/decisions）

- **文件 API**：`/workspace/{tree,file}` tree/read/write/delete，复用 tool-sdk 三层边界
  （路径遍历 / symlink 逃逸 / 1 MiB 写上限 / 二进制拒绝）
- **工作区页**：文件树 + Monaco 编辑器（本地打包不走 CDN）+ 多 Tab + 新建/删除文件 +
  脏标记保存
- **Git 面板**：status / diff / commit（execFile 无 shell 拼接）+ Monaco DiffEditor
  对比 HEAD 与当前内容

### 本地运行闭环（Local Runner）

- **Runner 应用（apps/runner）**：Fastify 同形 REST（workspace + runs + SSE + cancel +
  retry），token Bearer/查询参数握手，仅监听 127.0.0.1
- **本地 Agent**：FORGE_MODEL_* 模型 + Workspace 文件工具（无进程执行工具，Sandbox First）
- **桌面分发**：Tauri spawn/stop/status 命令 + PlatformAdapter 路由——工作区与 Runs
  请求在桌面端自动指向本地 Runner，云端 API 与本地对页面透明

### 平台能力

- **Skill 系统**：packages/skill-sdk（schema / resolveSkills / composeSystemPrompt）、
  Skill 管理 API 与页面、Agent 指令注入与即时重建、SKILL.md 导入/导出双向闭环
- **Model Registry**：FORGE_MODELS 命名模型目录，自定义 Agent 可指定模型
- **Workflow 图定义**：可序列化条件分支（graph 校验/编译/执行），编辑器自由连线 +
  条件节点 + 画布坐标持久化
- **会话持久化**：conversations 存储 + REST + Chat 历史会话/重命名/删除/失败重试
- **对比分析**：多 Agent 并排流式对比 + 批次持久化 + 跨批次胜负统计

### 工程与体验

- **i18n**：i18next 双语言（zh-CN/en）全页面迁移、antd locale 跟随、语言切换持久化、
  键覆盖守卫测试
- **交互惯例修复**：侧栏导航、URL 深链接（Runs/Tasks 筛选）、破坏性操作确认、
  路由级 code-splitting
- **任务台账页**（Tasks）：新建派生 Run、实时状态回填

---

## 0.5.0 — 2026-09-05

### 发布工程

- Release 流水线：tag 触发 Desktop 安装包（Windows NSIS/MSI）与 Mobile APK 上传 GitHub Release
- 全端版本号统一 0.5.0（web / desktop / tauri / mobile）

---

## 0.4.0 — 2026-09-05

### 平台能力

- Agents 页：Agent 清单与工具集（`GET /api/v1/agents`）
- 侧边栏登录态区块（有令牌显示退出，否则登录入口）

### 品牌与体验

- Mobile 品牌化主题：Material 3 深色（电光绿 × 深紫，与 Web 一致）；Android 应用名改为 ADui Forge

---

## 0.3.0 — 2026-09-05

### 平台能力

- **Run 取消**：`POST /runs/:id/cancel`（AbortController 中止，收敛为 cancelled）
- Run 详情增强：执行产物展示（Artifacts）、内联审批（等待时直接批准/拒绝）、
  取消与重试按钮

---

## 0.2.0 — 2026-09-05

### 品牌与体验

- 页面结构参照 Dify / n8n / LangSmith 重构：侧边栏导航 + 控制台落地页
  （指标卡 / 快速发起 / 最近 Runs）
- 沉浸式品牌主题：电光绿 × 深紫（取自 logo 渐变），极光背景 + 玻璃拟态 + 辉光交互
- 设置页：API 健康（含数据库状态）、登录态管理
- 侧边栏实时状态：API 健康呼吸灯 + 审批待办角标（轮询）

### 品牌

- logo 全端接入：Web favicon/页头/登录页、文档站页头、Desktop 启动图标（BMP ICO）、
  Mobile 全套启动图标（flutter_launcher_icons）；scripts/generate-icons.cjs 一键再生成

---

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
